const assert = require('assert');
const ExcelJS = require('exceljs');
const {
  HEADERS, INVALID_FORMAT_MESSAGE, parseWorkbook, createWorkbook, createErrorWorkbook, canonicalRow, hash, normalizeExportFilters
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
  assert.strictEqual(workbook.getWorksheet('Transactions').actualRowCount, 3);
  assert.strictEqual(workbook.getWorksheet('Instructions').getCell('A2').value, 'Transaction ID');
  assert.strictEqual(workbook.getWorksheet('Instructions').getCell('B4').value, 'Yes');
  assert.strictEqual(workbook.getWorksheet('Summary').getCell('B4').formula.includes('SUMIF'), true);

  const transactions = workbook.getWorksheet('Transactions');
  transactions.spliceRows(2, 2);
  transactions.addRow(['', 'TEST', 10, 'Test Member', 'A', '101', 50, 'BILL-50', new Date('2026-08-24'), 'Maintenance', 'UPI', 1250, 'UTR-1', 'Pending', 'Test', 'CREATE', '', '']);
  const populated = await workbook.xlsx.writeBuffer();
  const rows = await parseWorkbook(populated);
  assert.strictEqual(rows.length, 1);
  assert.strictEqual(rows[0].memberId, '10');
  assert.strictEqual(rows[0].transactionDate, '2026-08-24');
  assert.strictEqual(rows[0].amount, '1250');
  assert.strictEqual(rows[0].importAction, 'CREATE');

  transactions.getRow(2).getCell(14).value = 'Paid';
  transactions.getRow(2).getCell(9).value = '01/02/2026';
  const strictRows = await parseWorkbook(Buffer.from(await workbook.xlsx.writeBuffer()));
  assert.strictEqual(strictRows[0].paymentStatus, 'Paid');
  assert.strictEqual(strictRows[0].transactionDate, '01/02/2026', 'Ambiguous text dates must not be silently coerced');

  assert.deepStrictEqual(normalizeExportFilters({}), {
    from: '', to: '', member: '', wing: '', flat: '', status: '', paymentMode: ''
  });
  assert.strictEqual(normalizeExportFilters({ from: '2026-08-01', to: '2026-08-31', member: '10' }).member, '10');
  assert.strictEqual(normalizeExportFilters({ status: 'Paid' }).status, 'Paid');
  assert.throws(() => normalizeExportFilters({ from: '2026-02-30' }), /From date must use YYYY-MM-DD/);
  assert.throws(() => normalizeExportFilters({ from: '2026-08-31', to: '2026-08-01' }), /From date cannot be after/);
  assert.throws(() => normalizeExportFilters({ status: 'Unknown' }), /Payment status/);

  const wrongSheet = new ExcelJS.Workbook();
  wrongSheet.addWorksheet('Sheet1').addRow(HEADERS);
  const wrongSheetBuffer = Buffer.from(await wrongSheet.xlsx.writeBuffer());
  await assert.rejects(() => parseWorkbook(wrongSheetBuffer), /Transactions sheet/);

  const missingColumn = new ExcelJS.Workbook();
  missingColumn.addWorksheet('Transactions').addRow(HEADERS.slice(0, -1));
  const missingColumnBuffer = Buffer.from(await missingColumn.xlsx.writeBuffer());
  await assert.rejects(
    () => parseWorkbook(missingColumnBuffer),
    (error) => error.message === INVALID_FORMAT_MESSAGE
  );
  await assert.rejects(() => parseWorkbook(Buffer.from('not a spreadsheet'), 'invalid.xlsx'));

  const fingerprint = hash(canonicalRow(1, { ...rows[0], amount: 1250 }));
  assert.match(fingerprint, /^[a-f0-9]{64}$/);
  const errorBuffer = await createErrorWorkbook([{ ...rows[0], validation_result: 'INVALID', validation_message: 'Example error' }]);
  assert(errorBuffer.length > 1000, 'Error report must be a non-empty XLSX workbook');
  console.log('Excel transaction workbook tests passed');
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
