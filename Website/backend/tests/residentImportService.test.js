const assert = require('assert');
const XLSX = require('@keep-lts/xlsx');
const ExcelJS = require('exceljs');
const { HEADERS, INVALID_FORMAT_MESSAGE, parseResidentFile, createResidentTemplate, normalizeMobile } = require('../services/residentImportService');

const workbook = XLSX.utils.book_new();
const sheet = XLSX.utils.aoa_to_sheet([HEADERS, ['A-101','Test Resident','test@example.com','+91 98765 43210','2 BHK','Owner','Active']]);
XLSX.utils.book_append_sheet(workbook, sheet, 'Residents');
const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
const rows = parseResidentFile(buffer);
assert.strictEqual(rows.length, 1);
assert.strictEqual(rows[0].flatNumber, 'A-101');
assert.strictEqual(rows[0].mobileNumber, '9876543210');
assert.strictEqual(normalizeMobile('91-98765-43210'), '9876543210');

createResidentTemplate().then(async (template) => {
  assert(template.length > 1000);
  const sample = new ExcelJS.Workbook();
  await sample.xlsx.load(template);
  assert.deepStrictEqual(sample.worksheets.map((item) => item.name), ['Residents', 'Instructions']);
  assert.deepStrictEqual(sample.getWorksheet('Residents').getRow(1).values.slice(1), HEADERS);
  assert.strictEqual(sample.getWorksheet('Residents').actualRowCount, 3);
  assert.strictEqual(sample.getWorksheet('Instructions').getCell('A2').value, 'Flat Number');
  assert.strictEqual(sample.getWorksheet('Instructions').getCell('B2').value, 'Yes');
  assert.strictEqual(parseResidentFile(template).length, 2);

  const invalid = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(invalid, XLSX.utils.aoa_to_sheet([HEADERS.slice(0, -1), ['A-101']]), 'Residents');
  assert.throws(
    () => parseResidentFile(XLSX.write(invalid, { type: 'buffer', bookType: 'xlsx' })),
    (error) => error.message === INVALID_FORMAT_MESSAGE
  );
  assert.throws(() => parseResidentFile(Buffer.from('not a spreadsheet')));
  console.log('Resident import service tests passed');
}).catch((error) => { console.error(error); process.exitCode = 1; });
