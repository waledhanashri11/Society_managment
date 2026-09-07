const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const multer = require('multer');
const { promisePool } = require('../config/database');
const { parseResidentFile, createResidentTemplate, createResidentErrorReport, normalizeMobile, key } = require('../services/residentImportService');

const MAX_FILE_BYTES = 5 * 1024 * 1024;
const allowedExtension = /\.(xlsx|xls|csv)$/i;
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: MAX_FILE_BYTES, files: 1, fields: 0 }, fileFilter: (_req, file, cb) => cb(allowedExtension.test(file.originalname || '') ? null : new Error('Only .xlsx, .xls and .csv files are supported'), allowedExtension.test(file.originalname || '')) });
const uploadFile = (req, res, next) => upload.single('file')(req, res, (error) => error ? res.status(400).json({ success: false, message: error.code === 'LIMIT_FILE_SIZE' ? 'File must be 5 MB or smaller' : error.message }) : next());
const sendXlsx = (res, buffer, name) => { res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'); res.setHeader('Content-Disposition', `attachment; filename="${name}"`); res.setHeader('Cache-Control', 'private, no-store'); res.send(Buffer.from(buffer)); };

const template = async (_req, res) => { try { sendXlsx(res, await createResidentTemplate(), 'SocietyHub_Resident_Import_Template.xlsx'); } catch (error) { console.error('Resident template error:', error); res.status(500).json({ success: false, message: 'Unable to generate template' }); } };

const validFlat = (value) => /^(?=.*\d)[A-Za-z0-9][A-Za-z0-9\/-]{0,19}$/.test(value);
const validateRows = async (rows, societyId) => {
  const [flatTypes] = await promisePool.query("SELECT name FROM flat_types WHERE society_id = ? AND LOWER(COALESCE(status,'active')) = 'active'", [societyId]);
  const supportedTypes = new Set(flatTypes.map((row) => key(row.name)));
  const [existingUsers] = await promisePool.query("SELECT LOWER(email) AS email, REGEXP_REPLACE(COALESCE(phone,''), '[^0-9]', '', 'g') AS phone FROM users WHERE society_id = ?", [societyId]);
  const [existingFlats] = await promisePool.query('SELECT LOWER(flat_no) AS flat_number FROM flats WHERE society_id = ?', [societyId]);
  const emails = new Set(existingUsers.map((row) => row.email));
  const mobiles = new Set(existingUsers.map((row) => normalizeMobile(row.phone)).filter(Boolean));
  const flats = new Set(existingFlats.map((row) => row.flat_number));
  const seenEmail = new Set(), seenMobile = new Set(), seenFlat = new Set();
  return rows.map((row) => {
    const errors = [], duplicates = [];
    if (!row.flatNumber) errors.push('Flat Number is required'); else if (!validFlat(row.flatNumber)) errors.push('Flat Number is invalid');
    if (!row.residentName) errors.push('Resident Name is required');
    if (!row.email) errors.push('Email is required'); else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(row.email)) errors.push('Email is invalid');
    if (!row.mobileNumber) errors.push('Mobile Number is required'); else if (!/^[6-9]\d{9}$/.test(row.mobileNumber)) errors.push('Mobile Number must be a valid Indian number');
    if (!row.flatType) errors.push('Flat Type is required'); else if (!supportedTypes.has(key(row.flatType))) errors.push('Flat Type is not supported');
    if (!['owner','tenant'].includes(key(row.ownershipType))) errors.push('Ownership Type must be Owner or Tenant');
    if (!['active','inactive'].includes(key(row.occupancyStatus))) errors.push('Occupancy Status must be Active or Inactive');
    if (flats.has(key(row.flatNumber))) duplicates.push('Flat Number already exists');
    if (emails.has(key(row.email))) duplicates.push('Email already exists');
    if (mobiles.has(row.mobileNumber)) duplicates.push('Mobile Number already exists');
    if (seenFlat.has(key(row.flatNumber))) duplicates.push('Duplicate Flat Number in file');
    if (seenEmail.has(key(row.email))) duplicates.push('Duplicate Email in file');
    if (seenMobile.has(row.mobileNumber)) duplicates.push('Duplicate Mobile Number in file');
    seenFlat.add(key(row.flatNumber)); seenEmail.add(key(row.email)); seenMobile.add(row.mobileNumber);
    const result = errors.length ? 'INVALID' : duplicates.length ? 'DUPLICATE' : 'VALID';
    return { ...row, validationResult: result, validationMessage: [...errors, ...duplicates].join('; ') };
  });
};

const payload = (batchId, rows) => ({ batchId: String(batchId), totalRows: rows.length, validRows: rows.filter((r) => r.validationResult === 'VALID').length, invalidRows: rows.filter((r) => r.validationResult === 'INVALID').length, duplicateRows: rows.filter((r) => r.validationResult === 'DUPLICATE').length, rows });

