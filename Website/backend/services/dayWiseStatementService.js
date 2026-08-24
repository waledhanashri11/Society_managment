const ExcelJS = require('exceljs');
const PDFDocument = require('pdfkit');
const { promisePool } = require('../config/database');

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const number = (value) => Number(value || 0);
const isoDate = (value) => {
  if (!DATE_RE.test(String(value || ''))) return null;
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isNaN(date.valueOf()) || date.toISOString().slice(0, 10) !== value ? null : value;
};

function validateFilters(query) {
  const from = isoDate(query.from || query.date);
  const to = isoDate(query.to || query.date || query.from);
  if (!from || !to) throw Object.assign(new Error('from and to must be valid YYYY-MM-DD dates'), { status: 400 });
  if (from > to) throw Object.assign(new Error('from must not be after to'), { status: 400 });
  const days = Math.floor((new Date(`${to}T00:00:00Z`) - new Date(`${from}T00:00:00Z`)) / 86400000);
  if (days > 366) throw Object.assign(new Error('Date range cannot exceed 366 days'), { status: 400 });
  return {
    from, to,
    wing: String(query.wing || '').trim(),
    flat: String(query.flat || '').trim(),
    transactionType: String(query.transactionType || '').trim().toUpperCase(),
    paymentMode: String(query.paymentMode || '').trim(),
    status: String(query.status || '').trim()
  };
}

async function getTimezone(societyId) {
  const [rows] = await promisePool.query('SELECT timezone FROM societies WHERE id = ? LIMIT 1', [societyId]);
  if (!rows[0]) throw Object.assign(new Error('Society not found'), { status: 404 });
  return rows[0].timezone || 'Asia/Kolkata';
}

async function getStatement(societyId, rawFilters) {
  const filters = validateFilters(rawFilters);
  const timezone = await getTimezone(societyId);
  const paymentWhere = [
    'p.society_id = ?', "p.payment_status = 'Paid'",
    "(COALESCE(p.paid_at,p.approved_at,p.created_at) AT TIME ZONE ?)::date BETWEEN ?::date AND ?::date"
  ];
  const paymentParams = [societyId, timezone, filters.from, filters.to];
  if (filters.wing) { paymentWhere.push("COALESCE(f.wing,f.wing_block,'') = ?"); paymentParams.push(filters.wing); }
  if (filters.flat) { paymentWhere.push('f.flat_no = ?'); paymentParams.push(filters.flat); }
  if (filters.paymentMode) { paymentWhere.push('LOWER(p.payment_method) = LOWER(?)'); paymentParams.push(filters.paymentMode); }
  if (filters.status) { paymentWhere.push('LOWER(p.payment_status) = LOWER(?)'); paymentParams.push(filters.status); }

  const expenseWhere = ['e.society_id = ?', "e.expense_date BETWEEN ?::date AND ?::date"];
  const expenseParams = [societyId, filters.from, filters.to];
  if (filters.paymentMode) { expenseWhere.push('LOWER(e.payment_method) = LOWER(?)'); expenseParams.push(filters.paymentMode); }
  if (filters.status) { expenseWhere.push('LOWER(e.status) = LOWER(?)'); expenseParams.push(filters.status); }
  if (filters.wing || filters.flat) expenseWhere.push('1 = 0');

  const includeIncome = !filters.transactionType || ['INCOME', 'MAINTENANCE'].includes(filters.transactionType);
  const includeExpense = !filters.transactionType || filters.transactionType === 'EXPENSE';
  const [payments] = includeIncome ? await promisePool.query(
    `SELECT p.id, COALESCE(p.paid_at,p.approved_at,p.created_at) transaction_date,
            'MAINTENANCE' transaction_type, u.name member_name,
            COALESCE(f.wing,f.wing_block,'') wing, f.flat_no, p.payment_method,
            p.transaction_id reference_number, p.amount, p.payment_status status,
            COALESCE(p.remarks,p.resident_note,m.notes,'') remarks
       FROM payments p
       JOIN maintenance m ON m.id=p.bill_id AND m.society_id=p.society_id
       JOIN users u ON u.id=p.resident_id AND u.society_id=p.society_id
       JOIN flats f ON f.id=m.flat_id AND f.society_id=p.society_id
      WHERE ${paymentWhere.join(' AND ')}`,
    paymentParams
  ) : [[]];
  const [expenses] = includeExpense ? await promisePool.query(
    `SELECT e.id, e.expense_date transaction_date, 'EXPENSE' transaction_type,
            COALESCE(e.vendor,'') member_name, '' wing, '' flat_no, e.payment_method,
            e.expense_number reference_number, e.amount, e.status,
            COALESCE(e.description,e.category,'') remarks
       FROM maintenance_expenses e WHERE ${expenseWhere.join(' AND ')}`,
    expenseParams
  ) : [[]];

  const [openingRows] = await promisePool.query(
    `WITH base AS (
       SELECT effective_date, bank_amount + cash_amount amount
         FROM accounting_opening_balances
        WHERE society_id=? AND effective_date<=?::date ORDER BY effective_date DESC LIMIT 1
     ), income AS (
       SELECT COALESCE(SUM(p.amount),0) amount FROM payments p, base
        WHERE p.society_id=? AND p.payment_status='Paid'
          AND (COALESCE(p.paid_at,p.approved_at,p.created_at) AT TIME ZONE ?)::date>=base.effective_date
          AND (COALESCE(p.paid_at,p.approved_at,p.created_at) AT TIME ZONE ?)::date<?::date
     ), expense AS (
       SELECT COALESCE(SUM(e.amount),0) amount FROM maintenance_expenses e, base
        WHERE e.society_id=? AND LOWER(e.status)='paid' AND e.expense_date>=base.effective_date AND e.expense_date<?::date
     ) SELECT COALESCE((SELECT amount FROM base),0)+income.amount-expense.amount opening FROM income,expense`,
    [societyId, filters.from, societyId, timezone, timezone, filters.from, societyId, filters.from]
  );
  const [pendingRows] = await promisePool.query(
    `SELECT COALESCE(SUM(COALESCE(m.remaining_amount,m.remaining_due,m.total_payable,m.total_amount,m.amount,0)),0) pending
       FROM maintenance m JOIN flats f ON f.id=m.flat_id AND f.society_id=m.society_id
      WHERE m.society_id=? AND m.due_date<=?::date AND COALESCE(m.remaining_amount,m.remaining_due,0)>0
        AND (?='' OR COALESCE(f.wing,f.wing_block,'')=?) AND (?='' OR f.flat_no=?)`,
    [societyId, filters.to, filters.wing, filters.wing, filters.flat, filters.flat]
  );
  const transactions = [...payments, ...expenses]
    .map((row) => ({ ...row, id: String(row.id), amount: number(row.amount) }))
    .sort((a, b) => new Date(b.transaction_date) - new Date(a.transaction_date));
  const openingBalance = number(openingRows[0]?.opening);
  return {
    period: { from: filters.from, to: filters.to, timezone }, filters,
    summary: calculateSummary(openingBalance, transactions, number(pendingRows[0]?.pending)),
    transactions
  };
}

