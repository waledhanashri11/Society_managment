const crypto = require('crypto');
const ExcelJS = require('exceljs');
const XLSX = require('@keep-lts/xlsx');

const HEADERS = [
  'Transaction ID', 'Society Code', 'Member ID', 'Member Name', 'Wing', 'Flat Number',
  'Bill ID', 'Bill Number', 'Transaction Date', 'Transaction Type', 'Payment Mode',
  'Amount', 'UTR/Cheque Number', 'Payment Status', 'Remarks', 'Import Action',
  'Validation Result', 'Validation Message'
];

const ALLOWED_MODES = new Set(['Cash', 'UPI', 'Bank Transfer', 'Cheque']);
// Paid is a valid persisted status and must round-trip through export/import.
const ALLOWED_STATUSES = new Set(['Pending', 'Approved', 'Paid', 'Rejected']);
const ALLOWED_ACTIONS = new Set(['CREATE', 'UPDATE']);

const isoDate = (value) => {
  const normalized = String(value || '').trim();
  if (!normalized) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(normalized)) return null;
  const parsed = new Date(`${normalized}T00:00:00.000Z`);
  return Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== normalized ? null : normalized;
};

// Keep this validation independent of Express so both the API and tests use the
// same contract. Empty filters intentionally mean "export all transactions".
const normalizeExportFilters = (query = {}) => {
  const textValue = (name) => String(query[name] || '').trim();
  const from = textValue('from');
  const to = textValue('to');
  const member = textValue('member');
  const status = textValue('status');
  const paymentMode = textValue('paymentMode');
  if (from && !isoDate(from)) throw new Error('From date must use YYYY-MM-DD.');
  if (to && !isoDate(to)) throw new Error('To date must use YYYY-MM-DD.');
  if (from && to && from > to) throw new Error('From date cannot be after To date.');
  if (member && (!/^\d+$/.test(member) || Number(member) <= 0)) throw new Error('Member must be a positive number.');
  if (status && !ALLOWED_STATUSES.has(status)) throw new Error('Payment status must be Pending, Approved, Paid, or Rejected.');
  if (paymentMode && !ALLOWED_MODES.has(paymentMode)) throw new Error('Payment mode must be Cash, UPI, Bank Transfer, or Cheque.');
  return { from, to, member, wing: textValue('wing'), flat: textValue('flat'), status, paymentMode };
};

const normalizeHeader = (value) => String(value || '').trim().toLowerCase().replace(/[^a-z0-9]/g, '');
const text = (value) => {
  if (value == null) return '';
  if (typeof value === 'object' && Array.isArray(value.richText)) return value.richText.map((part) => part.text).join('').trim();
  if (typeof value === 'object' && value.text) return String(value.text).trim();
  return String(value).trim();
};
const excelDate = (value) => {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value.toISOString().slice(0, 10);
  const raw = text(value);
  // Text dates are deliberately not coerced: validation must reject ambiguous
  // values such as 01/02/26 instead of silently changing their meaning.
  return raw;
};
const hash = (value) => crypto.createHash('sha256').update(value).digest('hex');