const preview = async (req, res) => {
  try {
    if (!req.file?.buffer?.length) return res.status(400).json({ success: false, message: 'A resident import file is required' });
    const parsed = parseResidentFile(req.file.buffer);
    if (!parsed.length) return res.status(400).json({ success: false, message: 'The file does not contain resident rows' });
    const rows = await validateRows(parsed, req.user.societyId);
    const summary = payload('', rows);
    const connection = await promisePool.getConnection();
    try {
      await connection.beginTransaction();
      const [batch] = await connection.query(`INSERT INTO resident_import_batches (society_id,created_by,file_name,total_rows,valid_rows,invalid_rows,duplicate_rows) VALUES (?,?,?,?,?,?,?)`, [req.user.societyId, req.user.id, req.file.originalname.slice(0,255), summary.totalRows, summary.validRows, summary.invalidRows, summary.duplicateRows]);
      for (const row of rows) await connection.query(`INSERT INTO resident_import_rows (society_id,batch_id,row_number,flat_number,resident_name,email,mobile_number,flat_type,ownership_type,occupancy_status,validation_result,validation_message) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`, [req.user.societyId,batch.insertId,row.rowNumber,row.flatNumber,row.residentName,row.email,row.mobileNumber,row.flatType,row.ownershipType,row.occupancyStatus,row.validationResult,row.validationMessage || null]);
      await connection.commit();
      return res.json({ success: true, message: 'Resident file validated', data: payload(batch.insertId, rows) });
    } catch (error) { await connection.rollback(); throw error; } finally { connection.release(); }
  } catch (error) {
    console.error('Resident import preview error:', error);
    const safe = /^(Missing required column:|A file may contain at most|The file)/.test(error.message || '') ? error.message : 'Unable to validate resident file';
    return res.status(400).json({ success: false, message: safe });
  }
};

const floorFromFlat = (flat) => Math.max(0, Math.floor(Number((String(flat).match(/\d+/) || ['0'])[0]) / 100));
const confirm = async (req, res) => {
  const batchId = Number(req.body?.batchId);
  if (!Number.isInteger(batchId) || batchId <= 0) return res.status(400).json({ success: false, message: 'A valid batchId is required' });
  const connection = await promisePool.getConnection();
  try {
    await connection.beginTransaction();
    const [batches] = await connection.query('SELECT * FROM resident_import_batches WHERE id = ? AND society_id = ? FOR UPDATE', [batchId, req.user.societyId]);
    const batch = batches[0];
    if (!batch) { await connection.rollback(); return res.status(404).json({ success: false, message: 'Import preview not found' }); }
    if (batch.status !== 'PREVIEWED') { await connection.rollback(); return res.status(409).json({ success: false, message: 'This import was already confirmed' }); }
    const [rows] = await connection.query("SELECT * FROM resident_import_rows WHERE batch_id = ? AND society_id = ? AND validation_result = 'VALID' ORDER BY row_number", [batchId, req.user.societyId]);
    let imported = 0, skipped = Number(batch.invalid_rows) + Number(batch.duplicate_rows);
    for (const row of rows) {
      const [dupes] = await connection.query(`SELECT 1 FROM users WHERE society_id=? AND (LOWER(email)=LOWER(?) OR REGEXP_REPLACE(COALESCE(phone,''),'[^0-9]','','g')=?) UNION ALL SELECT 1 FROM flats WHERE society_id=? AND LOWER(flat_no)=LOWER(?) LIMIT 1`, [req.user.societyId,row.email,row.mobile_number,req.user.societyId,row.flat_number]);
      if (dupes.length) { skipped++; continue; }
      const [types] = await connection.query('SELECT id FROM flat_types WHERE society_id=? AND LOWER(name)=LOWER(?) LIMIT 1', [req.user.societyId,row.flat_type]);
      if (!types[0]) { skipped++; continue; }
      const [flat] = await connection.query(`INSERT INTO flats (flat_no,wing,floor_no,status,maintenance_charge,flat_type_id,society_id) VALUES (?, 'A', ?, 'Available', 0, ?, ?)`, [row.flat_number,floorFromFlat(row.flat_number),types[0].id,req.user.societyId]);
      const password = crypto.randomBytes(18).toString('base64url');
      const hash = await bcrypt.hash(password, 12);
      const accountStatus = key(row.occupancy_status) === 'active' ? 'approved' : 'pending';
      const [user] = await connection.query(`INSERT INTO users (name,email,password,phone,role,status,flat_id,ownership_type,occupancy_status,society_id) VALUES (?,?,?,?, 'resident', ?, ?, ?, ?, ?)`, [row.resident_name,row.email,hash,row.mobile_number,accountStatus,flat.insertId,row.ownership_type,row.occupancy_status,req.user.societyId]);
      await connection.query(`UPDATE flats SET current_resident_id=?, status='Occupied' WHERE id=?`, [user.insertId,flat.insertId]);
      await connection.query('UPDATE resident_import_rows SET imported_user_id=? WHERE id=?', [user.insertId,row.id]);
      imported++;
    }
    await connection.query(`UPDATE resident_import_batches SET status='COMPLETED',imported_rows=?,skipped_rows=?,failed_rows=0,completed_at=NOW() WHERE id=?`, [imported,skipped,batchId]);
    await connection.commit();
    return res.json({ success:true, message:'Resident import completed', data:{ batchId:String(batchId), successfullyImported:imported, skipped, failed:0 } });
  } catch (error) {
    await connection.rollback(); console.error('Resident import confirm error:', error);
    return res.status(500).json({ success:false, message:'Import failed and all changes were rolled back' });
  } finally { connection.release(); }
};

const errors = async (req, res) => { try { const [rows] = await promisePool.query("SELECT * FROM resident_import_rows WHERE batch_id=? AND society_id=? AND validation_result<>'VALID' ORDER BY row_number", [req.params.batchId,req.user.societyId]); if (!rows.length) return res.status(404).json({success:false,message:'No invalid rows found'}); sendXlsx(res,await createResidentErrorReport(rows),`Resident_Import_Errors_${req.params.batchId}.xlsx`); } catch (error) { console.error('Resident error report error:',error); res.status(500).json({success:false,message:'Unable to create error report'}); } };

module.exports = { uploadFile, template, preview, confirm, errors };
