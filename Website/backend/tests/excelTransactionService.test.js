const assert = require('assert');
const ExcelJS = require('exceljs');
const {
  HEADERS, parseWorkbook, createWorkbook, createErrorWorkbook, canonicalRow, hash, normalizeExportFilters
} = require('../services/excelTransactionService');

(async () => {
  const society = { name: 'Test Society', code: 'TEST' };
  const members = [{ id: 10, name: 'Test Member', wing: 'A', flat_number: '101', status: 'approved' }];
  const buffer = await createWorkbook({ society, members, template: true });
  assert(buffer.length > 1000, 'Template must be a non-empty XLSX workbook');

  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);
  assert.deepStrictEqual(workbook.worksheets.map((sheet) => sheet.name), ['Transactions', 'Members', 'Summary', 'Instructions']);
  assert.deepStrictEqual(workbook.getWorksheet('Transactions').getRow(1).values.slice(1), HEADERS);
  assert.strictEqual(workbook.getWorksheet('Summary').getCell('B4').formula.includes('SUMIF'), true);

  const transactions = workbook.getWorksheet('Transactions');
  transactions.addRow(['', 'TEST', 10, 'Test Member', 'A', '101', 50, 'BILL-50', new Date('2026-08-24'), 'Maintenance', 'UPI', 1250, 'UTR-1', 'Pending', 'Test', 'CREATE', '', '']);
  const populated = await workbook.xlsx.writeBuffer();
  const rows = await parseWorkbook(populated);
  assert.strictEqual(rows.length, 1);
  assert.strictEqual(rows[0].memberId, '10');
  assert.strictEqual(rows[0].transactionDate, '2026-08-24');
  assert.strictEqual(rows[0].amount, '1250');
  assert.strictEqual(rows[0].importAction, 'CREATE');

  assert.deepStrictEqual(normalizeExportFilters({}), {
    from: '', to: '', member: '', wing: '', flat: '', status: '', paymentMode: ''
  });
  assert.strictEqual(normalizeExportFilters({ from: '2026-08-01', to: '2026-08-31', member: '10' }).member, '10');
  assert.throws(() => normalizeExportFilters({ from: '2026-02-30' }), /From date must use YYYY-MM-DD/);
  assert.throws(() => normalizeExportFilters({ from: '2026-08-31', to: '2026-08-01' }), /From date cannot be after/);
  assert.throws(() => normalizeExportFilters({ status: 'Paid' }), /Payment status/);

  const fingerprint = hash(canonicalRow(1, { ...rows[0], amount: 1250 }));
  assert.match(fingerprint, /^[a-f0-9]{64}$/);
  const errorBuffer = await createErrorWorkbook([{ ...rows[0], validation_result: 'INVALID', validation_message: 'Example error' }]);
  assert(errorBuffer.length > 1000, 'Error report must be a non-empty XLSX workbook');
  console.log('Excel transaction workbook tests passed');
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
