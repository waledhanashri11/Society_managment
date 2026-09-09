const multer = require('multer');
const { promisePool } = require('../config/database');
const {
  INVALID_FORMAT_MESSAGE, ALLOWED_MODES, ALLOWED_STATUSES, ALLOWED_ACTIONS, parseWorkbook, createWorkbook,
  createErrorWorkbook, canonicalRow, hash, normalizeExportFilters
} = require('../services/excelTransactionService');

const MAX_FILE_BYTES = 10 * 1024 * 1024;
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_BYTES, files: 1, fields: 0 },
  fileFilter: (_req, file, callback) => {
    const validExtension = /\.(xlsx|xls|csv)$/i.test(file.originalname || '');
    const validMime = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel', 'text/csv', 'application/csv',
      'application/octet-stream'
    ].includes(file.mimetype);
    callback(validExtension && validMime ? null : new Error('Only .xlsx, .xls and .csv files are supported'), validExtension && validMime);
  }
});

const uploadWorkbook = (req, res, next) => upload.single('file')(req, res, (error) => {
  if (!error) return next();
  const message = error.code === 'LIMIT_FILE_SIZE' ? 'Workbook must be 10 MB or smaller' : error.message;
  return res.status(400).json({ success: false, message });
});

const sendWorkbook = (res, buffer, fileName) => {
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="${fileName.replace(/[^A-Za-z0-9._-]/g, '_')}"`);
  res.setHeader('Cache-Control', 'private, no-store, max-age=0');
  return res.send(Buffer.from(buffer));
};

const societyContext = async (societyId) => {
  const [rows] = await promisePool.query('SELECT id, name, code FROM societies WHERE id = ? LIMIT 1', [societyId]);
  if (!rows[0]) throw new Error('Authenticated society is unavailable');
  return rows[0];
};

const listMembers = async (societyId) => {
  const [rows] = await promisePool.query(
    `SELECT DISTINCT ON (u.id) u.id, u.name, u.status,
            COALESCE(f.wing, f.wing_block, '') AS wing, f.flat_no AS flat_number
     FROM users u
     LEFT JOIN flats f ON f.current_resident_id = u.id OR f.id = u.flat_id
     WHERE u.role = 'resident' AND u.society_id = ?
     ORDER BY u.id, f.id DESC`,
    [societyId]
  );
  return rows;
};

const template = async (req, res) => {
  try {
    const society = await societyContext(req.user.societyId);
    const members = await listMembers(req.user.societyId);
    const buffer = await createWorkbook({ society, members, template: true });
    return sendWorkbook(res, buffer, 'maintenance_import_sample.xlsx');
  } catch (error) {
    console.error('Excel template error:', error);
    return res.status(500).json({ success: false, message: 'Unable to generate the transaction template' });
  }
};

const exportTransactions = async (req, res) => {
  try {
    const society = await societyContext(req.user.societyId);
    const filters = normalizeExportFilters(req.query);
    const conditions = ['p.society_id = ?'];
    const values = [req.user.societyId];
    const add = (sql, value) => { if (value != null && String(value).trim()) { conditions.push(sql); values.push(String(value).trim()); } };
    add('COALESCE(p.paid_at, p.created_at)::date >= ?::date', filters.from);
    add('COALESCE(p.paid_at, p.created_at)::date <= ?::date', filters.to);
    add('p.resident_id = ?::int', filters.member);
    add("LOWER(COALESCE(f.wing, f.wing_block, '')) = LOWER(?)", filters.wing);
    add('LOWER(f.flat_no) = LOWER(?)', filters.flat);
    add('LOWER(p.payment_status) = LOWER(?)', filters.status);
    add('LOWER(p.payment_method) = LOWER(?)', filters.paymentMode);
    const where = `WHERE ${conditions.join(' AND ')}`;
    const [transactions] = await promisePool.query(
      `SELECT p.id AS transaction_id, p.resident_id AS member_id, u.name AS member_name,
              COALESCE(f.wing, f.wing_block, '') AS wing, f.flat_no AS flat_number,
              p.bill_id, CONCAT('BILL-', p.bill_id) AS bill_number,
              COALESCE(p.paid_at, p.created_at)::date AS transaction_date,
              p.payment_method AS payment_mode, p.amount, p.transaction_id AS reference_number,
              p.payment_status, p.remarks, 'UPDATE' AS import_action
       FROM payments p
       LEFT JOIN users u ON u.id = p.resident_id
       LEFT JOIN maintenance m ON m.id = p.bill_id
       LEFT JOIN flats f ON f.id = m.flat_id
       ${where}
       ORDER BY COALESCE(p.paid_at, p.created_at) DESC, p.id DESC`,
      values
    );
    const members = await listMembers(req.user.societyId);
    const buffer = await createWorkbook({ society, transactions, members });
    return sendWorkbook(res, buffer, `SocietyHub_Transactions_${new Date().toISOString().slice(0, 10)}.xlsx`);
  } catch (error) {
    console.error('Excel export error:', error);
    const isValidationError = /must use YYYY-MM-DD|cannot be after|must be a positive number|Payment (status|mode) must be/i.test(error.message || '');
    const status = isValidationError ? 400 : 500;
    return res.status(status).json({ success: false, message: status === 400 ? error.message : 'Unable to export transactions' });
  }
};

const validIsoDate = (value) => {
  const normalized = String(value || '').trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(normalized)) return false;
  const parsed = new Date(`${normalized}T00:00:00.000Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === normalized;
};
const positiveInteger = (value) => /^\d+$/.test(String(value)) && Number(value) > 0;
const paymentAccount = (mode) => mode === 'Cash' ? 'CASH' : 'BANK';

