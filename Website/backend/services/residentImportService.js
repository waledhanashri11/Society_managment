const ExcelJS = require('exceljs');
const XLSX = require('@keep-lts/xlsx');

const RESIDENT_FIELDS = [
  { header: 'Flat Number', required: true, format: 'Letters/numbers with optional / or -; must include a number', example: 'A-101' },
  { header: 'Resident Name', required: true, format: 'Resident full name', example: 'Aarav Sharma' },
  { header: 'Email', required: true, format: 'Valid email address', example: 'aarav.sharma@example.com' },
  { header: 'Mobile Number', required: true, format: '10-digit Indian mobile number beginning with 6-9', example: '9876543210' },
  { header: 'Flat Type', required: true, format: 'Must match an active flat type configured for the society', example: '2 BHK' },
  { header: 'Ownership Type', required: true, format: 'Owner or Tenant', example: 'Owner' },
  { header: 'Occupancy Status', required: true, format: 'Active or Inactive', example: 'Active' }
];
const HEADERS = RESIDENT_FIELDS.map((field) => field.header);
const MAX_ROWS = 1000;
const INVALID_FORMAT_MESSAGE = 'Invalid Excel format. Please download and use the sample Excel template.';

const text = (value) => String(value == null ? '' : value).trim();
const key = (value) => text(value).toLowerCase();
const normalizeMobile = (value) => {
  const digits = text(value).replace(/\D/g, '');
  return digits.length === 12 && digits.startsWith('91') ? digits.slice(2) : digits;
};

const parseResidentFile = (buffer) => {
  const workbook = XLSX.read(buffer, { type: 'buffer', cellDates: false, dense: true, sheetRows: MAX_ROWS + 2 });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  if (!sheet) throw new Error('The file does not contain a worksheet');
  const grid = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: false, defval: '', blankrows: false });
  if (!grid.length) throw new Error('The file is empty');
  const uploadedHeaders = grid[0].map(key).filter(Boolean);
  const expectedHeaders = HEADERS.map(key);
  if (uploadedHeaders.length !== expectedHeaders.length ||
      new Set(uploadedHeaders).size !== expectedHeaders.length ||
      expectedHeaders.some((header) => !uploadedHeaders.includes(header))) {
    throw new Error(INVALID_FORMAT_MESSAGE);
  }
  const headerMap = new Map(grid[0].map((value, index) => [key(value), index]));
  const rows = grid.slice(1).filter((row) => row.some((value) => text(value))).map((row, index) => {
    const get = (header) => text(row[headerMap.get(key(header))]);
    return { rowNumber: index + 2, flatNumber: get('Flat Number'), residentName: get('Resident Name'), email: get('Email').toLowerCase(), mobileNumber: normalizeMobile(get('Mobile Number')), flatType: get('Flat Type'), ownershipType: get('Ownership Type'), occupancyStatus: get('Occupancy Status') };
  });
  if (rows.length > MAX_ROWS) throw new Error(`A file may contain at most ${MAX_ROWS} resident rows`);
  return rows;
};

const createResidentTemplate = async () => {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'SocietyHub';
  const sheet = workbook.addWorksheet('Residents', { views: [{ state: 'frozen', ySplit: 1 }] });
  sheet.columns = HEADERS.map((header, index) => ({ header, key: `c${index}`, width: [18, 28, 32, 18, 18, 18, 18][index] }));
  sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
  sheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF174EA6' } };
  sheet.getRow(1).alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
  sheet.addRow(['A-101', 'Aarav Sharma', 'aarav.sharma@example.com', '9876543210', '2 BHK', 'Owner', 'Active']);
  sheet.addRow(['B-202', 'Meera Patil', 'meera.patil@example.com', '9123456789', '1 BHK', 'Tenant', 'Inactive']);
  sheet.dataValidations.add('F2:F1001', { type: 'list', allowBlank: false, formulae: ['"Owner,Tenant"'] });
  sheet.dataValidations.add('G2:G1001', { type: 'list', allowBlank: false, formulae: ['"Active,Inactive"'] });
  sheet.autoFilter = 'A1:G1';
  const instructions = workbook.addWorksheet('Instructions', { views: [{ state: 'frozen', ySplit: 1 }] });
  instructions.columns = [
    { header: 'Column', key: 'column', width: 24 },
    { header: 'Required', key: 'required', width: 12 },
    { header: 'Allowed values / format', key: 'format', width: 66 },
    { header: 'Example', key: 'example', width: 34 }
  ];
  RESIDENT_FIELDS.forEach((field) => instructions.addRow({
    column: field.header,
    required: field.required ? 'Yes' : 'No',
    format: field.format,
    example: field.example
  }));
  instructions.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
  instructions.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF174EA6' } };
  instructions.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' };
  instructions.getColumn(3).alignment = { wrapText: true, vertical: 'top' };
  return workbook.xlsx.writeBuffer();
};

const createResidentErrorReport = async (rows) => {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Import Errors', { views: [{ state: 'frozen', ySplit: 1 }] });
  const headers = ['Row', ...HEADERS, 'Result', 'Errors'];
  sheet.columns = headers.map((header) => ({ header, width: header === 'Errors' ? 55 : header === 'Email' ? 30 : 20 }));
  sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
  sheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFB42318' } };
  rows.forEach((row) => sheet.addRow([row.row_number, row.flat_number, row.resident_name, row.email, row.mobile_number, row.flat_type, row.ownership_type, row.occupancy_status, row.validation_result, row.validation_message]));
  sheet.autoFilter = `A1:J${Math.max(1, sheet.rowCount)}`;
  return workbook.xlsx.writeBuffer();
};

module.exports = { RESIDENT_FIELDS, HEADERS, MAX_ROWS, INVALID_FORMAT_MESSAGE, parseResidentFile, createResidentTemplate, createResidentErrorReport, normalizeMobile, key };