const parseWorkbook = async (buffer, fileName = 'upload.xlsx') => {
  if (!/\.xlsx$/i.test(fileName)) {
    const book = XLSX.read(buffer, { type: 'buffer', cellDates: true });
    const sheet = book.Sheets.Transactions || book.Sheets[book.SheetNames[0]];
    if (!sheet) throw new Error('Workbook must contain transaction rows');
    const matrix = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '', raw: true });
    const headers = (matrix[0] || []).map(normalizeHeader);
    const required = ['Member ID', 'Bill ID', 'Transaction Date', 'Payment Mode', 'Amount', 'Payment Status', 'Import Action'];
    for (const name of required) if (!headers.includes(normalizeHeader(name))) throw new Error(`Missing required column: ${name}`);
    const get = (row, name) => row[headers.indexOf(normalizeHeader(name))];
    return matrix.slice(1).map((row, index) => ({ row, index })).filter(({row}) => row.some((v) => text(v) !== '')).map(({row,index}) => ({
      rowNumber:index+2, transactionId:text(get(row,'Transaction ID')), societyCode:text(get(row,'Society Code')),
      memberId:text(get(row,'Member ID')), memberName:text(get(row,'Member Name')), wing:text(get(row,'Wing')),
      flatNumber:text(get(row,'Flat Number')), billId:text(get(row,'Bill ID')), billNumber:text(get(row,'Bill Number')),
      transactionDate:excelDate(get(row,'Transaction Date')), transactionType:text(get(row,'Transaction Type'))||'Maintenance',
      paymentMode:text(get(row,'Payment Mode')), amount:text(get(row,'Amount')).replace(/[,₹]/g,''),
      referenceNumber:text(get(row,'UTR/Cheque Number')), paymentStatus:text(get(row,'Payment Status')),
      remarks:text(get(row,'Remarks')), importAction:(text(get(row,'Import Action'))||'CREATE').toUpperCase()
    }));
  }
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);
  const sheet = workbook.getWorksheet('Transactions');
  if (!sheet) throw new Error('Workbook must contain a Transactions sheet');
  const headerMap = new Map();
  sheet.getRow(1).eachCell((cell, column) => headerMap.set(normalizeHeader(cell.value), column));
  for (const required of ['Member ID', 'Bill ID', 'Transaction Date', 'Payment Mode', 'Amount', 'Payment Status', 'Import Action']) {
    if (!headerMap.has(normalizeHeader(required))) throw new Error(`Missing required column: ${required}`);
  }
  const get = (row, name) => row.getCell(headerMap.get(normalizeHeader(name)) || 0).value;
  const rows = [];
  sheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;
    const hasData = row.values.slice(1).some((value) => text(value) !== '');
    if (!hasData) return;
    rows.push({
      rowNumber,
      transactionId: text(get(row, 'Transaction ID')),
      societyCode: text(get(row, 'Society Code')),
      memberId: text(get(row, 'Member ID')),
      memberName: text(get(row, 'Member Name')),
      wing: text(get(row, 'Wing')),
      flatNumber: text(get(row, 'Flat Number')),
      billId: text(get(row, 'Bill ID')),
      billNumber: text(get(row, 'Bill Number')),
      transactionDate: excelDate(get(row, 'Transaction Date')),
      transactionType: text(get(row, 'Transaction Type')) || 'Maintenance',
      paymentMode: text(get(row, 'Payment Mode')),
      amount: text(get(row, 'Amount')).replace(/[,₹]/g, ''),
      referenceNumber: text(get(row, 'UTR/Cheque Number')),
      paymentStatus: text(get(row, 'Payment Status')),
      remarks: text(get(row, 'Remarks')),
      importAction: (text(get(row, 'Import Action')) || 'CREATE').toUpperCase()
    });
  });
  return rows;
};

const configureWorkbook = (workbook, societyName) => {
  workbook.creator = 'SocietyHub';
  workbook.company = societyName || 'SocietyHub';
  workbook.created = new Date();
};

const styleTable = (sheet) => {
  sheet.views = [{ state: 'frozen', ySplit: 1 }];
  sheet.autoFilter = { from: 'A1', to: `R${Math.max(sheet.rowCount, 1)}` };
  sheet.getRow(1).height = 30;
  sheet.getRow(1).eachCell((cell) => {
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1D4ED8' } };
    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
  });
  const widths = [16, 15, 12, 24, 10, 14, 12, 16, 16, 18, 18, 14, 22, 18, 30, 14, 18, 36];
  widths.forEach((width, index) => { sheet.getColumn(index + 1).width = width; });
  sheet.getColumn(9).numFmt = 'yyyy-mm-dd';
  sheet.getColumn(12).numFmt = '₹#,##0.00';
};

const addValidations = (sheet, lastRow = 5000) => {
  for (let row = 2; row <= lastRow; row += 1) {
    sheet.getCell(`J${row}`).dataValidation = { type: 'list', allowBlank: false, formulae: ['"Maintenance"'] };
    sheet.getCell(`K${row}`).dataValidation = { type: 'list', allowBlank: false, formulae: ['"Cash,UPI,Bank Transfer,Cheque"'] };
    sheet.getCell(`N${row}`).dataValidation = { type: 'list', allowBlank: false, formulae: ['"Pending,Approved,Paid,Rejected"'] };
    sheet.getCell(`P${row}`).dataValidation = { type: 'list', allowBlank: false, formulae: ['"CREATE,UPDATE"'] };
  }
};