const validateRow = async (row, society, seenReferences) => {
  const errors = [];
  const warnings = [];
  const amount = Number(row.amount);
  if (!positiveInteger(row.memberId)) errors.push('Member ID must be a positive number');
  if (!positiveInteger(row.billId)) errors.push('Bill ID must be a positive number');
  if (!validIsoDate(row.transactionDate)) errors.push('Transaction Date must use YYYY-MM-DD');
  if (row.transactionType !== 'Maintenance') errors.push('Only Maintenance transactions are supported');
  if (!ALLOWED_MODES.has(row.paymentMode)) errors.push('Invalid Payment Mode');
  if (!ALLOWED_STATUSES.has(row.paymentStatus)) errors.push('Invalid Payment Status');
  if (!ALLOWED_ACTIONS.has(row.importAction)) errors.push('Import Action must be CREATE or UPDATE');
  if (!Number.isFinite(amount) || amount <= 0 || amount > 999999999999.99) errors.push('Amount must be a positive number');
  if (row.paymentMode !== 'Cash' && !row.referenceNumber) errors.push('UTR/Cheque Number is required for non-cash payments');
  const referenceKey = row.referenceNumber.toLowerCase();
  if (referenceKey && seenReferences.has(referenceKey)) errors.push('Duplicate UTR/Cheque Number in workbook');
  if (referenceKey) seenReferences.add(referenceKey);
  if (row.societyCode && row.societyCode.toLowerCase() !== String(society.code).toLowerCase()) errors.push('Society Code does not match the authenticated society');

  let record = null;
  if (positiveInteger(row.memberId) && positiveInteger(row.billId)) {
    const [records] = await promisePool.query(
      `SELECT u.id AS member_id, u.name AS member_name, u.status AS member_status,
              m.id AS bill_id, m.resident_id, m.flat_id,
              COALESCE(m.remaining_amount, m.total_payable, m.total_amount, m.amount, 0) AS outstanding,
              f.flat_no, COALESCE(f.wing, f.wing_block, '') AS wing
       FROM users u
       JOIN maintenance m ON m.id = ? AND m.resident_id = u.id AND m.society_id = ?
       JOIN flats f ON f.id = m.flat_id AND f.society_id = ?
       WHERE u.id = ? AND u.society_id = ? LIMIT 1`,
      [Number(row.billId), society.id, society.id, Number(row.memberId), society.id]
    );
    record = records[0];
    if (!record) errors.push('Member or bill was not found in this society, or the bill does not belong to the member');
    else {
      if (record.member_status !== 'approved') errors.push('Member account is not approved');
      if (row.flatNumber && row.flatNumber.toLowerCase() !== String(record.flat_no).toLowerCase()) errors.push('Flat Number does not match the bill');
      if (row.wing && row.wing.toLowerCase() !== String(record.wing).toLowerCase()) errors.push('Wing does not match the bill');
      if (['Approved', 'Paid'].includes(row.paymentStatus) && amount > Number(record.outstanding) + 0.005) errors.push('Approved/Paid amount exceeds the bill outstanding amount');
      row.memberName = record.member_name;
      row.flatNumber = record.flat_no;
      row.wing = record.wing;
    }
  }

  if (row.importAction === 'UPDATE') {
    if (!positiveInteger(row.transactionId)) errors.push('Transaction ID is required for UPDATE');
    else {
      const [payments] = await promisePool.query(
        'SELECT id, bill_id, resident_id, payment_status FROM payments WHERE id = ? AND society_id = ? LIMIT 1',
        [Number(row.transactionId), society.id]
      );
      const payment = payments[0];
      if (!payment) errors.push('Transaction to update was not found in this society');
      else if (['approved', 'paid'].includes(String(payment.payment_status).toLowerCase())) errors.push('Approved transactions are immutable; use an adjustment workflow');
      else if (Number(payment.bill_id) !== Number(row.billId) || Number(payment.resident_id) !== Number(row.memberId)) errors.push('UPDATE cannot change the transaction member or bill');
    }
  } else if (row.transactionId) {
    warnings.push('Transaction ID is ignored for CREATE');
  }

  if (row.referenceNumber) {
    const values = [row.referenceNumber, Number(row.billId), society.id];
    let sql = 'SELECT id FROM payments WHERE LOWER(transaction_id) = LOWER(?) AND bill_id = ? AND society_id = ?';
    if (row.importAction === 'UPDATE' && positiveInteger(row.transactionId)) { sql += ' AND id <> ?'; values.push(Number(row.transactionId)); }
    const [duplicates] = await promisePool.query(`${sql} LIMIT 1`, values);
    if (duplicates[0]) errors.push('UTR/Cheque Number already exists for this bill');
  }

  return {
    ...row,
    memberId: positiveInteger(row.memberId) ? Number(row.memberId) : null,
    billId: positiveInteger(row.billId) ? Number(row.billId) : null,
    transactionId: positiveInteger(row.transactionId) ? Number(row.transactionId) : null,
    amount: Number.isFinite(amount) ? amount : null,
    validationResult: errors.length ? 'INVALID' : warnings.length ? 'WARNING' : 'VALID',
    validationMessage: [...errors, ...warnings].join('; ')
  };
};

