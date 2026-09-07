const ExcelJS = require('exceljs');
const PDFDocument = require('pdfkit');
const { promisePool } = require('../config/database');

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TRANSACTION_TYPES = new Map([['MAINTENANCE', 'MAINTENANCE'], ['INCOME', 'MAINTENANCE'], ['EXPENSE', 'EXPENSE']]);
const PAYMENT_MODES = new Map(['Cash', 'UPI', 'Bank Transfer', 'Cheque'].map((value) => [value.toLowerCase(), value]));
const STATUSES = new Map([
  'Pending', 'Under Review', 'Pending Verification', 'Needs Clarification',
  'Approved', 'Paid', 'Rejected', 'Cancelled'
].map((value) => [value.toLowerCase(), value]));
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
  const rawType = String(query.transactionType || '').trim().toUpperCase();
  const transactionType = rawType ? TRANSACTION_TYPES.get(rawType) : '';
  if (rawType && !transactionType) throw Object.assign(new Error('Transaction type must be Maintenance or Expense'), { status: 400 });
  const rawMode = String(query.paymentMode || '').trim();
  const paymentMode = rawMode ? PAYMENT_MODES.get(rawMode.toLowerCase()) : '';
  if (rawMode && !paymentMode) throw Object.assign(new Error('Payment mode must be Cash, UPI, Bank Transfer, or Cheque'), { status: 400 });
  const rawStatus = String(query.status || '').trim();
  const status = rawStatus ? STATUSES.get(rawStatus.toLowerCase()) : '';
  if (rawStatus && !status) throw Object.assign(new Error('Unsupported transaction status'), { status: 400 });
  const resident = String(query.resident || query.member || '').trim();
  if (resident && (!/^\d+$/.test(resident) || Number(resident) <= 0)) {
    throw Object.assign(new Error('Resident must be a positive numeric ID'), { status: 400 });
  }
  return {
    from, to,
    wing: String(query.wing || '').trim(),
    flat: String(query.flat || '').trim(),
    resident, transactionType, paymentMode, status
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
    'p.society_id = ?',
    "(COALESCE(p.paid_at,p.approved_at,p.created_at) AT TIME ZONE ?)::date BETWEEN ?::date AND ?::date"
  ];
  const paymentParams = [societyId, timezone, filters.from, filters.to];
  if (filters.wing) { paymentWhere.push("COALESCE(f.wing,f.wing_block,'') = ?"); paymentParams.push(filters.wing); }
  if (filters.flat) { paymentWhere.push('f.flat_no = ?'); paymentParams.push(filters.flat); }
  if (filters.resident) { paymentWhere.push('p.resident_id = ?'); paymentParams.push(Number(filters.resident)); }
  if (filters.paymentMode) { paymentWhere.push('LOWER(p.payment_method) = LOWER(?)'); paymentParams.push(filters.paymentMode); }
  if (filters.status) { paymentWhere.push('LOWER(p.payment_status) = LOWER(?)'); paymentParams.push(filters.status); }

  const expenseWhere = ['e.society_id = ?', "e.expense_date BETWEEN ?::date AND ?::date"];
  const expenseParams = [societyId, filters.from, filters.to];
  if (filters.paymentMode) { expenseWhere.push('LOWER(e.payment_method) = LOWER(?)'); expenseParams.push(filters.paymentMode); }
  if (filters.status) { expenseWhere.push('LOWER(e.status) = LOWER(?)'); expenseParams.push(filters.status); }
  if (filters.wing || filters.flat || filters.resident) expenseWhere.push('1 = 0');

  const includeIncome = !filters.transactionType || ['INCOME', 'MAINTENANCE'].includes(filters.transactionType);
  const includeExpense = !filters.transactionType || filters.transactionType === 'EXPENSE';
  const [payments] = includeIncome ? await promisePool.query(
    `SELECT p.id,
            COALESCE(p.paid_at, p.approved_at, p.created_at) AS transaction_date,
            TO_CHAR((COALESCE(p.paid_at, p.approved_at, p.created_at) AT TIME ZONE ?)::date, 'YYYY-MM-DD') AS transaction_day,
            'MAINTENANCE' AS transaction_type,
            u.name AS member_name,
            COALESCE(f.wing, f.wing_block, '') AS wing,
            f.flat_no,
            p.payment_method,
            p.transaction_id AS reference_number,
            p.amount,
            p.payment_status AS status,
            COALESCE(p.remarks, p.resident_note, m.notes, '') AS remarks,
            COALESCE(p.receipt_number, CONCAT('REC-', p.id)) AS receipt_number,
            p.bill_id,
            CONCAT('BILL-', p.bill_id) AS bill_number,
            COALESCE(m.total_payable, m.total_amount, m.amount, 0) AS bill_amount,
            p.amount AS amount_paid,
            COALESCE(m.remaining_amount, m.remaining_due, GREATEST(COALESCE(m.total_payable, m.total_amount, m.amount, 0) - COALESCE(m.paid_amount, 0), 0), 0) AS remaining_balance
       FROM payments p
       JOIN maintenance m ON m.id = p.bill_id AND m.society_id = p.society_id
       JOIN users u ON u.id = p.resident_id AND u.society_id = p.society_id
       JOIN flats f ON f.id = m.flat_id AND f.society_id = p.society_id
      WHERE ${paymentWhere.join(' AND ')}`,
    [timezone, ...paymentParams]
  ) : [[]];
  const [expenses] = includeExpense ? await promisePool.query(
    `SELECT e.id,
            e.expense_date AS transaction_date,
            TO_CHAR(e.expense_date, 'YYYY-MM-DD') AS transaction_day,
            'EXPENSE' AS transaction_type,
            COALESCE(e.vendor, '') AS member_name,
            '' AS wing,
            '' AS flat_no,
            e.payment_method,
            e.expense_number AS reference_number,
            e.amount,
            e.status,
            COALESCE(e.description, e.category, '') AS remarks,
            COALESCE(e.expense_number, CONCAT('EXP-', e.id)) AS receipt_number,
            e.id AS bill_id,
            COALESCE(e.expense_number, CONCAT('EXP-', e.id)) AS bill_number,
            e.amount AS bill_amount,
            e.amount AS amount_paid,
            0 AS remaining_balance
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
        WHERE p.society_id=? AND LOWER(p.payment_status) IN ('approved','paid')
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
        AND (?='' OR COALESCE(f.wing,f.wing_block,'')=?) AND (?='' OR f.flat_no=?)
        AND (?='' OR m.resident_id=?)`,
    [societyId, filters.to, filters.wing, filters.wing, filters.flat, filters.flat,
      filters.resident, filters.resident ? Number(filters.resident) : 0]
  );
  const transactions = [...payments, ...expenses]
    .map((row) => ({
      ...row,
      id: String(row.id),
      amount: number(row.amount),
      bill_amount: number(row.bill_amount),
      amount_paid: number(row.amount_paid != null ? row.amount_paid : row.amount),
      remaining_balance: number(row.remaining_balance)
    }))
    .sort((a, b) => String(b.transaction_day).localeCompare(String(a.transaction_day)) || new Date(b.transaction_date) - new Date(a.transaction_date));
  const openingBalance = number(openingRows[0]?.opening);
  return {
    period: { from: filters.from, to: filters.to, timezone }, filters,
    summary: calculateSummary(openingBalance, transactions, number(pendingRows[0]?.pending)),
    daily: calculateDailyBreakdown(transactions),
    transactions
  };
}

