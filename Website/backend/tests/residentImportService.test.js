const assert = require('assert');
const XLSX = require('@keep-lts/xlsx');
const { HEADERS, parseResidentFile, createResidentTemplate, normalizeMobile } = require('../services/residentImportService');

const workbook = XLSX.utils.book_new();
const sheet = XLSX.utils.aoa_to_sheet([HEADERS, ['A-101','Test Resident','test@example.com','+91 98765 43210','2 BHK','Owner','Active']]);
XLSX.utils.book_append_sheet(workbook, sheet, 'Residents');
const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
const rows = parseResidentFile(buffer);
assert.strictEqual(rows.length, 1);
assert.strictEqual(rows[0].flatNumber, 'A-101');
assert.strictEqual(rows[0].mobileNumber, '9876543210');
assert.strictEqual(normalizeMobile('91-98765-43210'), '9876543210');

createResidentTemplate().then((template) => {
  assert(template.length > 1000);
  console.log('Resident import service tests passed');
}).catch((error) => { console.error(error); process.exitCode = 1; });