const previewImport = async (req, res) => {
  try {
    if (!req.file?.buffer) return res.status(400).json({ success: false, message: 'Excel workbook is required' });
    const society = await societyContext(req.user.societyId);
    const fileFingerprint = hash(req.file.buffer);
    const [existing] = await promisePool.query(
      'SELECT id, status FROM excel_transaction_import_batches WHERE file_fingerprint = ? AND society_id = ? LIMIT 1',
      [fileFingerprint, req.user.societyId]
    );
    if (existing[0]) return res.status(409).json({
      success: false,
      message: existing[0].status === 'COMPLETED'
        ? 'This workbook has already been imported'
        : 'This workbook has already been validated. Use its existing preview or upload a changed workbook.'
    });
    const parsedRows = await parseWorkbook(req.file.buffer, req.file.originalname);
    if (!parsedRows.length) return res.status(400).json({ success: false, message: 'The Transactions sheet does not contain any data rows' });
    if (parsedRows.length > 5000) return res.status(400).json({ success: false, message: 'A workbook may contain at most 5,000 transaction rows' });
    const seenReferences = new Set();
    const rows = [];
    for (const row of parsedRows) rows.push(await validateRow(row, society, seenReferences));
    const counts = rows.reduce((acc, row) => { acc[row.validationResult] += 1; return acc; }, { VALID: 0, INVALID: 0, WARNING: 0 });
    const totalValidAmount = rows.filter((row) => row.validationResult === 'VALID').reduce((sum, row) => sum + Number(row.amount || 0), 0);
    const connection = await promisePool.getConnection();
    try {
      await connection.beginTransaction();
      const [batchResult] = await connection.query(
        `INSERT INTO excel_transaction_import_batches
          (society_id, created_by, file_name, file_fingerprint, total_rows, valid_rows, invalid_rows, warning_rows, total_valid_amount)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [req.user.societyId, req.user.id, req.file.originalname.slice(0, 255), fileFingerprint, rows.length, counts.VALID, counts.INVALID, counts.WARNING, totalValidAmount]
      );
      const batchId = batchResult.insertId;
      for (const row of rows) {
        const rowFingerprint = hash(canonicalRow(req.user.societyId, row));
        await connection.query(
          `INSERT INTO excel_transaction_import_rows
            (society_id, batch_id, row_number, row_fingerprint, transaction_id, member_id, member_name, wing, flat_number,
             bill_id, transaction_date, transaction_type, payment_mode, amount, reference_number, payment_status,
             remarks, import_action, validation_result, validation_message)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?::date, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [req.user.societyId, batchId, row.rowNumber, rowFingerprint, row.transactionId, row.memberId, row.memberName, row.wing,
            row.flatNumber, row.billId, validIsoDate(row.transactionDate) ? row.transactionDate : null, row.transactionType,
            row.paymentMode, row.amount, row.referenceNumber || null, row.paymentStatus, row.remarks || null,
            row.importAction, row.validationResult, row.validationMessage || null]
        );
      }
      await connection.commit();
      return res.json({ success: true, message: 'Workbook validation completed', data: previewPayload(batchId, rows, counts, totalValidAmount) });
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally { connection.release(); }
  } catch (error) {
    console.error('Excel preview error:', error);
    const safeMessages = [
      /^Workbook must contain a Transactions sheet$/,
      new RegExp(`^${INVALID_FORMAT_MESSAGE.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`),
      /^The Transactions sheet does not contain any data rows$/,
      /^A workbook may contain at most 5,000 transaction rows$/
    ];
    const safeMessage = safeMessages.some((pattern) => pattern.test(error.message || ''))
      ? error.message.slice(0, 240)
      : 'Unable to validate workbook';
    return res.status(400).json({ success: false, message: safeMessage });
  }
};