function calculateSummary(openingBalance, transactions, pendingAmount) {
  const settled = (x) => !x.status || ['approved', 'paid'].includes(String(x.status).toLowerCase());
  const maintenanceCollected = transactions.filter((x) => x.transaction_type === 'MAINTENANCE' && settled(x)).reduce((s, x) => s + number(x.amount), 0);
  const otherIncome = transactions.filter((x) => x.transaction_type === 'OTHER_INCOME' && settled(x)).reduce((s, x) => s + number(x.amount), 0);
  const totalExpenses = transactions.filter((x) => x.transaction_type === 'EXPENSE' && String(x.status).toLowerCase() === 'paid').reduce((s, x) => s + number(x.amount), 0);

  const paymentTxns = transactions.filter((x) => x.transaction_type !== 'EXPENSE');
  const totalPaymentsCount = paymentTxns.length;
  const totalBillAmount = paymentTxns.reduce((s, x) => s + number(x.bill_amount != null ? x.bill_amount : x.amount), 0);
  const totalAmountCollected = paymentTxns.reduce((s, x) => s + number(x.amount_paid != null ? x.amount_paid : x.amount), 0);
  const totalRemainingBalance = paymentTxns.reduce((s, x) => s + number(x.remaining_balance), 0);

  return {
    openingBalance: number(openingBalance),
    maintenanceCollected,
    otherIncome,
    totalExpenses,
    pendingAmount: number(pendingAmount),
    closingBalance: number(openingBalance) + maintenanceCollected + otherIncome - totalExpenses,
    totalPaymentsCount,
    totalBillAmount,
    totalAmountCollected,
    totalRemainingBalance
  };
}