const createWorkbook = async ({ society, transactions = [], members = [], template = false }) => {
  const workbook = new ExcelJS.Workbook();
  configureWorkbook(workbook, society?.name);
  const sheet = workbook.addWorksheet('Transactions');
  sheet.addRow(HEADERS);
  transactions.forEach((item) => sheet.addRow([
    item.transaction_id, society?.code, item.member_id, item.member_name, item.wing,
    item.flat_number, item.bill_id, item.bill_number, item.transaction_date, 'Maintenance',
    item.payment_mode, Number(item.amount), item.reference_number, item.payment_status,
    item.remarks, item.import_action || 'UPDATE', '', ''
  ]));
  styleTable(sheet);
  addValidations(sheet, template ? 1000 : Math.max(sheet.rowCount + 100, 500));

  const memberSheet = workbook.addWorksheet('Members');
  memberSheet.addRow(['Member ID', 'Member Name', 'Wing', 'Flat Number', 'Status']);
  members.forEach((member) => memberSheet.addRow([member.id, member.name, member.wing, member.flat_number, member.status]));
  memberSheet.views = [{ state: 'frozen', ySplit: 1 }];
  memberSheet.columns = [{ width: 12 }, { width: 28 }, { width: 12 }, { width: 16 }, { width: 16 }];
  memberSheet.getRow(1).font = { bold: true };
  memberSheet.protect('', { selectLockedCells: true, selectUnlockedCells: true });

  const summary = workbook.addWorksheet('Summary');
  summary.addRows([
    ['Transaction Summary', 'Value'],
    ['Total transactions', { formula: "COUNTA('Transactions'!A2:A1048576)" }],
    ['Total amount', { formula: "SUM('Transactions'!L2:L1048576)" }],
    ['Approved amount', { formula: "SUMIF('Transactions'!N:N,\"Approved\",'Transactions'!L:L)" }],
    ['Pending amount', { formula: "SUMIF('Transactions'!N:N,\"Pending\",'Transactions'!L:L)" }],
    ['Rejected amount', { formula: "SUMIF('Transactions'!N:N,\"Rejected\",'Transactions'!L:L)" }],
    ['Cash', { formula: "SUMIF('Transactions'!K:K,\"Cash\",'Transactions'!L:L)" }],
    ['UPI', { formula: "SUMIF('Transactions'!K:K,\"UPI\",'Transactions'!L:L)" }],
    ['Bank Transfer', { formula: "SUMIF('Transactions'!K:K,\"Bank Transfer\",'Transactions'!L:L)" }],
    ['Cheque', { formula: "SUMIF('Transactions'!K:K,\"Cheque\",'Transactions'!L:L)" }]
  ]);
  summary.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
  summary.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1D4ED8' } };
  summary.getColumn(1).width = 28; summary.getColumn(2).width = 20; summary.getColumn(2).numFmt = '₹#,##0.00';

  const instructions = workbook.addWorksheet('Instructions');
  instructions.addRows([
    ['SocietyHub Excel Transaction Import'],
    ['1. Do not change sheet names or column headers.'],
    ['2. Use Member ID and Bill ID from the Members sheet and your maintenance records.'],
    ['3. Transaction Date must use YYYY-MM-DD.'],
    ['4. CREATE adds a payment. UPDATE may only modify a non-approved payment.'],
    ['5. Approved transactions are immutable; use the application adjustment workflow instead.'],
    ['6. Upload the workbook, review every validation result, then confirm the batch.'],
    ['7. Invalid rows are never imported. Duplicate uploads are not imported twice.']
  ]);
  instructions.getColumn(1).width = 110;
  instructions.getRow(1).font = { bold: true, size: 16 };
  return workbook.xlsx.writeBuffer();
};

const createErrorWorkbook = async (rows) => {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Transactions');
  sheet.addRow(HEADERS);
  rows.forEach((row) => sheet.addRow([
    row.transaction_id, '', row.member_id, row.member_name, row.wing, row.flat_number,
    row.bill_id, row.bill_number || '', row.transaction_date, row.transaction_type,
    row.payment_mode, row.amount == null ? '' : Number(row.amount), row.reference_number,
    row.payment_status, row.remarks, row.import_action, row.validation_result, row.validation_message
  ]));
  styleTable(sheet);
  addValidations(sheet, Math.max(rows.length + 20, 100));
  return workbook.xlsx.writeBuffer();
};

const canonicalRow = (societyId, row) => JSON.stringify([
  societyId, row.transactionId || '', row.memberId, row.billId, row.transactionDate,
  row.transactionType, row.paymentMode, Number(row.amount).toFixed(2), row.referenceNumber,
  row.paymentStatus, row.remarks, row.importAction
]);

module.exports = {
  HEADERS, ALLOWED_MODES, ALLOWED_STATUSES, ALLOWED_ACTIONS,
  parseWorkbook, createWorkbook, createErrorWorkbook, canonicalRow, hash,
  normalizeExportFilters
};