const previewPayload = (batchId, rows, counts, totalValidAmount) => ({
  batchId: String(batchId), totalRows: rows.length, validRows: counts.VALID,
  invalidRows: counts.INVALID, warningRows: counts.WARNING, totalValidAmount: Number(totalValidAmount).toFixed(2),
  rows: rows.map((row) => ({
    rowNumber: row.rowNumber, memberName: row.memberName, wing: row.wing, flatNumber: row.flatNumber,
    transactionDate: row.transactionDate, paymentMode: row.paymentMode,
    amount: row.amount == null ? null : Number(row.amount).toFixed(2), status: row.paymentStatus,
    importAction: row.importAction,
    validationResult: row.validationResult[0] + row.validationResult.slice(1).toLowerCase(),
    validationMessage: row.validationMessage
  }))
});

const recalculateBill = async (connection, societyId, billId) => {
  await connection.query(
    `UPDATE maintenance m SET
       paid_amount = totals.paid,
       remaining_amount = GREATEST(COALESCE(m.total_payable, m.total_amount, m.amount, 0) - totals.paid, 0),
       status = CASE WHEN totals.paid >= COALESCE(m.total_payable, m.total_amount, m.amount, 0) THEN 'Paid' ELSE 'Partial' END,
       payment_date = totals.latest,
       updated_at = NOW()
     FROM (
       SELECT COALESCE(SUM(amount), 0) AS paid, MAX(COALESCE(paid_at, created_at)) AS latest
        FROM payments WHERE bill_id = ? AND society_id = ? AND LOWER(payment_status) IN ('approved', 'paid')
     ) totals WHERE m.id = ? AND m.society_id = ?`,
    [billId, societyId, billId, societyId]
  );
};