function calculateSummary(openingBalance, transactions, pendingAmount) {
  const maintenanceCollected = transactions.filter((x) => x.transaction_type === 'MAINTENANCE').reduce((s, x) => s + number(x.amount), 0);
  const otherIncome = transactions.filter((x) => x.transaction_type === 'OTHER_INCOME').reduce((s, x) => s + number(x.amount), 0);
  const totalExpenses = transactions.filter((x) => x.transaction_type === 'EXPENSE' && String(x.status).toLowerCase() === 'paid').reduce((s, x) => s + number(x.amount), 0);
  return { openingBalance:number(openingBalance), maintenanceCollected, otherIncome, totalExpenses, pendingAmount:number(pendingAmount), closingBalance:number(openingBalance)+maintenanceCollected+otherIncome-totalExpenses };
}

async function excelBuffer(statement) {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Day-wise Statement');
  sheet.addRow(['Day-wise Statement']);
  sheet.addRow([`Period: ${statement.period.from} to ${statement.period.to} (${statement.period.timezone})`]);
  sheet.addRow([]);
  Object.entries(statement.summary).forEach(([key, value]) => sheet.addRow([key, value]));
  sheet.addRow([]);
  sheet.addRow(['Date & Time','Member / Vendor','Wing','Flat','Type','Payment Mode','Reference','Amount','Status','Remarks']);
  statement.transactions.forEach((x) => sheet.addRow([x.transaction_date,x.member_name,x.wing,x.flat_no,x.transaction_type,x.payment_method,x.reference_number,x.amount,x.status,x.remarks]));
  sheet.columns.forEach((column) => { column.width = 20; });
  sheet.getRow(1).font = { bold: true, size: 16 };
  return Buffer.from(await workbook.xlsx.writeBuffer());
}

function pdfBuffer(statement) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 36 });
    const chunks = [];
    doc.on('data', (chunk) => chunks.push(chunk)); doc.on('error', reject); doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.fontSize(18).text('Day-wise Statement');
    doc.fontSize(10).text(`${statement.period.from} to ${statement.period.to} (${statement.period.timezone})`).moveDown();
    Object.entries(statement.summary).forEach(([key, value]) => doc.text(`${key}: INR ${number(value).toFixed(2)}`));
    doc.moveDown().fontSize(9);
    statement.transactions.forEach((x) => doc.text(`${String(x.transaction_date).slice(0,19)} | ${x.transaction_type} | ${x.member_name || '-'} | ${x.wing || '-'}-${x.flat_no || '-'} | ${x.payment_method || '-'} | ${x.reference_number || '-'} | INR ${x.amount.toFixed(2)} | ${x.status || '-'} | ${x.remarks || ''}`));
    if (!statement.transactions.length) doc.text('No transactions found for the selected filters.');
    doc.end();
  });
}

module.exports = { validateFilters, calculateSummary, getStatement, excelBuffer, pdfBuffer };