function calculateDailyBreakdown(transactions) {
  const days = new Map();
  for (const transaction of transactions) {
    const date = String(transaction.transaction_day || transaction.transaction_date || '').slice(0, 10);
    if (!date) continue;
    const item = days.get(date) || {
      date, transactionCount: 0, totalReceived: 0, totalExpenses: 0,
      netAmount: 0, totalsByPaymentMethod: {}, totalsByPaymentStatus: {},
      totalBillAmount: 0, totalRemainingBalance: 0
    };
    const amount = number(transaction.amount);
    const status = String(transaction.status || 'Unknown');
    const method = String(transaction.payment_method || 'Unknown');
    item.transactionCount += 1;
    item.totalsByPaymentMethod[method] = number(item.totalsByPaymentMethod[method]) + amount;
    item.totalsByPaymentStatus[status] = number(item.totalsByPaymentStatus[status]) + amount;
    item.totalBillAmount += number(transaction.bill_amount);
    item.totalRemainingBalance += number(transaction.remaining_balance);
    if (transaction.transaction_type === 'EXPENSE') {
      if (status.toLowerCase() === 'paid') item.totalExpenses += amount;
    } else if (['approved', 'paid'].includes(status.toLowerCase())) {
      item.totalReceived += amount;
    }
    item.netAmount = item.totalReceived - item.totalExpenses;
    days.set(date, item);
  }
  return [...days.values()].sort((a, b) => b.date.localeCompare(a.date));
}

async function excelBuffer(statement) {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Day-wise Statement');
  sheet.addRow(['Day-wise Collection Statement']);
  sheet.addRow([`Period: ${statement.period.from} to ${statement.period.to} (${statement.period.timezone})`]);
  sheet.addRow([]);
  sheet.addRow(['Summary Totals']);
  sheet.addRow(['Total Number of Payments', statement.summary.totalPaymentsCount != null ? statement.summary.totalPaymentsCount : statement.transactions.length]);
  sheet.addRow(['Total Bill Amount', number(statement.summary.totalBillAmount).toFixed(2)]);
  sheet.addRow(['Total Amount Collected', number(statement.summary.totalAmountCollected != null ? statement.summary.totalAmountCollected : statement.summary.maintenanceCollected).toFixed(2)]);
  sheet.addRow(['Total Remaining Balance', number(statement.summary.totalRemainingBalance).toFixed(2)]);
  sheet.addRow(['Opening Balance', number(statement.summary.openingBalance).toFixed(2)]);
  sheet.addRow(['Total Expenses', number(statement.summary.totalExpenses).toFixed(2)]);
  sheet.addRow(['Closing Balance', number(statement.summary.closingBalance).toFixed(2)]);
  sheet.addRow([]);
  sheet.addRow([
    'Date',
    'Receipt Number',
    'Customer / Party Name',
    'Wing',
    'Flat Number',
    'Bill / Invoice Number',
    'Payment Mode',
    'Bill Amount',
    'Amount Paid',
    'Remaining Balance',
    'Status',
    'Reference / UTR Number',
    'Remarks'
  ]);
  statement.transactions.forEach((x) => sheet.addRow([
    x.transaction_day || (x.transaction_date ? String(x.transaction_date).slice(0, 10) : ''),
    x.receipt_number || `REC-${x.id}`,
    x.member_name,
    x.wing,
    x.flat_no,
    x.bill_number || `BILL-${x.bill_id || x.id}`,
    x.payment_method,
    number(x.bill_amount),
    number(x.amount_paid != null ? x.amount_paid : x.amount),
    number(x.remaining_balance),
    x.status,
    x.reference_number,
    x.remarks
  ]));
  sheet.columns.forEach((column) => { column.width = 20; });
  sheet.getRow(1).font = { bold: true, size: 16 };
  sheet.getRow(12).font = { bold: true };
  sheet.getColumn(8).numFmt = '₹#,##0.00';
  sheet.getColumn(9).numFmt = '₹#,##0.00';
  sheet.getColumn(10).numFmt = '₹#,##0.00';

  const daily = workbook.addWorksheet('Daily Totals');
  daily.addRow(['Date', 'Transaction Count', 'Total Received', 'Total Expenses', 'Net Amount', 'Totals by Payment Method', 'Totals by Status']);
  statement.daily.forEach((day) => daily.addRow([
    day.date,
    day.transactionCount,
    day.totalReceived,
    day.totalExpenses,
    day.netAmount,
    Object.entries(day.totalsByPaymentMethod || {}).map(([key, value]) => `${key}: ${number(value).toFixed(2)}`).join(', '),
    Object.entries(day.totalsByPaymentStatus || {}).map(([key, value]) => `${key}: ${number(value).toFixed(2)}`).join(', ')
  ]));
  daily.columns.forEach((column) => { column.width = 24; });
  daily.getRow(1).font = { bold: true };
  return Buffer.from(await workbook.xlsx.writeBuffer());
}