const confirmImport = async (req, res) => {
  const batchId = String(req.body?.batchId || '').trim();
  if (!positiveInteger(batchId)) return res.status(400).json({ success: false, message: 'A valid batchId is required' });
  const connection = await promisePool.getConnection();
  try {
    await connection.beginTransaction();
    const [batches] = await connection.query(
      'SELECT * FROM excel_transaction_import_batches WHERE id = ? AND society_id = ? FOR UPDATE',
      [Number(batchId), req.user.societyId]
    );
    const batch = batches[0];
    if (!batch) { await connection.rollback(); return res.status(404).json({ success: false, message: 'Import batch not found' }); }
    if (batch.status === 'COMPLETED') { await connection.rollback(); return res.status(409).json({ success: false, message: 'This batch has already been imported' }); }
    if (batch.status !== 'PREVIEWED') { await connection.rollback(); return res.status(409).json({ success: false, message: 'This batch cannot be imported in its current state' }); }
    await connection.query("UPDATE excel_transaction_import_batches SET status = 'IMPORTING', confirmed_at = NOW(), updated_at = NOW() WHERE id = ? AND society_id = ?", [Number(batchId), req.user.societyId]);
    const [rows] = await connection.query("SELECT * FROM excel_transaction_import_rows WHERE batch_id = ? AND society_id = ? AND validation_result = 'VALID' ORDER BY row_number FOR UPDATE", [Number(batchId), req.user.societyId]);
    let imported = 0;
    for (const row of rows) {
      const [records] = await connection.query(
        `SELECT m.id, m.resident_id, COALESCE(m.remaining_amount, m.total_payable, m.total_amount, m.amount, 0) AS outstanding
         FROM maintenance m JOIN users u ON u.id = m.resident_id AND u.society_id = m.society_id
         WHERE m.id = ? AND u.id = ? AND m.society_id = ? FOR UPDATE`,
        [row.bill_id, row.member_id, req.user.societyId]
      );
      const bill = records[0];
      if (!bill) throw new Error(`Row ${row.row_number}: member or bill is no longer available`);
      if (['Approved', 'Paid'].includes(row.payment_status) && Number(row.amount) > Number(bill.outstanding) + 0.005) throw new Error(`Row ${row.row_number}: approved/paid amount now exceeds the outstanding balance`);
      const reference = row.reference_number || `CASH-XLS-${batchId}-${row.row_number}`;
      let paymentId;
      if (row.import_action === 'UPDATE') {
        const [payments] = await connection.query('SELECT id, payment_status, bill_id, resident_id FROM payments WHERE id = ? AND society_id = ? FOR UPDATE', [row.transaction_id, req.user.societyId]);
        const payment = payments[0];
        if (!payment || Number(payment.bill_id) !== Number(row.bill_id) || Number(payment.resident_id) !== Number(row.member_id)) throw new Error(`Row ${row.row_number}: transaction scope changed after preview`);
        if (['approved', 'paid'].includes(String(payment.payment_status).toLowerCase())) throw new Error(`Row ${row.row_number}: approved transactions are immutable`);
        await connection.query(
          `UPDATE payments SET payment_method = ?, transaction_id = ?, amount = ?, payment_status = ?, paid_at = ?::date,
              remarks = ?, payment_account = ?, updated_at = NOW() WHERE id = ? AND society_id = ?`,
          [row.payment_mode, reference, row.amount, row.payment_status, row.transaction_date, row.remarks, paymentAccount(row.payment_mode), row.transaction_id, req.user.societyId]
        );
        paymentId = row.transaction_id;
      } else {
        const [duplicate] = await connection.query('SELECT id FROM payments WHERE bill_id = ? AND LOWER(transaction_id) = LOWER(?) AND society_id = ? LIMIT 1', [row.bill_id, reference, req.user.societyId]);
        if (duplicate[0]) throw new Error(`Row ${row.row_number}: duplicate UTR/Cheque Number`);
        const [insert] = await connection.query(
          `INSERT INTO payments
            (society_id, bill_id, resident_id, payment_method, transaction_id, amount, payment_status, paid_at, remarks, payment_account)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?::date, ?, ?)`,
          [req.user.societyId, row.bill_id, row.member_id, row.payment_mode, reference, row.amount,
            row.payment_status, row.transaction_date, row.remarks, paymentAccount(row.payment_mode)]
        );
        paymentId = insert.insertId;
      }
      if (['Approved', 'Paid'].includes(row.payment_status)) await recalculateBill(connection, req.user.societyId, row.bill_id);
      await connection.query('UPDATE excel_transaction_import_rows SET imported_payment_id = ?, imported_at = NOW() WHERE id = ? AND society_id = ?', [paymentId, row.id, req.user.societyId]);
      imported += 1;
    }
    const skipped = Number(batch.total_rows) - imported;
    await connection.query(
      `UPDATE excel_transaction_import_batches SET status = 'COMPLETED', imported_rows = ?, skipped_rows = ?, failed_rows = 0,
         completed_at = NOW(), updated_at = NOW() WHERE id = ? AND society_id = ?`, [imported, skipped, Number(batchId), req.user.societyId]
    );
    await connection.commit();
    return res.json({ success: true, message: 'Excel transactions imported successfully', data: { batchId, imported, skipped, failed: 0, message: 'Excel transactions imported successfully.' } });
  } catch (error) {
    await connection.rollback();
    console.error('Excel confirmation error:', error);
    return res.status(409).json({ success: false, message: error.message?.slice(0, 240) || 'Unable to import transactions' });
  } finally { connection.release(); }
};

const history = async (req, res) => {
  try {
    const [rows] = await promisePool.query(
      `SELECT id::text AS id, file_name AS "fileName", status, created_at AS "createdAt",
              total_rows AS "totalRows", imported_rows AS imported, failed_rows AS failed
       FROM excel_transaction_import_batches WHERE society_id = ? ORDER BY created_at DESC LIMIT 100`,
      [req.user.societyId]
    );
    return res.json({ success: true, data: rows });
  } catch (error) {
    console.error('Excel import history error:', error);
    return res.status(500).json({ success: false, message: 'Unable to load import history' });
  }
};

const errorReport = async (req, res) => {
  try {
    if (!positiveInteger(req.params.batchId)) return res.status(400).json({ success: false, message: 'Invalid batch ID' });
    const [batch] = await promisePool.query(
      'SELECT id FROM excel_transaction_import_batches WHERE id = ? AND society_id = ? LIMIT 1',
      [Number(req.params.batchId), req.user.societyId]
    );
    if (!batch[0]) return res.status(404).json({ success: false, message: 'Import batch not found' });
    const [rows] = await promisePool.query(
      "SELECT * FROM excel_transaction_import_rows WHERE batch_id = ? AND society_id = ? AND validation_result <> 'VALID' ORDER BY row_number",
      [Number(req.params.batchId), req.user.societyId]
    );
    const buffer = await createErrorWorkbook(rows);
    return sendWorkbook(res, buffer, `SocietyHub_Transaction_Import_Errors_${req.params.batchId}.xlsx`);
  } catch (error) {
    console.error('Excel error report error:', error);
    return res.status(500).json({ success: false, message: 'Unable to create error report' });
  }
};

module.exports = { uploadWorkbook, template, exportTransactions, previewImport, confirmImport, history, errorReport };