function pdfBuffer(statement) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 28, layout: 'landscape' });
    const chunks = [];
    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('error', reject);
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    
    doc.fontSize(16).text('Day-wise Collection Statement', { align: 'center' });
    doc.fontSize(9).text(`Period: ${statement.period.from} to ${statement.period.to} (${statement.period.timezone})`, { align: 'center' }).moveDown(0.5);

    const payCount = statement.summary.totalPaymentsCount != null ? statement.summary.totalPaymentsCount : statement.transactions.length;
    const bAmt = number(statement.summary.totalBillAmount).toFixed(2);
    const cAmt = number(statement.summary.totalAmountCollected != null ? statement.summary.totalAmountCollected : statement.summary.maintenanceCollected).toFixed(2);
    const rAmt = number(statement.summary.totalRemainingBalance).toFixed(2);

    doc.fontSize(9).font('Helvetica-Bold').text(
      `Total Payments: ${payCount}   |   Total Bill Amount: INR ${bAmt}   |   Total Amount Collected: INR ${cAmt}   |   Total Remaining Balance: INR ${rAmt}`
    );
    doc.moveDown(0.5);

    doc.fontSize(8).font('Helvetica-Bold');
    doc.text('Date | Receipt No | Customer / Party | Flat | Bill No | Mode | Bill Amt | Amount Paid | Remaining Bal | Status');
    doc.font('Helvetica').fontSize(8);
    doc.moveDown(0.2);

    statement.transactions.forEach((x) => {
      const date = x.transaction_day || (x.transaction_date ? String(x.transaction_date).slice(0, 10) : '-');
      const rec = x.receipt_number || `REC-${x.id}`;
      const name = (x.member_name || '-').slice(0, 18);
      const flat = `${x.wing || ''}-${x.flat_no || ''}`;
      const bill = x.bill_number || `BILL-${x.bill_id || x.id}`;
      const mode = x.payment_method || '-';
      const billVal = number(x.bill_amount).toFixed(2);
      const paidVal = number(x.amount_paid != null ? x.amount_paid : x.amount).toFixed(2);
      const remVal = number(x.remaining_balance).toFixed(2);
      const st = x.status || '-';
      doc.text(`${date} | ${rec} | ${name} | ${flat} | ${bill} | ${mode} | INR ${billVal} | INR ${paidVal} | INR ${remVal} | ${st}`);
    });

    if (!statement.transactions.length) {
      doc.text('No transactions found for the selected filters.');
    }
    doc.end();
  });
}

module.exports = { validateFilters, calculateSummary, calculateDailyBreakdown, getStatement, excelBuffer, pdfBuffer };
