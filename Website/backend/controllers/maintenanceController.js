const { promisePool } = require('../config/database');
const fs = require('fs');
const path = require('path');
const { buildPublicFileUrl } = require('../utils/fileUrl');

const LATE_FEE = 100;

const sendResponse = (res, statusCode, message, data = null, errors = null) => {
  const payload = { success: statusCode < 400, message };
  if (data !== null) payload.data = data;
  if (errors) payload.errors = errors;
  return res.status(statusCode).json(payload);
};

const resolvePaymentScreenshotUrl = (req, value) => {
  return buildPublicFileUrl(req, value, { mustExist: true, rootDir: path.resolve(__dirname, '..') });
};

const withPaymentScreenshotUrls = (req, payments = []) => {
  const forwardedProto = String(req?.headers?.['x-forwarded-proto'] || '').split(',')[0].trim();
  const protocol = forwardedProto || req?.protocol || 'https';
  const host = req?.headers?.['x-forwarded-host'] || req?.get?.('host') || req?.headers?.host;
  const baseUrl = host ? `${protocol}://${host}` : '';
  
  return payments.map((payment) => {
    let publicUrl = null;
    if (payment.has_screenshot || payment.screenshot_url || payment.payment_proof || payment.screenshot_path) {
      publicUrl = baseUrl ? `${baseUrl}/api/maintenance/payments/${payment.id}/screenshot` : `/api/maintenance/payments/${payment.id}/screenshot`;
    }
    const safePayment = { ...payment };
    delete safePayment.payment_proof;
    delete safePayment.paymentProof;
    return {
      ...safePayment,
      screenshot_url: publicUrl,
      screenshot: publicUrl,
      screenshot_path: publicUrl
    };
  });
};

const getPaymentScreenshot = async (req, res) => {
  try {
    const { id } = req.params;
    const [rows] = await promisePool.query('SELECT payment_proof, screenshot_url FROM payments WHERE id = ?', [id]);
    if (rows.length === 0) return res.status(404).send('Payment not found');
    
    const payment = rows[0];
    const sendDataImage = (value) => {
      if (!value || !String(value).startsWith('data:image/')) return false;
      const match = String(value).match(/^data:(image\/(?:png|jpeg|jpg|webp|gif));base64,(.+)$/);
      if (match) {
        res.setHeader('Content-Type', match[1]);
        res.send(Buffer.from(match[2], 'base64'));
        return true;
      }
      return false;
    };

    if (sendDataImage(payment.payment_proof) || sendDataImage(payment.screenshot_url)) return;
    
    if (payment.screenshot_url) {
      const uploadRoot = path.resolve(__dirname, '..');
      const rawUrl = String(payment.screenshot_url).trim();
      if (/^https?:\/\//i.test(rawUrl)) {
        const currentPath = `/api/maintenance/payments/${id}/screenshot`;
        try {
          const parsed = new URL(rawUrl);
          if (parsed.pathname !== currentPath) return res.redirect(rawUrl);
        } catch (_) {
          return res.status(400).send('Invalid screenshot URL');
        }
      }

      const cleanPath = rawUrl.replace(/\\/g, '/').replace(/^\/+/, '');
      const filePath = path.resolve(uploadRoot, cleanPath);
      if (!filePath.startsWith(uploadRoot)) return res.status(400).send('Invalid screenshot path');
      if (fs.existsSync(filePath)) {
        return res.sendFile(filePath);
      }
    }
    
    return res.status(404).send('Screenshot not found');
  } catch (error) {
    console.error('Error fetching screenshot:', error);
    return res.status(500).send('Error loading screenshot');
  }
};

const tableColumnCache = new Map();

const getTableColumns = async (tableName) => {
  if (tableColumnCache.has(tableName)) return tableColumnCache.get(tableName);
  const [columns] = await promisePool.query(`SHOW COLUMNS FROM ${tableName}`);
  const columnNames = new Set(columns.map((column) => column.Field || column.field || column.column_name));
  tableColumnCache.set(tableName, columnNames);
  return columnNames;
};

const hasTableColumn = async (tableName, columnName) => {
  const columns = await getTableColumns(tableName);
  return columns.has(columnName);
};

const clearTableColumnCache = () => tableColumnCache.clear();

const ensureMaintenanceRuntimeSchema = async () => {
  await promisePool.query(`
    ALTER TABLE maintenance
      ADD COLUMN IF NOT EXISTS original_amount NUMERIC(12, 2),
      ADD COLUMN IF NOT EXISTS write_off_amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
      ADD COLUMN IF NOT EXISTS remaining_due NUMERIC(12, 2),
      ADD COLUMN IF NOT EXISTS current_due NUMERIC(12, 2)
  `);
  await promisePool.query(`
    ALTER TABLE payments
      ADD COLUMN IF NOT EXISTS resident_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      ADD COLUMN IF NOT EXISTS payment_proof TEXT,
      ADD COLUMN IF NOT EXISTS verified_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
      ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ,
      ADD COLUMN IF NOT EXISTS rejection_reason TEXT,
      ADD COLUMN IF NOT EXISTS receipt_number VARCHAR(80),
      ADD COLUMN IF NOT EXISTS remarks TEXT,
      ADD COLUMN IF NOT EXISTS rejected_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
      ADD COLUMN IF NOT EXISTS rejected_at TIMESTAMPTZ,
      ADD COLUMN IF NOT EXISTS approved_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
      ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ,
      ADD COLUMN IF NOT EXISTS approval_comment TEXT
  `);
  await promisePool.query(`
    CREATE TABLE IF NOT EXISTS payment_status_history (
      id INTEGER GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
      payment_id INTEGER NOT NULL REFERENCES payments(id) ON DELETE CASCADE,
      bill_id INTEGER REFERENCES maintenance(id) ON DELETE CASCADE,
      previous_status VARCHAR(50),
      new_status VARCHAR(50) NOT NULL,
      changed_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
      changed_by_name VARCHAR(255),
      reason TEXT,
      comment TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  await promisePool.query(`
    ALTER TABLE payments DROP CONSTRAINT IF EXISTS payments_payment_status_check
  `);
  await promisePool.query(`
    ALTER TABLE payments
      ADD CONSTRAINT payments_payment_status_check
      CHECK (payment_status IN (
        'Pending', 'Under Review', 'Pending Verification', 'Needs Clarification',
        'Approved', 'Paid', 'Rejected',
        'PENDING_REVIEW', 'PENDING_VERIFICATION', 'NEEDS_CLARIFICATION', 'APPROVED', 'PAID', 'REJECTED'
      )) NOT VALID
  `);
  await promisePool.query(`
    ALTER TABLE maintenance DROP CONSTRAINT IF EXISTS maintenance_status_check
  `);
  await promisePool.query(`
    ALTER TABLE maintenance
      ADD CONSTRAINT maintenance_status_check
      CHECK (status IN (
        'Draft', 'Generated', 'Pending', 'Pending Verification', 'Needs Clarification',
        'Under Review', 'Partial', 'Partially Paid', 'Paid', 'Overdue', 'Rejected',
        'Waived', 'Written Off', 'Cancelled', 'pending', 'paid',
        'UNPAID', 'PARTIALLY_PAID', 'PAID', 'PARTIAL_WRITE_OFF', 'WRITTEN_OFF', 'SETTLED'
      )) NOT VALID
  `);
  await promisePool.query(`
    CREATE TABLE IF NOT EXISTS payment_maintenance (
      payment_id INTEGER NOT NULL REFERENCES payments(id) ON DELETE CASCADE,
      maintenance_id INTEGER NOT NULL REFERENCES maintenance(id) ON DELETE CASCADE,
      PRIMARY KEY (payment_id, maintenance_id)
    )
  `);
  await promisePool.query(`
    CREATE TABLE IF NOT EXISTS maintenance_writeoffs (
      id INTEGER GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
      bill_id INTEGER NOT NULL REFERENCES maintenance(id) ON DELETE CASCADE,
      resident_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      flat_id INTEGER REFERENCES flats(id) ON DELETE SET NULL,
      admin_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      admin_name VARCHAR(255),
      writeoff_type VARCHAR(20) NOT NULL CHECK (writeoff_type IN ('PARTIAL', 'TOTAL')),
      amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
      previous_due NUMERIC(12, 2) NOT NULL DEFAULT 0,
      final_due NUMERIC(12, 2) NOT NULL DEFAULT 0,
      reason VARCHAR(80) NOT NULL CHECK (reason IN ('Billing Error', 'Financial Assistance', 'Society Decision', 'Management Approval', 'Special Approval', 'Other')),
      remarks TEXT,
      ip_address VARCHAR(80),
      device_info TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  await promisePool.query(`
    ALTER TABLE maintenance_writeoffs
      ADD COLUMN IF NOT EXISTS bill_id INTEGER REFERENCES maintenance(id) ON DELETE CASCADE,
      ADD COLUMN IF NOT EXISTS resident_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      ADD COLUMN IF NOT EXISTS flat_id INTEGER REFERENCES flats(id) ON DELETE SET NULL,
      ADD COLUMN IF NOT EXISTS admin_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      ADD COLUMN IF NOT EXISTS admin_name VARCHAR(255),
      ADD COLUMN IF NOT EXISTS writeoff_type VARCHAR(20),
      ADD COLUMN IF NOT EXISTS amount NUMERIC(12, 2),
      ADD COLUMN IF NOT EXISTS previous_due NUMERIC(12, 2) NOT NULL DEFAULT 0,
      ADD COLUMN IF NOT EXISTS final_due NUMERIC(12, 2) NOT NULL DEFAULT 0,
      ADD COLUMN IF NOT EXISTS reason VARCHAR(80),
      ADD COLUMN IF NOT EXISTS remarks TEXT,
      ADD COLUMN IF NOT EXISTS ip_address VARCHAR(80),
      ADD COLUMN IF NOT EXISTS device_info TEXT,
      ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  `);
  await promisePool.query(`
    ALTER TABLE maintenance_writeoffs DROP CONSTRAINT IF EXISTS maintenance_writeoffs_writeoff_type_check
  `);
  await promisePool.query(`
    ALTER TABLE maintenance_writeoffs
      ADD CONSTRAINT maintenance_writeoffs_writeoff_type_check
      CHECK (writeoff_type IN ('PARTIAL', 'TOTAL')) NOT VALID
  `);
  await promisePool.query(`
    ALTER TABLE maintenance_writeoffs DROP CONSTRAINT IF EXISTS maintenance_writeoffs_reason_check
  `);
  await promisePool.query(`
    ALTER TABLE maintenance_writeoffs
      ADD CONSTRAINT maintenance_writeoffs_reason_check
      CHECK (reason IN ('Billing Error', 'Financial Assistance', 'Society Decision', 'Management Approval', 'Special Approval', 'Other')) NOT VALID
  `);
  await promisePool.query(`
    CREATE TABLE IF NOT EXISTS maintenance_audit_logs (
      id INTEGER GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
      user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      action VARCHAR(60) NOT NULL,
      entity_type VARCHAR(60) NOT NULL,
      entity_id INTEGER,
      details JSONB,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  await promisePool.query(`
    INSERT INTO payment_maintenance (payment_id, maintenance_id)
    SELECT p.id, p.bill_id
    FROM payments p
    WHERE p.bill_id IS NOT NULL
    ON CONFLICT (payment_id, maintenance_id) DO NOTHING
  `);
  await promisePool.query(`CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(payment_status)`);
  await promisePool.query(`CREATE INDEX IF NOT EXISTS idx_payments_bill_id ON payments(bill_id)`);
  await promisePool.query(`CREATE INDEX IF NOT EXISTS idx_payment_maintenance_payment_id ON payment_maintenance(payment_id)`);
  await promisePool.query(`CREATE INDEX IF NOT EXISTS idx_payment_maintenance_maintenance_id ON payment_maintenance(maintenance_id)`);
  await promisePool.query(`CREATE INDEX IF NOT EXISTS idx_maintenance_writeoffs_bill_id ON maintenance_writeoffs(bill_id)`);
  await promisePool.query(`CREATE INDEX IF NOT EXISTS idx_maintenance_writeoffs_resident_id ON maintenance_writeoffs(resident_id)`);
  clearTableColumnCache();
};

const toMoney = (value, fallback = 0) => {
  if (value === null || value === undefined || String(value).trim() === '') return fallback;
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
};

const processWriteOffTransaction = async (
  billId,
  writeoffType,
  amount,
  maintenanceAmount,
  penaltyAmount,
  reason,
  remarks,
  user,
  ip,
  device
) => {
  const connection = await promisePool.getConnection();
  let postCommitAudit = null;
  let postCommitNotificationResidentId = null;
  try {
    await connection.beginTransaction();

    // Lock the bill row to prevent concurrent updates (PostgreSQL / MySQL safe)
    await connection.query('SELECT id FROM maintenance WHERE id = ? FOR UPDATE', [billId]);

    // Fetch the bill details with outer joins (no FOR UPDATE here to avoid outer join nullable-side locking issues on Postgres)
    const [bills] = await connection.query(
      `SELECT m.*, u.name AS resident_name, f.flat_no
       FROM maintenance m
       LEFT JOIN users u ON u.id = m.resident_id
       LEFT JOIN flats f ON f.id = m.flat_id
       WHERE m.id = ?`,
      [billId]
    );

    if (!bills.length) {
      await connection.rollback();
      return { success: false, code: 404, message: 'Maintenance bill not found' };
    }

    const bill = bills[0];

    if (['Paid', 'PAID', 'SETTLED', 'WRITTEN_OFF', 'Cancelled'].includes(bill.status)) {
      await connection.rollback();
      return { success: false, code: 400, message: 'This bill is already settled or cannot be written off' };
    }

    const total = toMoney(bill.total_amount || bill.amount);
    const paid = toMoney(bill.paid_amount);
    const currentMaintWriteOff = toMoney(bill.maintenance_write_off_amount || bill.maintenance_writeoff_amount);
    const currentPenaltyWriteOff = toMoney(bill.penalty_write_off_amount || bill.penalty_writeoff_amount);
    const existingWriteOff = toMoney(bill.write_off_amount);
    const remaining = Math.max(0, total - paid - existingWriteOff);

    if (remaining <= 0) {
      await connection.rollback();
      return { success: false, code: 400, message: 'Bill is already fully paid or written off' };
    }

    // Determine scopes and calculate maximum balances
    const maxMaintWriteOff = Math.min(Math.max(0, toMoney(bill.amount) - currentMaintWriteOff), remaining);
    const maxPenaltyWriteOff = Math.min(Math.max(0, toMoney(bill.penalty_amount || bill.late_fee) - currentPenaltyWriteOff), remaining);

    let writeOffAmt = 0;
    let maintWriteOffAmt = 0;
    let penaltyWriteOffAmt = 0;
    let detailedType = 'Full';

    const normalizedType = String(writeoffType || '').trim().toUpperCase();

    if (normalizedType === 'TOTAL' || normalizedType === 'FULL') {
      writeOffAmt = remaining;
      maintWriteOffAmt = maxMaintWriteOff;
      penaltyWriteOffAmt = Math.max(0, remaining - maintWriteOffAmt);
      detailedType = 'Full';
    } else if (normalizedType === 'MAINTENANCE') {
      writeOffAmt = toMoney(amount || maintenanceAmount);
      if (writeOffAmt <= 0) {
        await connection.rollback();
        return { success: false, code: 400, message: 'Write-off amount must be greater than zero' };
      }
      if (writeOffAmt > maxMaintWriteOff) {
        await connection.rollback();
        return { success: false, code: 400, message: `Write-off amount exceeds remaining maintenance balance of ${maxMaintWriteOff}` };
      }
      if (writeOffAmt > remaining) {
        await connection.rollback();
        return { success: false, code: 400, message: `Write-off amount exceeds remaining bill balance of ${remaining}` };
      }
      maintWriteOffAmt = writeOffAmt;
      penaltyWriteOffAmt = 0;
      detailedType = 'Maintenance';
    } else if (normalizedType === 'PENALTY') {
      writeOffAmt = toMoney(amount || penaltyAmount);
      if (writeOffAmt <= 0) {
        await connection.rollback();
        return { success: false, code: 400, message: 'Write-off amount must be greater than zero' };
      }
      if (writeOffAmt > maxPenaltyWriteOff) {
        await connection.rollback();
        return { success: false, code: 400, message: `Write-off amount exceeds remaining penalty balance of ${maxPenaltyWriteOff}` };
      }
      if (writeOffAmt > remaining) {
        await connection.rollback();
        return { success: false, code: 400, message: `Write-off amount exceeds remaining bill balance of ${remaining}` };
      }
      maintWriteOffAmt = 0;
      penaltyWriteOffAmt = writeOffAmt;
      detailedType = 'Penalty';
    } else if (normalizedType === 'PARTIAL' || normalizedType === 'BOTH') {
      const maintInput = toMoney(maintenanceAmount);
      const penaltyInput = toMoney(penaltyAmount);
      
      if (maintInput > 0 || penaltyInput > 0) {
        // Granular partial write-off
        maintWriteOffAmt = maintInput;
        penaltyWriteOffAmt = penaltyInput;
        writeOffAmt = maintWriteOffAmt + penaltyWriteOffAmt;
      } else {
        // Legacy partial write-off
        writeOffAmt = toMoney(amount);
        maintWriteOffAmt = Math.min(maxMaintWriteOff, writeOffAmt);
        penaltyWriteOffAmt = Math.max(0, writeOffAmt - maintWriteOffAmt);
      }

      if (writeOffAmt <= 0) {
        await connection.rollback();
        return { success: false, code: 400, message: 'Write-off amount must be greater than zero' };
      }
      if (maintWriteOffAmt > maxMaintWriteOff) {
        await connection.rollback();
        return { success: false, code: 400, message: `Maintenance write-off amount exceeds remaining maintenance balance of ${maxMaintWriteOff}` };
      }
      if (penaltyWriteOffAmt > maxPenaltyWriteOff) {
        await connection.rollback();
        return { success: false, code: 400, message: `Penalty write-off amount exceeds remaining penalty balance of ${maxPenaltyWriteOff}` };
      }
      if (writeOffAmt > remaining) {
        await connection.rollback();
        return { success: false, code: 400, message: `Total write-off cannot exceed bill remaining amount of ${remaining}` };
      }

      if (maintWriteOffAmt > 0 && penaltyWriteOffAmt === 0) {
        detailedType = 'Maintenance';
      } else if (penaltyWriteOffAmt > 0 && maintWriteOffAmt === 0) {
        detailedType = 'Penalty';
      } else {
        detailedType = 'Full';
      }
    } else {
      await connection.rollback();
      return { success: false, code: 400, message: 'Write-off type must be PARTIAL, TOTAL, MAINTENANCE, PENALTY, or BOTH' };
    }

    const finalDue = Math.max(0, remaining - writeOffAmt);
    const newWriteOffTotal = existingWriteOff + writeOffAmt;
    const newMaintWriteOffTotal = currentMaintWriteOff + maintWriteOffAmt;
    const newPenaltyWriteOffTotal = currentPenaltyWriteOff + penaltyWriteOffAmt;

    let newStatus = 'Pending';
    if (finalDue <= 0) {
      newStatus = paid > 0 ? 'PAID' : 'WRITTEN_OFF';
    } else {
      newStatus = paid > 0 ? 'PARTIALLY_PAID' : 'PARTIAL_WRITE_OFF';
    }

    let writeOffStatus = 'Partially Written Off';
    if (finalDue <= 0) {
      writeOffStatus = 'Fully Written Off';
    } else if (newMaintWriteOffTotal > 0 && newPenaltyWriteOffTotal === 0) {
      writeOffStatus = 'Maintenance Written Off';
    } else if (newPenaltyWriteOffTotal > 0 && newMaintWriteOffTotal === 0) {
      writeOffStatus = 'Penalty Written Off';
    }

    const adminName = user?.name || user?.email || 'Admin';
    const adminId = user?.id && Number.isInteger(Number(user.id)) ? Number(user.id) : null;

    // Check duplicate logic for safety
    const [duplicateRows] = await connection.query(
      `SELECT id FROM maintenance_writeoffs
       WHERE bill_id = ? AND writeoff_type = ? AND amount = ? AND reason = ?
       LIMIT 1`,
      [bill.id, normalizedType === 'TOTAL' || normalizedType === 'FULL' ? 'TOTAL' : 'PARTIAL', writeOffAmt, reason]
    );
    if (duplicateRows.length) {
      await connection.rollback();
      return { success: false, code: 409, message: 'Duplicate write-off request already exists for this bill' };
    }

    // Insert to legacy table
    const legacyType = finalDue <= 0 ? 'TOTAL' : 'PARTIAL';
    const [insertedLegacy] = await connection.query(
      `INSERT INTO maintenance_writeoffs
       (bill_id, resident_id, flat_id, admin_id, admin_name, writeoff_type, amount, previous_due, final_due, reason, remarks, ip_address, device_info)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [bill.id, bill.resident_id, bill.flat_id, adminId, adminName, legacyType, writeOffAmt, remaining, finalDue, reason, remarks, ip, device]
    );
    const writeOffId = insertedLegacy.insertId || insertedLegacy.id;

    // Insert to new table
    await connection.query(
      `INSERT INTO write_offs (bill_id, type, amount, maintenance_write_off_amount, penalty_write_off_amount, reason, admin_id, admin_name)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [bill.id, detailedType, writeOffAmt, maintWriteOffAmt, penaltyWriteOffAmt, reason, adminId, adminName]
    );

    // Update maintenance bill
    await connection.query(
      `UPDATE maintenance
       SET original_amount = COALESCE(original_amount, amount, total_amount, 0),
           write_off_amount = ?,
           maintenance_write_off_amount = ?,
           penalty_write_off_amount = ?,
           remaining_amount = ?,
           remaining_due = ?,
           current_due = ?,
           status = ?,
           write_off_status = ?,
           updated_at = NOW()
       WHERE id = ?`,
      [newWriteOffTotal, newMaintWriteOffTotal, newPenaltyWriteOffTotal, finalDue, finalDue, finalDue, newStatus, writeOffStatus, bill.id]
    );

    postCommitAudit = {
      adminId,
      writeOffId,
      details: {
        writeOffId,
        billId: bill.id,
        residentId: bill.resident_id,
        residentName: bill.resident_name,
        flatNo: bill.flat_no,
        type: detailedType,
        amount: writeOffAmt,
        maintenanceWriteOffAmount: maintWriteOffAmt,
        penaltyWriteOffAmount: penaltyWriteOffAmt,
        previousDue: remaining,
        finalDue,
        reason,
        remarks,
        adminName,
        dateTime: new Date().toISOString()
      }
    };
    postCommitNotificationResidentId = bill.resident_id || null;

    await connection.commit();

    if (postCommitAudit) {
      promisePool.query(
        `INSERT INTO maintenance_audit_logs (user_id, action, entity_type, entity_id, details)
         VALUES (?, 'CREATE_WRITE_OFF', 'WRITE_OFF', ?, ?)`,
        [postCommitAudit.adminId, postCommitAudit.writeOffId, JSON.stringify(postCommitAudit.details)]
      ).catch((auditError) => console.error('Write-off audit failed:', auditError));
    }

    if (postCommitNotificationResidentId) {
      promisePool.query(
        `INSERT INTO notifications (resident_id, title, message, type, is_read, created_at)
         VALUES (?, ?, ?, 'maintenance', false, NOW())`,
        [
          postCommitNotificationResidentId,
          'Bill Status Updated',
          `Your maintenance bill "${bill.title}" status has been updated to ${newStatus}.`,
        ]
      ).catch((notificationError) => console.error('Write-off notification failed:', notificationError));
    }

    return {
      success: true,
      code: 201,
      data: {
        id: writeOffId,
        billId: bill.id,
        writeoffType: legacyType,
        amount: writeOffAmt,
        previousDue: remaining,
        finalDue,
        status: newStatus
      }
    };

  } catch (error) {
    try { await connection.rollback(); } catch (_) {}
    throw error;
  } finally {
    connection.release();
  }
};


const writeOffSafeStatus = (bill, remainingDue) => {
  if (remainingDue <= 0) {
    return toMoney(bill.paid_amount) > 0 ? 'SETTLED' : 'WRITTEN_OFF';
  }
  return 'PARTIAL_WRITE_OFF';
};

const markMaintenanceBillPaid = async (db, billId, paidAt = new Date()) => {
  const maintenanceHasPaymentDate = await hasTableColumn('maintenance', 'payment_date');
  const maintenanceHasUpdatedAt = await hasTableColumn('maintenance', 'updated_at');

  const [paymentAgg] = await db.query(
    `SELECT COALESCE(SUM(amount), 0) AS total_approved
     FROM payments
     WHERE bill_id = ? AND (UPPER(payment_status) = 'APPROVED' OR UPPER(payment_status) = 'PAID')`,
    [billId]
  );

  const [billRows] = await db.query('SELECT total_amount, amount, write_off_amount FROM maintenance WHERE id = ?', [billId]);
  const bill = billRows[0] || {};
  const totalAmt = Number(bill.total_amount || bill.amount || 0);
  const writeOffAmt = Number(bill.write_off_amount || 0);

  let actualPaid = Number(paymentAgg[0]?.total_approved || 0);
  if (actualPaid <= 0) {
    actualPaid = Math.max(0, totalAmt - writeOffAmt);
  }
  const remaining = Math.max(0, totalAmt - actualPaid - writeOffAmt);
  const status = remaining <= 0 ? 'Paid' : 'Partial';

  const setParts = [
    'status = ?',
    'paid_amount = ?',
    'remaining_amount = ?',
    'remaining_due = ?',
    'current_due = ?'
  ];
  const values = [status, actualPaid, remaining, remaining, remaining];

  if (maintenanceHasPaymentDate) {
    setParts.push('payment_date = ?');
    values.push(paidAt || new Date());
  }
  if (maintenanceHasUpdatedAt) setParts.push('updated_at = NOW()');
  values.push(billId);

  const [result] = await db.query(
    `UPDATE maintenance SET ${setParts.join(', ')} WHERE id = ?`,
    values
  );
  return result;
};

const allocateResidentPayment = async (db, residentId, selectedBill, paidAmount, paidAt = new Date()) => {
  const selectedCycle = Number(selectedBill.year || 0) * 12 + Number(selectedBill.month || 0);
  const [openBills] = await db.query(
    `SELECT *
     FROM maintenance
     WHERE resident_id = ?
       AND status != 'Paid'
       AND (year * 12 + month) <= ?
     ORDER BY year ASC, month ASC, due_date ASC, id ASC`,
    [residentId, selectedCycle]
  );

  let remainingPayment = Number(paidAmount || 0);
  const paidBillIds = [];

  for (const bill of openBills) {
    const billDue = Number(bill.remaining_amount || bill.total_amount || bill.amount || 0);
    if (billDue <= 0) {
      await markMaintenanceBillPaid(db, bill.id, paidAt);
      paidBillIds.push(bill.id);
      continue;
    }
    if (remainingPayment + 0.001 < billDue) break;
    await markMaintenanceBillPaid(db, bill.id, paidAt);
    paidBillIds.push(bill.id);
    remainingPayment -= billDue;
  }

  return { paidBillIds, remainingPayment };
};

const getCoveredBillsForPayment = async (db, payment) => {
  const hasPaymentMaintenance = await hasTableColumn('payment_maintenance', 'payment_id').catch(() => false);
  if (hasPaymentMaintenance) {
    const [linkedBills] = await db.query(
      `SELECT m.*, CONCAT('BILL-', m.id) AS bill_number, f.flat_no
       FROM payment_maintenance pm
       JOIN maintenance m ON m.id = pm.maintenance_id
       LEFT JOIN flats f ON m.flat_id = f.id
       WHERE pm.payment_id = ?
       ORDER BY m.year ASC, m.month ASC, m.due_date ASC, m.id ASC`,
      [payment.id || payment.payment_id]
    );
    if (linkedBills.length) {
      return linkedBills.map((bill) => ({
        id: bill.id,
        bill_id: bill.id,
        bill_number: bill.bill_number,
        month: bill.month,
        year: bill.year,
        due_date: bill.due_date,
        amount: Number(bill.total_amount || bill.amount || 0),
        total_amount: Number(bill.total_amount || bill.amount || 0),
        paid_amount: Number(bill.paid_amount || 0),
        remaining_amount: Number(bill.remaining_amount || 0),
        status: bill.status,
        payment_status: bill.status,
        flat_no: bill.flat_no
      }));
    }
  }

  const selectedCycle = Number(payment.year || 0) * 12 + Number(payment.month || 0);
  const [candidateBills] = await db.query(
    `SELECT m.*, CONCAT('BILL-', m.id) AS bill_number, f.flat_no
     FROM maintenance m
     LEFT JOIN flats f ON m.flat_id = f.id
     WHERE m.resident_id = ?
       AND (m.year * 12 + m.month) <= ?
     ORDER BY m.year ASC, m.month ASC, m.due_date ASC, m.id ASC`,
    [payment.resident_id, selectedCycle]
  );

  let remainingPayment = Number(payment.amount || 0);
  const coveredBills = [];

  for (const bill of candidateBills) {
    const billTotal = Number(bill.total_amount || bill.amount || 0);
    const wasPaidByThisPayment = Number(bill.id) === Number(payment.bill_id) || remainingPayment + 0.001 >= billTotal;
    if (!wasPaidByThisPayment) continue;
    coveredBills.push({
      id: bill.id,
      bill_id: bill.id,
      bill_number: bill.bill_number,
      month: bill.month,
      year: bill.year,
      due_date: bill.due_date,
      amount: billTotal,
      total_amount: billTotal,
      paid_amount: Number(bill.paid_amount || 0),
      remaining_amount: Number(bill.remaining_amount || 0),
      status: bill.status,
      payment_status: bill.status,
      flat_no: bill.flat_no
    });
    remainingPayment -= billTotal;
    if (remainingPayment <= 0 && Number(bill.id) === Number(payment.bill_id)) break;
  }

  return coveredBills.length ? coveredBills : [{
    id: payment.bill_id,
    bill_id: payment.bill_id,
    bill_number: payment.bill_number,
    month: payment.month,
    year: payment.year,
    due_date: payment.due_date,
    amount: Number(payment.total_amount || payment.amount || 0),
    total_amount: Number(payment.total_amount || payment.amount || 0),
    paid_amount: Number(payment.total_amount || payment.amount || 0),
    remaining_amount: 0,
    status: payment.payment_status,
    payment_status: payment.payment_status,
    flat_no: payment.flat_no
  }];
};

const withCoveredPaymentBills = async (db, payments = []) => {
  return Promise.all(
    payments.map(async (payment) => {
      const covered_bills = await getCoveredBillsForPayment(db, payment);
      return { ...payment, covered_bills };
    })
  );
};

const reconcilePaidPayments = async () => ({ updatedBills: 0 });

const reconcileLegacyPaidPayments = async (db = promisePool, residentId = null) => {
  const params = [];
  const residentFilter = residentId ? 'AND m.resident_id = ?' : '';
  if (residentId) params.push(residentId);

  const [payments] = await db.query(
    `SELECT p.id AS payment_id, p.bill_id, p.amount AS payment_amount, p.payment_status, p.paid_at,
            m.id AS selected_bill_id, m.resident_id, m.year, m.month, m.total_amount, m.amount AS bill_amount,
            m.status AS bill_status
     FROM payments p
     JOIN maintenance m ON m.id = p.bill_id
     WHERE p.payment_status IN ('Paid', 'Pending Verification', 'Under Review')
       ${residentFilter}
     ORDER BY p.paid_at ASC, p.created_at ASC, p.id ASC`,
    params
  );

  if (!payments.length) return { updatedBills: 0 };

  const paymentsHasUpdatedAt = await hasTableColumn('payments', 'updated_at');
  let updatedBills = 0;

  for (const payment of payments) {
    const paidAt = payment.paid_at || new Date();
    const selectedBillTotal = Number(payment.total_amount || payment.bill_amount || 0);
    let allocatableAmount = Number(payment.payment_amount || 0);

    if (!Number.isFinite(allocatableAmount) || allocatableAmount <= 0) continue;

    if (payment.payment_status !== 'Paid') {
      await db.query(
        `UPDATE payments SET payment_status = 'Paid'${paymentsHasUpdatedAt ? ', updated_at = NOW()' : ''} WHERE id = ?`,
        [payment.payment_id]
      );
    }

    if (payment.bill_status === 'Paid') {
      allocatableAmount = Math.max(0, allocatableAmount - selectedBillTotal);
    }

    const allocation = await allocateResidentPayment(db, payment.resident_id, payment, allocatableAmount, paidAt);
    updatedBills += allocation.paidBillIds.length;
  }

  return { updatedBills };
};

const calculateLateFee = (dueDate) => {
  if (!dueDate) return 0;
  const due = new Date(dueDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (due < today) return LATE_FEE;
  return 0;
};

// Helper: Apply penalty logic dynamically for all unpaid records
const applyPenaltyLogic = async () => {
  try {
    const [settingsRows] = await promisePool.query('SELECT * FROM maintenance_settings ORDER BY id DESC LIMIT 1');
    if (settingsRows.length === 0) return; // No settings defined yet

    const settings = settingsRows[0];
    const graceDays = Number(settings.grace_days || 0);

    const [bills] = await promisePool.query("SELECT * FROM maintenance WHERE status NOT IN ('Paid', 'PAID', 'SETTLED', 'WRITTEN_OFF', 'Pending Verification', 'Under Review')");
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (const bill of bills) {
      // Fetch sum of items
      const [itemRows] = await promisePool.query(
        'SELECT COALESCE(SUM(amount), 0) AS items_sum FROM maintenance_bill_items WHERE bill_id = ?',
        [bill.id]
      );
      const itemsSum = Number(itemRows[0]?.items_sum || 0);

      const dueDate = new Date(bill.due_date);
      const cutoffDate = new Date(dueDate);
      cutoffDate.setDate(cutoffDate.getDate() + graceDays);

      if (today > cutoffDate) {
        let penalty = 0;
        if (settings.late_fee_type === 'fixed') {
          penalty = Number(settings.late_fee_value);
        } else if (settings.late_fee_type === 'percentage') {
          penalty = Number(bill.amount) * (Number(settings.late_fee_value) / 100);
        }

        const newPenaltyAmount = penalty;
        const newTotalAmount = Number(bill.amount) + newPenaltyAmount + itemsSum;
        const newRemainingAmount = Math.max(0, newTotalAmount - Number(bill.paid_amount || 0) - Number(bill.write_off_amount || 0));
        let status = 'Overdue';
        if (newRemainingAmount <= 0) {
          status = 'Paid';
        } else if (Number(bill.paid_amount) > 0) {
          status = 'Partial';
        }

        await promisePool.query(
          `UPDATE maintenance
           SET penalty_amount = ?, total_amount = ?, remaining_amount = ?, status = ?, updated_at = NOW()
           WHERE id = ?`,
          [newPenaltyAmount, newTotalAmount, newRemainingAmount, status, bill.id]
        );
      } else {
        // Not past grace period, but check if past due date to mark as Overdue (without penalty yet)
        if (dueDate < today) {
          const totalAmt = Number(bill.amount) + Number(bill.penalty_amount) + itemsSum;
          const remaining = Math.max(0, totalAmt - Number(bill.paid_amount || 0) - Number(bill.write_off_amount || 0));
          let status = 'Overdue';
          if (remaining <= 0) {
            status = 'Paid';
          } else if (Number(bill.paid_amount) > 0) {
            status = 'Partial';
          }
          await promisePool.query(
            `UPDATE maintenance SET status = ?, total_amount = ?, remaining_amount = ? WHERE id = ?`,
            [status, totalAmt, remaining, bill.id]
          );
        } else {
          // If not past due date, double check if it is Partial or Pending
          const totalAmt = Number(bill.amount) + Number(bill.penalty_amount) + itemsSum;
          const remaining = Math.max(0, totalAmt - Number(bill.paid_amount || 0) - Number(bill.write_off_amount || 0));
          let status = remaining <= 0 ? 'Paid' : (Number(bill.paid_amount) > 0 ? 'Partial' : 'Pending');
          await promisePool.query(
            `UPDATE maintenance SET status = ?, total_amount = ?, remaining_amount = ? WHERE id = ?`,
            [status, totalAmt, remaining, bill.id]
          );
        }
      }
    }
  } catch (error) {
    if (error.code === '42P01') return;
    console.error('Error applying penalty logic:', error);
  }
};

// GET /api/maintenance/settings
const getSettings = async (req, res) => {
  try {
    const [rows] = await promisePool.query('SELECT * FROM maintenance_settings ORDER BY id DESC LIMIT 1');
    return sendResponse(res, 200, 'Settings fetched successfully', rows[0] || null);
  } catch (error) {
    console.error('Get settings error:', error);
    return sendResponse(res, 500, 'Server error');
  }
};

// POST /api/maintenance/settings
const saveSettings = async (req, res) => {
  try {
    const { title, fixed_amount, due_day, late_fee_type, late_fee_value, grace_days } = req.body;
    if (!title || fixed_amount === undefined || !due_day || !late_fee_type || late_fee_value === undefined) {
      return sendResponse(res, 400, 'All settings fields are required');
    }

    const [existing] = await promisePool.query('SELECT id FROM maintenance_settings LIMIT 1');
    if (existing.length > 0) {
      await promisePool.query(
        `UPDATE maintenance_settings 
         SET title = ?, fixed_amount = ?, due_day = ?, late_fee_type = ?, late_fee_value = ?, grace_days = ?
         WHERE id = ?`,
        [title, fixed_amount, due_day, late_fee_type, late_fee_value, grace_days || 0, existing[0].id]
      );
      return sendResponse(res, 200, 'Settings updated successfully');
    } else {
      await promisePool.query(
        `INSERT INTO maintenance_settings (title, fixed_amount, due_day, late_fee_type, late_fee_value, grace_days)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [title, fixed_amount, due_day, late_fee_type, late_fee_value, grace_days || 0]
      );
      return sendResponse(res, 201, 'Settings saved successfully');
    }
  } catch (error) {
    console.error('Save settings error:', error);
    return sendResponse(res, 500, 'Server error');
  }
};

// POST /api/maintenance/apply-penalty
const applyPenalty = async (req, res) => {
  try {
    await applyPenaltyLogic();
    return sendResponse(res, 200, 'Penalties applied successfully');
  } catch (error) {
    console.error('Apply penalty error:', error);
    return sendResponse(res, 500, 'Server error');
  }
};

// GET /api/maintenance
const getAllMaintenance = async (req, res) => {
  try {
    await applyPenaltyLogic();
    const [maintenance] = await promisePool.query(`
      SELECT m.*, u.name AS resident_name, u.name AS owner_name, f.flat_no, f.floor_no,
             ft.name AS flat_type_name
      FROM maintenance m
      LEFT JOIN users u ON m.resident_id = u.id
      LEFT JOIN flats f ON m.flat_id = f.id
      LEFT JOIN flat_types ft ON m.flat_type_id = ft.id
      ORDER BY m.year DESC, m.month DESC, m.id DESC
    `);
    return sendResponse(res, 200, 'Maintenance records fetched successfully', maintenance);
  } catch (error) {
    console.error('Get maintenance error:', error);
    return sendResponse(res, 500, 'Server error', null, ['Unable to fetch maintenance records']);
  }
};

const getMaintenanceById = async (req, res) => {
  try {
    const { id } = req.params;
    const [maintenance] = await promisePool.query(
      `SELECT m.*, u.name AS resident_name, u.name AS owner_name, f.flat_no, f.floor_no,
              ft.name AS flat_type_name
       FROM maintenance m
       LEFT JOIN users u ON m.resident_id = u.id
       LEFT JOIN flats f ON m.flat_id = f.id
       LEFT JOIN flat_types ft ON f.flat_type_id = ft.id
       WHERE m.id = ?`,
      [id]
    );

    if (maintenance.length === 0) {
      return sendResponse(res, 404, 'Maintenance record not found');
    }

    return sendResponse(res, 200, 'Maintenance record fetched successfully', maintenance[0]);
  } catch (error) {
    console.error('Get maintenance error:', error);
    return sendResponse(res, 500, 'Server error', null, ['Unable to fetch maintenance record']);
  }
};

const createLegacyWriteOff = async (req, res) => {
  const url = `${req.baseUrl || ''}${req.path}`;
  const method = req.method;
  console.log(`[WRITE-OFF DEBUG] Route: ${method} ${url}`);
  console.log('[WRITE-OFF DEBUG] Request Body:', JSON.stringify(req.body));

  try {
    const { billId } = req.params;
    const writeoffType = String(req.body.writeoffType || req.body.writeoff_type || '').trim().toUpperCase();
    const rawReason = String(req.body.reason || '').trim();
    const reason = rawReason === 'Special Approval' ? 'Management Approval' : rawReason;
    const remarks = req.body.remarks ? String(req.body.remarks).trim() : null;
    
    // Split values from request body
    const amount = req.body.amount;
    const maintenanceAmount = req.body.maintenanceAmount || req.body.maintenance_amount;
    const penaltyAmount = req.body.penaltyAmount || req.body.penalty_amount;

    const result = await processWriteOffTransaction(
      billId,
      writeoffType,
      amount,
      maintenanceAmount,
      penaltyAmount,
      reason,
      remarks,
      req.user,
      req.ip || req.headers['x-forwarded-for'] || null,
      req.headers['user-agent'] || null
    );

    if (!result.success) {
      console.log(`[WRITE-OFF DEBUG] Error Response: status=${result.code}, message=${result.message}`);
      return sendResponse(res, result.code, result.message);
    }

    console.log('[WRITE-OFF DEBUG] Success Response:', JSON.stringify(result.data));
    return sendResponse(res, 201, 'Write-off completed successfully', result.data);

  } catch (error) {
    console.error('[WRITE-OFF DEBUG] PostgreSQL / Transaction Error:', error);
    console.error('[WRITE-OFF DEBUG] Error Code:', error.code, 'Error Message:', error.message);
    return sendResponse(res, 500, error.message || 'Unable to complete write-off', null, [error.code || 'Transaction failed']);
  }
};

const getWriteOffs = async (req, res) => {
  try {
    const [rows] = await promisePool.query(
      `SELECT w.*, COALESCE(m.bill_number, CONCAT('BILL-', m.id)) AS bill_number,
              u.name AS resident_name, f.flat_no, m.month, m.year, m.status
       FROM maintenance_writeoffs w
       LEFT JOIN maintenance m ON m.id = w.bill_id
       LEFT JOIN users u ON u.id = w.resident_id
       LEFT JOIN flats f ON f.id = w.flat_id
       ORDER BY w.created_at DESC`
    );
    return sendResponse(res, 200, 'Write-offs fetched successfully', rows);
  } catch (error) {
    console.error('Get write-offs error:', error);
    return sendResponse(res, 500, 'Unable to fetch write-offs');
  }
};

const getWriteOffDashboard = async (req, res) => {
  try {
    const [[summary]] = await promisePool.query(
      `SELECT
         COUNT(*) AS total_writeoffs,
         COALESCE(SUM(amount), 0) AS total_writeoff_amount,
         COUNT(*) FILTER (WHERE writeoff_type = 'PARTIAL') AS partial_writeoffs,
         COUNT(*) FILTER (WHERE created_at::date = CURRENT_DATE) AS today_writeoffs,
         COALESCE(SUM(amount) FILTER (WHERE created_at::date = CURRENT_DATE), 0) AS today_writeoff_amount,
         COALESCE(SUM(amount) FILTER (WHERE DATE_TRUNC('month', created_at) = DATE_TRUNC('month', CURRENT_DATE)), 0) AS monthly_writeoffs,
         COALESCE(SUM(amount) FILTER (WHERE DATE_TRUNC('year', created_at) = DATE_TRUNC('year', CURRENT_DATE)), 0) AS yearly_writeoffs
       FROM maintenance_writeoffs`
    );
    return sendResponse(res, 200, 'Write-off dashboard fetched successfully', summary || {});
  } catch (error) {
    console.error('Write-off dashboard error:', error);
    return sendResponse(res, 500, 'Unable to fetch write-off dashboard');
  }
};

const getWriteOffReport = async (req, res) => {
  try {
    const [rows] = await promisePool.query(
      `SELECT COALESCE(m.bill_number, CONCAT('BILL-', m.id)) AS bill_number,
              u.name AS resident_name, f.flat_no,
              COALESCE(m.original_amount, m.amount, m.total_amount, 0) AS original_amount,
              COALESCE(m.penalty_amount, 0) AS penalty,
              COALESCE(m.paid_amount, 0) AS collected_amount,
              COALESCE(m.write_off_amount, 0) AS write_off_amount,
              COALESCE(m.remaining_due, m.current_due, m.remaining_amount, 0) AS remaining,
              m.status
       FROM maintenance m
       LEFT JOIN users u ON u.id = m.resident_id
       LEFT JOIN flats f ON f.id = m.flat_id
       ORDER BY m.year DESC, m.month DESC, m.id DESC`
    );
    return sendResponse(res, 200, 'Write-off report fetched successfully', {
      rows,
      totals: rows.reduce((acc, row) => {
        acc.totalGenerated += toMoney(row.original_amount) + toMoney(row.penalty);
        acc.totalCollected += toMoney(row.collected_amount);
        acc.totalWrittenOff += toMoney(row.write_off_amount);
        acc.totalPending += toMoney(row.remaining);
        return acc;
      }, { totalGenerated: 0, totalCollected: 0, totalWrittenOff: 0, totalPending: 0 })
    });
  } catch (error) {
    console.error('Write-off report error:', error);
    return sendResponse(res, 500, 'Unable to fetch write-off report');
  }
};

const createMaintenance = async (req, res) => {
  try {
    const { title, month, year, dueDate, amount, residentId, flatId } = req.body;
    const reqMonth = Number(month);
    const reqYear = Number(year);
    if (!title || !Number.isInteger(reqMonth) || reqMonth < 1 || reqMonth > 12 || !Number.isInteger(reqYear) || reqYear < 2000) {
      return sendResponse(res, 400, 'Title, valid billing month and year are required');
    }
    if (!residentId || !flatId) return sendResponse(res, 400, 'Resident and flat are required for a bill');
    const [assignmentRows] = await promisePool.query(
      `SELECT u.id AS resident_id, f.id AS flat_id, f.status, f.current_resident_id, f.flat_type_id,
              ft.default_maintenance_amount
       FROM users u JOIN flats f ON f.id = ?
       LEFT JOIN flat_types ft ON ft.id = f.flat_type_id
       WHERE u.id = ? AND u.role = 'resident' AND u.status = 'approved'`,
      [flatId, residentId]
    );
    if (!assignmentRows.length || Number(assignmentRows[0].current_resident_id) !== Number(residentId) || String(assignmentRows[0].status).toLowerCase() !== 'occupied') {
      return sendResponse(res, 400, 'Resident is not an active resident assigned to the selected occupied flat');
    }
    let flatTypeId = null;
    const defaultAmt = Number(assignmentRows[0].default_maintenance_amount || 0);
    flatTypeId = assignmentRows[0].flat_type_id || null;
    const amt = amount === undefined || amount === null || String(amount).trim() === '' ? defaultAmt : Number(amount);
    if (!Number.isFinite(amt) || amt <= 0) return sendResponse(res, 400, 'Maintenance amount must be greater than zero');
    if (dueDate && (!/^\d{4}-\d{2}-\d{2}$/.test(String(dueDate)) || Number.isNaN(Date.parse(String(dueDate))))) return sendResponse(res, 400, 'Due date must be a valid YYYY-MM-DD date');
    const [duplicates] = await promisePool.query('SELECT id FROM maintenance WHERE resident_id = ? AND flat_id = ? AND month = ? AND year = ? LIMIT 1', [residentId, flatId, reqMonth, reqYear]);
    if (duplicates.length) return sendResponse(res, 409, 'A maintenance bill already exists for this resident, flat and billing cycle');
    const isCustom = amt !== defaultAmt;

    const [result] = await promisePool.query(
      `INSERT INTO maintenance 
       (resident_id, flat_id, title, month, year, amount, penalty_amount, total_amount, paid_amount, remaining_amount, status, due_date,
        flat_type_id, default_maintenance_amount, final_maintenance_amount, is_custom_amount, custom_reason, edited_by, edited_at)
       VALUES (?, ?, ?, ?, ?, ?, 0.00, ?, 0.00, ?, 'Pending', ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
         residentId,
         flatId,
        title,
         reqMonth,
         reqYear,
        amt,
        amt,
        amt,
        dueDate,
        flatTypeId,
        defaultAmt,
        amt,
        isCustom,
        isCustom ? (req.body.custom_reason || req.body.reason || 'Manual bill customization') : null,
        isCustom ? req.user.id : null,
        isCustom ? new Date() : null
      ]
    );
    return sendResponse(res, 201, 'Maintenance created successfully', { id: result.insertId });
  } catch (error) {
    console.error('Create maintenance error:', error);
    return sendResponse(res, 500, 'Server error', null, ['Unable to create maintenance']);
  }
};

// POST /api/maintenance/manual
const createManualBill = async (req, res) => {
  try {
    const { title, month, year, dueDate, amount, optionalCharges, residentId, flatId, notes } = req.body;
    const reqMonth = Number(month);
    const reqYear = Number(year);

    if (!Number.isInteger(reqMonth) || reqMonth < 1 || reqMonth > 12 || !Number.isInteger(reqYear) || reqYear < 2000) {
      return sendResponse(res, 400, 'Valid billing month and year are required');
    }

    if (!residentId) {
      return sendResponse(res, 400, 'Resident selection is required');
    }

    let targetResidentId = Number(residentId);
    let targetFlatId = flatId ? Number(flatId) : null;

    const [userRows] = await promisePool.query(
      `SELECT u.id AS resident_id, u.name AS resident_name, f.id AS flat_id, f.flat_no, f.status AS flat_status, f.flat_type_id,
              ft.default_maintenance_amount
       FROM users u
       LEFT JOIN flats f ON (f.current_resident_id = u.id OR f.id = u.flat_id)
       LEFT JOIN flat_types ft ON ft.id = f.flat_type_id
       WHERE u.id = ? AND LOWER(u.role) = 'resident'`,
      [targetResidentId]
    );

    if (!userRows.length) {
      return sendResponse(res, 404, 'Selected resident was not found');
    }

    const residentInfo = userRows[0];
    if (!targetFlatId) {
      targetFlatId = residentInfo.flat_id;
    }

    if (!targetFlatId) {
      return sendResponse(res, 400, 'Selected resident has no flat assigned. Please assign a flat to the resident first.');
    }

    const [duplicates] = await promisePool.query(
      'SELECT id FROM maintenance WHERE resident_id = ? AND flat_id = ? AND month = ? AND year = ? LIMIT 1',
      [targetResidentId, targetFlatId, reqMonth, reqYear]
    );

    if (duplicates.length) {
      return sendResponse(res, 409, 'A maintenance bill already exists for this resident and billing cycle');
    }

    const defaultAmt = Number(residentInfo.default_maintenance_amount || 0);
    const baseAmt = amount !== undefined && amount !== null && String(amount).trim() !== '' 
      ? Number(amount) 
      : defaultAmt;

    if (!Number.isFinite(baseAmt) || baseAmt < 0) {
      return sendResponse(res, 400, 'Maintenance amount must be a non-negative number');
    }

    const extraAmt = optionalCharges !== undefined && optionalCharges !== null && String(optionalCharges).trim() !== ''
      ? Number(optionalCharges)
      : 0;

    if (!Number.isFinite(extraAmt) || extraAmt < 0) {
      return sendResponse(res, 400, 'Optional charges must be a non-negative number');
    }

    const totalAmt = baseAmt + extraAmt;
    if (totalAmt <= 0) {
      return sendResponse(res, 400, 'Total bill amount must be greater than zero');
    }

    let billDueDate = dueDate;
    if (!billDueDate || !/^\d{4}-\d{2}-\d{2}$/.test(String(billDueDate))) {
      const formattedMonth = String(reqMonth).padStart(2, '0');
      billDueDate = `${reqYear}-${formattedMonth}-10`;
    }

    const billTitle = title && String(title).trim() ? String(title).trim() : 'Manual Maintenance Bill';
    const isCustom = baseAmt !== defaultAmt || extraAmt > 0;

    const [result] = await promisePool.query(
      `INSERT INTO maintenance 
       (resident_id, flat_id, title, month, year, amount, penalty_amount, total_amount, paid_amount, remaining_amount, status, due_date,
        flat_type_id, default_maintenance_amount, final_maintenance_amount, is_custom_amount, custom_reason, notes, edited_by, edited_at, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0.00, ?, 'Pending', ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW(), NOW())`,
      [
        targetResidentId,
        targetFlatId,
        billTitle,
        reqMonth,
        reqYear,
        baseAmt,
        extraAmt,
        totalAmt,
        totalAmt,
        billDueDate,
        residentInfo.flat_type_id || null,
        defaultAmt,
        baseAmt,
        isCustom,
        notes || 'Manual bill creation',
        notes || null,
        req.user?.id || null
      ]
    );

    return sendResponse(res, 201, 'Manual maintenance bill created successfully', { id: result.insertId || result.id });
  } catch (error) {
    console.error('Create manual maintenance error:', error);
    return sendResponse(res, 500, 'Server error', null, [error.message || 'Unable to create manual bill']);
  }
};

// POST /api/maintenance/generate
const generateMaintenanceBills = async (req, res) => {
  const connection = await promisePool.getConnection();
  try {
    const body = req.body || {};
    const reqMonth = Number(body.month);
    const reqYear = Number(body.year);
    if (!Number.isInteger(reqMonth) || reqMonth < 1 || reqMonth > 12 || !Number.isInteger(reqYear) || reqYear < 2000) {
      return sendResponse(res, 400, 'Valid billing month and year are required');
    }
    if (body.societyId !== undefined && body.societyId !== null && String(body.societyId).trim()) {
      return sendResponse(res, 400, 'Society filtering is not available in this single-society database');
    }
    const [settingsRows] = await promisePool.query('SELECT * FROM maintenance_settings ORDER BY id DESC LIMIT 1');
    const settings = settingsRows[0] || {};
    const requestedAmount = body.amount === undefined || body.amount === null || String(body.amount).trim() === '' ? null : Number(body.amount);
    if (requestedAmount !== null && (!Number.isFinite(requestedAmount) || requestedAmount <= 0)) {
      return sendResponse(res, 400, 'Maintenance amount must be greater than zero');
    }
    const dueDateString = body.dueDate ? String(body.dueDate) : `${reqYear}-${String(reqMonth).padStart(2, '0')}-${String(Number(settings.due_day || 10)).padStart(2, '0')}`;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dueDateString) || Number.isNaN(Date.parse(dueDateString))) {
      return sendResponse(res, 400, 'Due date must be a valid YYYY-MM-DD date');
    }
    const requestedResidents = [body.residentId, ...(Array.isArray(body.residentIds) ? body.residentIds : [])].filter(Boolean).map(Number).filter(Number.isInteger);
    const requestedFlats = [body.flatId, ...(Array.isArray(body.flatIds) ? body.flatIds : [])].filter(Boolean).map(Number).filter(Number.isInteger);
    const where = ["u.role = 'resident'", "u.status = 'approved'", 'f.current_resident_id = u.id', "f.status = 'Occupied'", 'f.current_resident_id IS NOT NULL'];
    const params = [];
    if (requestedResidents.length) { where.push('u.id = ANY(?::int[])'); params.push([...new Set(requestedResidents)]); }
    if (requestedFlats.length) { where.push('f.id = ANY(?::int[])'); params.push([...new Set(requestedFlats)]); }
    if (body.wing) { where.push("LOWER(COALESCE(f.wing, f.wing_block, '')) = LOWER(?)"); params.push(String(body.wing).trim()); }
    if (body.building) { where.push("LOWER(COALESCE(f.wing_block, f.wing, '')) = LOWER(?)"); params.push(String(body.building).trim()); }
    if (body.floor !== undefined && String(body.floor).trim()) { const value = Number(body.floor); if (!Number.isInteger(value)) return sendResponse(res, 400, 'Floor must be a valid number'); where.push('f.floor_no = ?'); params.push(value); }
    if (body.flatTypeId !== undefined && String(body.flatTypeId).trim()) { const value = Number(body.flatTypeId); if (!Number.isInteger(value)) return sendResponse(res, 400, 'Flat type must be valid'); where.push('f.flat_type_id = ?'); params.push(value); }
    const [candidates] = await promisePool.query(`
      SELECT u.id AS resident_id, f.id AS flat_id, f.flat_type_id,
             COALESCE(ft.default_maintenance_amount, f.maintenance_charge, s.fixed_amount, 0) AS default_amount
      FROM users u JOIN flats f ON f.current_resident_id = u.id
      LEFT JOIN flat_types ft ON ft.id = f.flat_type_id
      LEFT JOIN (SELECT fixed_amount FROM maintenance_settings ORDER BY id DESC LIMIT 1) s ON TRUE
      WHERE ${where.join(' AND ')}
      ORDER BY f.wing, f.floor_no, f.flat_no, u.id`, params);
    const result = { generatedCount: 0, skippedCount: 0, duplicateCount: 0, failedCount: 0, failureReasons: [], generated: [], skipped: [] };
    if (!candidates.length) return sendResponse(res, 400, 'No active residents with assigned occupied flats match the selected filters', result);
    const penalty = body.penaltyRule && typeof body.penaltyRule === 'object' ? body.penaltyRule : {};
    const penaltyType = body.penaltyType || penalty.type || null;
    const penaltyValue = body.penaltyValue ?? penalty.value ?? null;
    const penaltyGraceDays = body.penaltyGraceDays ?? penalty.graceDays ?? null;
    await connection.beginTransaction();
    for (const candidate of candidates) {
      const baseAmount = requestedAmount ?? Number(candidate.default_amount || 0);
      if (!Number.isFinite(baseAmount) || baseAmount <= 0) {
        result.failedCount += 1;
        result.failureReasons.push({ residentId: candidate.resident_id, flatId: candidate.flat_id, reason: 'No valid maintenance amount' });
        continue;
      }
      try {
        const [existing] = await connection.query('SELECT id FROM maintenance WHERE resident_id = ? AND flat_id = ? AND month = ? AND year = ? LIMIT 1', [candidate.resident_id, candidate.flat_id, reqMonth, reqYear]);
        if (existing.length) {
          result.skippedCount += 1; result.duplicateCount += 1;
          result.skipped.push({ residentId: candidate.resident_id, flatId: candidate.flat_id, reason: 'Duplicate bill for billing cycle' });
          continue;
        }
        const [insertResult] = await connection.query(
          `INSERT INTO maintenance
             (resident_id, flat_id, title, month, year, amount, penalty_amount, total_amount, paid_amount, remaining_amount,
              status, due_date, created_at, updated_at, flat_type_id, default_maintenance_amount, final_maintenance_amount,
              is_custom_amount, notes, penalty_type, penalty_value, penalty_grace_days)
           VALUES (?, ?, ?, ?, ?, ?, 0, ?, 0, ?, 'Pending', ?, NOW(), NOW(), ?, ?, ?, ?, ?, ?, ?, ?)
           ON CONFLICT DO NOTHING RETURNING id`,
          [candidate.resident_id, candidate.flat_id, body.title || settings.title || 'Monthly Maintenance', reqMonth, reqYear,
            baseAmount, baseAmount, baseAmount, dueDateString, candidate.flat_type_id || null, Number(candidate.default_amount || 0),
            baseAmount, requestedAmount !== null, body.notes || null, penaltyType,
            penaltyValue === null || penaltyValue === '' ? null : Number(penaltyValue),
            penaltyGraceDays === null || penaltyGraceDays === '' ? null : Number(penaltyGraceDays)]
        );
        const billId = insertResult.insertId || insertResult.id;
        if (!billId) {
          result.skippedCount += 1; result.duplicateCount += 1;
          result.skipped.push({ residentId: candidate.resident_id, flatId: candidate.flat_id, reason: 'Duplicate bill for billing cycle' });
        } else {
          result.generatedCount += 1;
          result.generated.push({ id: billId, residentId: candidate.resident_id, flatId: candidate.flat_id });
        }
      } catch (candidateError) {
        console.error('Generate bill candidate failed:', candidateError);
        result.failedCount += 1;
        result.failureReasons.push({ residentId: candidate.resident_id, flatId: candidate.flat_id, reason: 'Backend could not create this bill. Please retry after refresh.' });
      }
    }
    await connection.commit();
    if (result.generatedCount === 0) return sendResponse(res, 409, 'No bills were generated. All matching residents were skipped or failed validation.', result);
    return sendResponse(res, 201, 'Maintenance bills generated successfully', result);
  } catch (error) {
    try { await connection.rollback(); } catch (_) { /* no-op */ }
    console.error('Generate bills error:', error);
    return sendResponse(res, 500, 'Unable to generate maintenance bills', null, [error.message]);
  } finally {
    connection.release();
  }
};

const updateMaintenance = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, month, year, dueDate, amount, status } = req.body;

    const [existing] = await promisePool.query('SELECT amount, penalty_amount, paid_amount, default_maintenance_amount FROM maintenance WHERE id = ?', [id]);
    if (existing.length === 0) {
      return sendResponse(res, 404, 'Maintenance record not found');
    }

    const amt = amount !== undefined ? Number(amount) : Number(existing[0].amount);
    
    // Check if the updated amount is custom (differs from snapshot default_maintenance_amount)
    const defaultAmt = existing[0].default_maintenance_amount !== null && existing[0].default_maintenance_amount !== undefined
      ? Number(existing[0].default_maintenance_amount) 
      : amt;
    const isCustom = amt !== defaultAmt;

    const finalMaintenanceAmount = amt;
    const isCustomAmount = isCustom;
    const customReason = isCustom ? (req.body.custom_reason || req.body.reason || null) : null;
    const editedBy = isCustom ? req.user.id : null;
    const editedAt = isCustom ? new Date() : null;

    const penaltyAmt = Number(existing[0].penalty_amount);
    const paidAmt = Number(existing[0].paid_amount);
    const newTotal = amt + penaltyAmt;
    const remaining = Math.max(0, newTotal - paidAmt);

    await promisePool.query(
      `UPDATE maintenance 
       SET title = COALESCE(?, title), month = COALESCE(?, month), year = COALESCE(?, year), 
           due_date = COALESCE(?, due_date), amount = ?, total_amount = ?, remaining_amount = ?, status = COALESCE(?, status), updated_at = NOW(),
           final_maintenance_amount = ?, is_custom_amount = ?, custom_reason = ?, edited_by = ?, edited_at = ?
       WHERE id = ?`,
      [title, month, year, dueDate, amt, newTotal, remaining, status, finalMaintenanceAmount, isCustomAmount, customReason, editedBy, editedAt, id]
    );

    return sendResponse(res, 200, 'Maintenance updated successfully');
  } catch (error) {
    console.error('Update maintenance error:', error);
    return sendResponse(res, 500, 'Server error', null, ['Unable to update maintenance']);
  }
};

const deleteMaintenance = async (req, res) => {
  try {
    const { id } = req.params;
    await promisePool.query('DELETE FROM maintenance_writeoffs WHERE bill_id = ?', [id]);
    await promisePool.query('DELETE FROM payment_maintenance WHERE maintenance_id = ?', [id]);
    await promisePool.query('DELETE FROM payments WHERE bill_id = ?', [id]);
    await promisePool.query('DELETE FROM maintenance WHERE id = ?', [id]);
    return sendResponse(res, 200, 'Maintenance deleted successfully');
  } catch (error) {
    console.error('Delete maintenance error:', error);
    return sendResponse(res, 500, 'Server error', null, ['Unable to delete maintenance']);
  }
};

const deleteOrphanedMaintenance = async (req, res) => {
  try {
    await promisePool.query(
      `DELETE FROM maintenance_writeoffs
       WHERE bill_id IN (
         SELECT id FROM maintenance
         WHERE (flat_id IS NULL AND resident_id IS NULL)
            OR (flat_id IS NOT NULL AND flat_id NOT IN (SELECT id FROM flats))
            OR (resident_id IS NOT NULL AND resident_id NOT IN (SELECT id FROM users))
       )`
    );
    await promisePool.query(
      `DELETE FROM payments
       WHERE bill_id IN (
         SELECT id FROM maintenance
         WHERE (flat_id IS NULL AND resident_id IS NULL)
            OR (flat_id IS NOT NULL AND flat_id NOT IN (SELECT id FROM flats))
            OR (resident_id IS NOT NULL AND resident_id NOT IN (SELECT id FROM users))
       )`
    );
    const [result] = await promisePool.query(
      `DELETE FROM maintenance
       WHERE (flat_id IS NULL AND resident_id IS NULL)
          OR (flat_id IS NOT NULL AND flat_id NOT IN (SELECT id FROM flats))
          OR (resident_id IS NOT NULL AND resident_id NOT IN (SELECT id FROM users))`
    );
    return sendResponse(res, 200, 'Orphaned maintenance records cleaned up successfully', { deletedCount: result.affectedRows });
  } catch (error) {
    console.error('Delete orphaned maintenance error:', error);
    return sendResponse(res, 500, 'Server error cleaning orphaned maintenance');
  }
};

// PUT /api/maintenance/:id/pay
const payMaintenanceBill = async (req, res) => {
  try {
    const { id } = req.params;
    const { paidAmount, paymentDate = new Date() } = req.body;

    if (paidAmount === undefined || Number(paidAmount) < 0) {
      return sendResponse(res, 400, 'Valid paid amount is required');
    }

    const [billRows] = await promisePool.query('SELECT * FROM maintenance WHERE id = ?', [id]);
    if (billRows.length === 0) {
      return sendResponse(res, 404, 'Maintenance bill not found');
    }

    const bill = billRows[0];
    const totalAmount = Number(bill.total_amount || bill.amount);
    const newPaidAmount = Number(paidAmount);
    const remainingAmount = Math.max(0, totalAmount - newPaidAmount);
    
    let status = 'Pending';
    if (newPaidAmount >= totalAmount) {
      status = 'Paid';
    } else if (newPaidAmount > 0) {
      status = 'Partial';
    } else {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (bill.due_date && new Date(bill.due_date) < today) {
        status = 'Overdue';
      }
    }

    await promisePool.query(
      `UPDATE maintenance
       SET paid_amount = ?, remaining_amount = ?, status = ?, payment_date = ?, updated_at = NOW()
       WHERE id = ?`,
      [newPaidAmount, remainingAmount, status, paymentDate, id]
    );

    // Record a payment in payments table
    await promisePool.query(
      `INSERT INTO payments (bill_id, payment_method, transaction_id, amount, payment_status, paid_at)
       VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT (bill_id, transaction_id) DO UPDATE SET amount = EXCLUDED.amount, payment_status = EXCLUDED.payment_status`,
      [id, 'Manual', `ADMIN-${Date.now()}`, newPaidAmount, status === 'Paid' ? 'Paid' : 'Pending', paymentDate]
    );

    return sendResponse(res, 200, 'Bill marked as paid successfully');
  } catch (error) {
    console.error('Pay maintenance bill error:', error);
    return sendResponse(res, 500, 'Server error', null, ['Unable to update payment status']);
  }
};

const getUserMaintenance = async (req, res) => {
  try {
    const userId = req.user.id;
    await reconcilePaidPayments(promisePool, userId);
    await applyPenaltyLogic();
    const [bills] = await promisePool.query(`
      SELECT m.*, 
             CASE
               WHEN approved_payment.id IS NOT NULL THEN 'Paid'
               WHEN LOWER(COALESCE(rejected_payment.payment_status, '')) = 'rejected' THEN 'Rejected'
               ELSE m.status
             END AS payment_status,
             m.total_amount AS total_amount, m.due_date AS maintenance_due_date,
             f.flat_no, f.floor_no, ft.name AS flat_type_name,
             rejected_payment.rejection_reason,
             rejected_payment.rejected_at,
             rejected_payment.rejected_by_name,
             rejected_payment.payment_status AS latest_payment_status,
             approved_payment.id AS payment_id
      FROM maintenance m
      JOIN flats f ON m.flat_id = f.id
      LEFT JOIN flat_types ft ON m.flat_type_id = ft.id
      LEFT JOIN LATERAL (
        SELECT p.rejection_reason,
               COALESCE(p.rejected_at, p.verified_at, p.updated_at, p.created_at) AS rejected_at,
               u.name AS rejected_by_name,
               p.payment_status
        FROM payments p
        LEFT JOIN payment_maintenance pm ON pm.payment_id = p.id
        LEFT JOIN users u ON u.id = COALESCE(p.rejected_by, p.verified_by)
        WHERE (pm.maintenance_id = m.id OR p.bill_id = m.id)
          AND LOWER(p.payment_status) = 'rejected'
        ORDER BY COALESCE(p.rejected_at, p.verified_at, p.updated_at, p.created_at) DESC
        LIMIT 1
      ) rejected_payment ON true
      LEFT JOIN LATERAL (
        SELECT p.id
        FROM payments p
        LEFT JOIN payment_maintenance pm ON pm.payment_id = p.id
        WHERE (pm.maintenance_id = m.id OR p.bill_id = m.id)
          AND p.payment_status IN ('Approved', 'Paid')
        ORDER BY COALESCE(p.verified_at, p.paid_at, p.updated_at, p.created_at) DESC
        LIMIT 1
      ) approved_payment ON true
      WHERE m.resident_id = ?
      ORDER BY m.created_at DESC
    `, [userId]);

    const [historyRows] = await promisePool.query(`
      SELECT psh.*, COALESCE(psh.changed_by_name, u.name, 'Admin') AS changed_by_name
      FROM payment_status_history psh
      LEFT JOIN users u ON u.id = psh.changed_by
      WHERE psh.bill_id IN (SELECT id FROM maintenance WHERE resident_id = ?)
      ORDER BY psh.created_at ASC
    `, [userId]);

    const billsWithHistory = bills.map((bill) => {
      const history = historyRows.filter((h) => Number(h.bill_id) === Number(bill.id));
      return {
        ...bill,
        status_history: history
      };
    });

    return sendResponse(res, 200, 'Resident maintenance bills fetched successfully', billsWithHistory);
  } catch (error) {
    console.error('Get user maintenance error:', error);
    return sendResponse(res, 500, 'Server error', null, ['Unable to fetch resident maintenance bills']);
  }
};

const getAllBills = async (req, res) => {
  try {
    await reconcilePaidPayments();
    await applyPenaltyLogic();
    const [bills] = await promisePool.query(`
      SELECT m.*, m.status AS payment_status, m.total_amount AS total_amount, u.name AS resident_name, f.flat_no, f.floor_no,
             ft.name AS flat_type_name
      FROM maintenance m
      JOIN users u ON m.resident_id = u.id
      JOIN flats f ON m.flat_id = f.id
      LEFT JOIN flat_types ft ON m.flat_type_id = ft.id
      ORDER BY m.created_at DESC
    `);
    return sendResponse(res, 200, 'Bills fetched successfully', bills);
  } catch (error) {
    console.error('Get bills error:', error);
    return sendResponse(res, 500, 'Server error', null, ['Unable to fetch bills']);
  }
};

const getBillById = async (req, res) => {
  try {
    const { id } = req.params;
    const [bills] = await promisePool.query(`
      SELECT m.*, m.status AS payment_status, m.total_amount AS total_amount, u.name AS resident_name, f.flat_no, f.floor_no,
             ft.name AS flat_type_name, editor.name AS edited_by_name
      FROM maintenance m
      JOIN users u ON m.resident_id = u.id
      JOIN flats f ON m.flat_id = f.id
      LEFT JOIN flat_types ft ON m.flat_type_id = ft.id
      LEFT JOIN users editor ON editor.id = m.edited_by
      WHERE m.id = ?
    `, [id]);

    if (bills.length === 0) {
      return sendResponse(res, 404, 'Bill not found');
    }

    if (req.user.role !== 'admin' && bills[0].resident_id !== req.user.id) {
      return sendResponse(res, 403, 'You can only access your own bills');
    }

    // Fetch bill items
    const [items] = await promisePool.query(
      'SELECT * FROM maintenance_bill_items WHERE bill_id = ?',
      [id]
    );

    // Calculate previous outstanding balance (sum of remaining_amount of previous bills)
    const [outstandingRows] = await promisePool.query(
      `SELECT COALESCE(SUM(remaining_amount), 0) AS previous_outstanding
       FROM maintenance
       WHERE resident_id = ? AND (year * 12 + month) < (? * 12 + ?) AND id != ?`,
      [bills[0].resident_id, bills[0].year, bills[0].month, bills[0].id]
    );
    const previousOutstanding = Number(outstandingRows[0]?.previous_outstanding || 0);

    const [payments] = await promisePool.query('SELECT * FROM payments WHERE bill_id = ? ORDER BY created_at DESC', [id]);
    return sendResponse(res, 200, 'Bill fetched successfully', {
      bill: {
        ...bills[0],
        items,
        previous_outstanding: previousOutstanding
      },
      payments
    });
  } catch (error) {
    console.error('Get bill error:', error);
    return sendResponse(res, 500, 'Server error', null, ['Unable to fetch bill']);
  }
};

const createPayment = async (req, res) => {
  const connection = await promisePool.getConnection();
  try {
    await ensureMaintenanceRuntimeSchema();
    const {
      billId,
      paymentMethod = 'UPI',
      transactionId,
      utrNumber,
      amount,
      billIds,
      screenshotUrl,
      screenshot,
      paymentDate
    } = req.body;
    const utr = String(utrNumber || transactionId || '').trim();
    const requestedBillIds = Array.isArray(billIds) && billIds.length ? billIds.map(Number).filter(Boolean) : [];
    if ((!billId && !requestedBillIds.length) || !utr || !amount) {
      return sendResponse(res, 400, 'Bill ID, UTR number and amount are required');
    }

    await connection.beginTransaction();

    const [billRows] = requestedBillIds.length
      ? await connection.query('SELECT * FROM maintenance WHERE id = ANY(?::int[]) ORDER BY year ASC, month ASC, due_date ASC, id ASC', [requestedBillIds])
      : await connection.query('SELECT * FROM maintenance WHERE id = ?', [billId]);
    if (billRows.length === 0) {
      await connection.rollback();
      return sendResponse(res, 404, 'Bill not found');
    }

    if (billRows.some((row) => Number(row.resident_id) !== Number(req.user.id))) {
      await connection.rollback();
      return sendResponse(res, 403, 'You can only access your own bills');
    }

    if (billRows.some((row) => ['Paid', 'Pending Verification', 'Under Review'].includes(row.status))) {
      await connection.rollback();
      return sendResponse(res, 400, 'One or more selected bills are already paid or pending verification');
    }

    const bill = billRows[billRows.length - 1];
    let selectedBillIds = billRows.map((row) => row.id);
    const primaryBillId = bill.id;
    const totalAmount = billRows.reduce((sum, row) => sum + Number(row.remaining_amount || row.total_amount || row.amount || 0), 0);
    const paidAmount = Number(amount || 0);
    if (!Number.isFinite(paidAmount) || paidAmount <= 0) {
      await connection.rollback();
      return sendResponse(res, 400, 'Valid payment amount is required');
    }
    if (paidAmount < totalAmount) {
      await connection.rollback();
      return sendResponse(res, 400, `Payment amount must be at least ${totalAmount}`);
    }

    const [existingBillPayments] = await connection.query(
      `SELECT p.id, p.payment_status
       FROM payments p
       JOIN payment_maintenance pm ON pm.payment_id = p.id
       WHERE pm.maintenance_id = ANY(?::int[])
         AND p.payment_status != 'Rejected'
       LIMIT 1`,
      [selectedBillIds]
    );
    if (existingBillPayments.length > 0) {
      await connection.rollback();
      return sendResponse(res, 409, 'Payment already exists for these dues', null, ['One of these maintenance bills already has a payment record']);
    }

    const [paymentRows] = await connection.query('SELECT id FROM payments WHERE transaction_id = ?', [utr]);
    if (paymentRows.length > 0) {
      await connection.rollback();
      return sendResponse(res, 409, 'Duplicate payment transaction', null, ['This UTR number has already been used']);
    }

    const screenshotPath = savePaymentScreenshot(screenshot || screenshotUrl);
    const paidAt = paymentDate || new Date();
    const paymentsHasResidentId = await hasTableColumn('payments', 'resident_id');
    const paymentsHasPaymentProof = await hasTableColumn('payments', 'payment_proof');
    const insertColumns = ['bill_id', 'payment_method', 'transaction_id', 'amount', 'payment_status', 'paid_at', 'screenshot_url'];
    const insertValues = [primaryBillId, paymentMethod, utr, paidAmount, 'Pending Verification', paidAt, screenshotPath];
    if (paymentsHasResidentId) {
      insertColumns.push('resident_id');
      insertValues.push(req.user.id);
    }
    if (paymentsHasPaymentProof) {
      insertColumns.push('payment_proof');
      insertValues.push((screenshot || screenshotUrl));
    }

    const placeholders = insertColumns.map(() => '?').join(', ');
    const [paymentResult] = await connection.query(
      `INSERT INTO payments (${insertColumns.join(', ')}) VALUES (${placeholders})`,
      insertValues
    );
    const paymentId = paymentResult.insertId || paymentResult.id;

    for (const maintenanceId of selectedBillIds) {
      await connection.query(
        'INSERT INTO payment_maintenance (payment_id, maintenance_id) VALUES (?, ?) ON CONFLICT (payment_id, maintenance_id) DO NOTHING',
        [paymentId, maintenanceId]
      );
    }
    await connection.query(
      "UPDATE maintenance SET status = 'Pending Verification', payment_date = ?, updated_at = NOW() WHERE id = ANY(?::int[])",
      [paidAt, selectedBillIds]
    );
    await connection.commit();

    try {
      await promisePool.query(
        `INSERT INTO notifications (resident_id, title, message, type, is_read)
         SELECT id, 'Maintenance payment received', ?, 'maintenance', false
         FROM users
         WHERE role = 'admin' AND status = 'approved'`,
        [`Verify payment of ${paidAmount.toLocaleString('en-IN')} for UTR: ${utr}`]
      );
    } catch (notifError) {
      console.error('Failed to create admin notification for payment:', notifError);
    }

    return sendResponse(res, 201, 'Payment submitted for admin verification', {
      paymentId,
      selectedBillIds,
      pendingBillsCount: selectedBillIds.length
    });
  } catch (error) {
    try {
      await connection.rollback();
    } catch (rollbackError) {
      console.error('Create payment rollback error:', rollbackError);
    }
    console.error('Create payment error:', error);
    return sendResponse(res, 500, 'Server error', null, ['Unable to submit payment']);
  } finally {
    connection.release();
  }
};

const savePaymentScreenshot = (imageData) => {
  if (!imageData) return null;
  if (!String(imageData).startsWith('data:image/')) return imageData;

  const match = String(imageData).match(/^data:(image\/(?:png|jpeg|jpg|webp));base64,(.+)$/);
  if (!match) return null;

  const extension = match[1].includes('png') ? 'png' : match[1].includes('webp') ? 'webp' : 'jpg';
  const uploadDir = path.join(__dirname, '..', 'uploads', 'payment-screenshots');
  fs.mkdirSync(uploadDir, { recursive: true });

  const fileName = `payment-${Date.now()}-${Math.round(Math.random() * 1e9)}.${extension}`;
  fs.writeFileSync(path.join(uploadDir, fileName), Buffer.from(match[2], 'base64'));
  return `/uploads/payment-screenshots/${fileName}`;
};

const recordPaymentStatusHistory = async (connection, { paymentId, billId, previousStatus, newStatus, changedBy, changedByName, reason, comment }) => {
  try {
    await connection.query(
      `INSERT INTO payment_status_history 
         (payment_id, bill_id, previous_status, new_status, changed_by, changed_by_name, reason, comment, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
      [paymentId, billId || null, previousStatus || null, newStatus, changedBy || null, changedByName || null, reason || null, comment || null]
    );
  } catch (err) {
    console.error('Failed to record payment status history:', err);
  }
};

const approvePayment = async (req, res) => {
  const connection = await promisePool.getConnection();
  try {
    await ensureMaintenanceRuntimeSchema();
    const { id } = req.params;
    const body = req.body || {};
    const approvalComment = String(body.approvalComment || body.comment || body.remarks || 'Approved by admin').trim();

    await connection.beginTransaction();
    const [paymentRows] = await connection.query('SELECT * FROM payments WHERE id = ? FOR UPDATE', [id]);
    if (paymentRows.length === 0) {
      await connection.rollback();
      return sendResponse(res, 404, 'Payment record not found');
    }

    const payment = paymentRows[0];
    const currentStatus = String(payment.payment_status || '').trim().toLowerCase();
    if (['approved', 'paid'].includes(currentStatus)) {
      await connection.rollback();
      return sendResponse(res, 400, `Payment has already been ${String(payment.payment_status).toLowerCase()}`);
    }
    const receiptNumber = payment.receipt_number || `RCP-${payment.bill_id}-${Date.now()}`;
    const adminName = req.user?.name || 'Admin';

    const paymentsHasApprovedBy = await hasTableColumn('payments', 'approved_by');
    const paymentsHasApprovedAt = await hasTableColumn('payments', 'approved_at');
    const paymentsHasApprovalComment = await hasTableColumn('payments', 'approval_comment');
    const paymentsHasVerifiedBy = await hasTableColumn('payments', 'verified_by');
    const paymentsHasVerifiedAt = await hasTableColumn('payments', 'verified_at');
    const paymentsHasReceiptNumber = await hasTableColumn('payments', 'receipt_number');
    const paymentsHasRemarks = await hasTableColumn('payments', 'remarks');
    const paymentsHasUpdatedAt = await hasTableColumn('payments', 'updated_at');
    const maintenanceHasRemarks = await hasTableColumn('maintenance', 'remarks');

    const paymentSet = ["payment_status = 'Approved'"];
    const paymentValues = [];
    if (paymentsHasApprovedBy) {
      paymentSet.push('approved_by = ?');
      paymentValues.push(req.user.id);
    }
    if (paymentsHasApprovedAt) paymentSet.push('approved_at = NOW()');
    if (paymentsHasApprovalComment) {
      paymentSet.push('approval_comment = ?');
      paymentValues.push(approvalComment);
    }
    if (paymentsHasVerifiedBy) {
      paymentSet.push('verified_by = ?');
      paymentValues.push(req.user.id);
    }
    if (paymentsHasVerifiedAt) paymentSet.push('verified_at = NOW()');
    if (paymentsHasReceiptNumber) {
      paymentSet.push('receipt_number = ?');
      paymentValues.push(receiptNumber);
    }
    if (paymentsHasRemarks) {
      paymentSet.push('remarks = ?');
      paymentValues.push(approvalComment);
    }
    if (paymentsHasUpdatedAt) paymentSet.push('updated_at = NOW()');
    paymentValues.push(id);

    await connection.query(
      `UPDATE payments SET ${paymentSet.join(', ')} WHERE id = ?`,
      paymentValues
    );

    const [linkedBills] = await connection.query(
      `SELECT maintenance_id FROM payment_maintenance WHERE payment_id = ?`,
      [id]
    );
    const billIds = linkedBills.length ? linkedBills.map((row) => row.maintenance_id) : [payment.bill_id];

    if (maintenanceHasRemarks) {
      await connection.query(
        "UPDATE maintenance SET remarks = CONCAT(COALESCE(remarks, ''), ?) WHERE id = ANY(?::int[])",
        [` Payment approved on ${new Date().toLocaleString('en-IN')}.`, billIds]
      );
    }
    for (const billId of billIds) {
      await markMaintenanceBillPaid(connection, billId, payment.paid_at || new Date());
      await recordPaymentStatusHistory(connection, {
        paymentId: id,
        billId,
        previousStatus: payment.payment_status,
        newStatus: 'Approved',
        changedBy: req.user.id,
        changedByName: adminName,
        reason: payment.rejection_reason || null,
        comment: approvalComment
      });
    }

    // Fetch details for audit log & resident notification
    const [[residentInfo]] = await connection.query(`
      SELECT 
        COALESCE(p.resident_id, m.resident_id) AS resident_user_id,
        u.name AS resident_name,
        (SELECT name FROM users WHERE id = ?) AS admin_name
      FROM payments p
      JOIN maintenance m ON p.bill_id = m.id
      JOIN users u ON u.id = COALESCE(p.resident_id, m.resident_id)
      WHERE p.id = ?
      LIMIT 1
    `, [req.user.id, id]);

    const [linkedBillsForAudit] = await connection.query(`
      SELECT CONCAT('BILL-', m.id) AS bill_number
      FROM payment_maintenance pm
      JOIN maintenance m ON pm.maintenance_id = m.id
      WHERE pm.payment_id = ?
    `, [id]);
    
    const auditBillNumbers = linkedBillsForAudit.length 
      ? linkedBillsForAudit.map(b => b.bill_number).join(', ') 
      : `BILL-${payment.bill_id}`;

    if (residentInfo) {
      const isReApprove = String(payment.payment_status).toUpperCase() === 'REJECTED';
      const notifTitle = isReApprove ? 'Previously Rejected Payment Approved' : 'Payment Approved';
      const notifMessage = isReApprove
        ? `Your previously rejected maintenance payment for ${auditBillNumbers} (₹${Number(payment.amount).toLocaleString('en-IN')}) has now been approved by admin ${residentInfo.admin_name || adminName}. Receipt: ${receiptNumber}`
        : `Your maintenance payment of ₹${Number(payment.amount).toLocaleString('en-IN')} for ${auditBillNumbers} has been approved. Receipt: ${receiptNumber}`;

      const auditDetails = {
        paymentId: id,
        billNumber: auditBillNumbers,
        residentName: residentInfo.resident_name,
        amount: Number(payment.amount),
        previousStatus: payment.payment_status,
        newStatus: 'Approved',
        adminName: residentInfo.admin_name || 'Admin',
        rejectionReason: payment.rejection_reason || null,
        approvalComment: approvalComment,
        dateTime: new Date().toISOString()
      };
      
      await connection.query(
        `INSERT INTO maintenance_audit_logs (user_id, action, entity_type, entity_id, details)
         VALUES (?, ?, ?, ?, ?)`,
        [req.user.id, isReApprove ? 'RE_APPROVE_PAYMENT' : 'APPROVE_PAYMENT', 'PAYMENT', id, JSON.stringify(auditDetails)]
      );

      try {
        await connection.query(
          `INSERT INTO notifications (resident_id, title, message, type, is_read, created_at)
           VALUES (?, ?, ?, ?, false, NOW())`,
          [
            residentInfo.resident_user_id,
            notifTitle,
            notifMessage,
            'payment'
          ]
        );
      } catch (notificationError) {
        console.error('Payment approval notification failed:', notificationError);
      }
    }

    await connection.commit();

    return sendResponse(res, 200, 'Payment approved successfully', { receiptNumber });
  } catch (error) {
    try {
      await connection.rollback();
    } catch (rollbackError) {
      console.error('Approve payment rollback error:', rollbackError);
    }
    console.error('Approve payment error:', error);
    return sendResponse(res, 500, 'Server error', null, ['Unable to approve payment']);
  } finally {
    connection.release();
  }
};

const rejectPayment = async (req, res) => {
  const connection = await promisePool.getConnection();
  try {
    await ensureMaintenanceRuntimeSchema();
    const { id } = req.params;
    const { rejectionReason, remarks } = req.body;
    const reason = String(rejectionReason || remarks || '').trim();
    if (!reason) {
      return sendResponse(res, 400, 'Rejection reason is required');
    }

    await connection.beginTransaction();
    const [paymentRows] = await connection.query('SELECT * FROM payments WHERE id = ? FOR UPDATE', [id]);
    if (paymentRows.length === 0) {
      await connection.rollback();
      return sendResponse(res, 404, 'Payment record not found');
    }

    const payment = paymentRows[0];
    const currentStatus = String(payment.payment_status || '').trim().toLowerCase();
    if (['approved', 'paid', 'rejected'].includes(currentStatus)) {
      await connection.rollback();
      return sendResponse(res, 400, `Payment has already been ${String(payment.payment_status).toLowerCase()}`);
    }
    const adminName = req.user?.name || 'Admin';
    const paymentsHasVerifiedBy = await hasTableColumn('payments', 'verified_by');
    const paymentsHasVerifiedAt = await hasTableColumn('payments', 'verified_at');
    const paymentsHasRejectionReason = await hasTableColumn('payments', 'rejection_reason');
    const paymentsHasRejectedBy = await hasTableColumn('payments', 'rejected_by');
    const paymentsHasRejectedAt = await hasTableColumn('payments', 'rejected_at');
    const paymentsHasRemarks = await hasTableColumn('payments', 'remarks');
    const paymentsHasUpdatedAt = await hasTableColumn('payments', 'updated_at');
    const maintenanceHasPaymentDate = await hasTableColumn('maintenance', 'payment_date');
    const maintenanceHasRemarks = await hasTableColumn('maintenance', 'remarks');
    const maintenanceHasUpdatedAt = await hasTableColumn('maintenance', 'updated_at');

    const paymentSet = ["payment_status = 'REJECTED'"];
    const paymentValues = [];
    if (paymentsHasVerifiedBy) {
      paymentSet.push('verified_by = ?');
      paymentValues.push(req.user.id);
    }
    if (paymentsHasVerifiedAt) paymentSet.push('verified_at = NOW()');
    if (paymentsHasRejectedBy) {
      paymentSet.push('rejected_by = ?');
      paymentValues.push(req.user.id);
    }
    if (paymentsHasRejectedAt) paymentSet.push('rejected_at = NOW()');
    if (paymentsHasRejectionReason) {
      paymentSet.push('rejection_reason = ?');
      paymentValues.push(reason);
    }
    if (paymentsHasRemarks) {
      paymentSet.push('remarks = ?');
      paymentValues.push(reason);
    }
    if (paymentsHasUpdatedAt) paymentSet.push('updated_at = NOW()');
    paymentValues.push(id);

    await connection.query(
      `UPDATE payments SET ${paymentSet.join(', ')} WHERE id = ?`,
      paymentValues
    );

    const [linkedBills] = await connection.query(
      `SELECT maintenance_id FROM payment_maintenance WHERE payment_id = ?`,
      [id]
    );
    const billIds = linkedBills.length ? linkedBills.map((row) => row.maintenance_id) : [payment.bill_id];
    const validBillIds = billIds.filter(Boolean);

    const maintenanceSet = ["status = CASE WHEN due_date IS NOT NULL AND due_date < CURRENT_DATE THEN 'Overdue' ELSE 'Pending' END"];
    const maintenanceValues = [];
    if (maintenanceHasPaymentDate) maintenanceSet.push('payment_date = NULL');
    if (maintenanceHasRemarks) {
      maintenanceSet.push("remarks = CONCAT(COALESCE(remarks, ''), ?)");
      maintenanceValues.push(` Payment rejected: ${reason}.`);
    }
    if (maintenanceHasUpdatedAt) maintenanceSet.push('updated_at = NOW()');
    if (validBillIds.length) {
      maintenanceValues.push(validBillIds);
      await connection.query(
        `UPDATE maintenance SET ${maintenanceSet.join(', ')} WHERE id = ANY(?::int[])`,
        maintenanceValues
      );
    }

    for (const billId of validBillIds) {
      await recordPaymentStatusHistory(connection, {
        paymentId: id,
        billId,
        previousStatus: payment.payment_status,
        newStatus: 'Rejected',
        changedBy: req.user.id,
        changedByName: adminName,
        reason: reason,
        comment: remarks || null
      });
    }

    let residentId = payment.resident_id;
    let monthText = 'your selected maintenance bills';
    if (validBillIds.length) {
      const [billDetails] = await connection.query(
        `SELECT resident_id, month, year
         FROM maintenance
         WHERE id = ANY(?::int[])
         ORDER BY year ASC, month ASC`,
        [validBillIds]
      );
      residentId = residentId || billDetails[0]?.resident_id;
      const monthLabels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const labels = billDetails.map((bill) => `${monthLabels[(Number(bill.month) || 1) - 1]} ${bill.year || ''}`.trim());
      if (labels.length) monthText = labels.join(' and ');
    }

    if (residentId) {
      try {
        await connection.query(
          `INSERT INTO notifications (resident_id, title, message, type, is_read, created_at)
           VALUES (?, ?, ?, ?, false, NOW())`,
          [
            residentId,
            'Payment Rejected',
            `Your payment proof for ${monthText} was rejected. Reason: ${reason}. Please submit corrected details.`,
            'payment'
          ]
        );
      } catch (notificationError) {
        console.error('Payment rejection notification failed:', notificationError);
      }
    }

    // Fetch details for audit log
    const [[residentInfo]] = await connection.query(`
      SELECT 
        COALESCE(p.resident_id, m.resident_id) AS resident_user_id,
        u.name AS resident_name,
        (SELECT name FROM users WHERE id = ?) AS admin_name
      FROM payments p
      JOIN maintenance m ON p.bill_id = m.id
      JOIN users u ON u.id = COALESCE(p.resident_id, m.resident_id)
      WHERE p.id = ?
      LIMIT 1
    `, [req.user.id, id]);

    const [linkedBillsForAudit] = await connection.query(`
      SELECT CONCAT('BILL-', m.id) AS bill_number
      FROM payment_maintenance pm
      JOIN maintenance m ON pm.maintenance_id = m.id
      WHERE pm.payment_id = ?
    `, [id]);
    
    const auditBillNumbers = linkedBillsForAudit.length 
      ? linkedBillsForAudit.map(b => b.bill_number).join(', ') 
      : `BILL-${payment.bill_id}`;

    if (residentInfo) {
      const auditDetails = {
        paymentId: id,
        billNumber: auditBillNumbers,
        residentName: residentInfo.resident_name,
        amount: Number(payment.amount),
        previousStatus: payment.payment_status,
        newStatus: 'Rejected',
        adminName: residentInfo.admin_name || 'Admin',
        rejectionReason: reason,
        dateTime: new Date().toISOString()
      };
      
      await connection.query(
        `INSERT INTO maintenance_audit_logs (user_id, action, entity_type, entity_id, details)
         VALUES (?, ?, ?, ?, ?)`,
        [req.user.id, 'REJECT_PAYMENT', 'PAYMENT', id, JSON.stringify(auditDetails)]
      );
    }

    await connection.commit();

    return sendResponse(res, 200, 'Payment rejected successfully');
  } catch (error) {
    try {
      await connection.rollback();
    } catch (rollbackError) {
      console.error('Reject payment rollback error:', rollbackError);
    }
    console.error('Reject payment error:', error);
    return sendResponse(res, 500, 'Server error', null, ['Unable to reject payment']);
  } finally {
    connection.release();
  }
};

const getPendingVerificationPayments = async (req, res) => {
  try {
    await ensureMaintenanceRuntimeSchema();
    let [payments] = await promisePool.query(`
      SELECT p.id, p.bill_id, p.payment_method, p.transaction_id, p.amount, p.payment_status, p.paid_at, p.created_at, p.updated_at, p.remarks, p.verified_by, p.verified_at, p.rejection_reason, p.receipt_number, p.resident_id, p.rejected_by, p.rejected_at,
             CASE WHEN p.payment_proof IS NOT NULL OR p.screenshot_url IS NOT NULL THEN 1 ELSE 0 END AS has_screenshot,
             p.transaction_id AS utr_number,
             COALESCE(CONCAT('BILL-', m.id), CONCAT('PAY-', p.id)) AS bill_number,
             m.title, m.month, m.year, m.due_date,
             COALESCE(m.total_amount, p.amount) AS total_amount,
             COALESCE(m.resident_id, p.resident_id) AS resident_id,
             COALESCE(u.name, payer.name, 'Resident') AS resident_name,
             COALESCE(u.phone, payer.phone) AS resident_phone,
             COALESCE(u.email, payer.email) AS resident_email,
             f.flat_no, f.wing
      FROM payments p
      LEFT JOIN maintenance m ON p.bill_id = m.id
      LEFT JOIN users u ON m.resident_id = u.id
      LEFT JOIN users payer ON p.resident_id = payer.id
      LEFT JOIN flats f ON m.flat_id = f.id
      WHERE p.payment_status IN ('PENDING_REVIEW', 'Pending Verification', 'Pending', 'Under Review', 'NEEDS_CLARIFICATION', 'Needs Clarification', 'REJECTED', 'Rejected')
      ORDER BY p.created_at DESC
    `);
    if (!payments.length) {
      [payments] = await promisePool.query(`
        SELECT p.id, p.bill_id, p.payment_method, p.transaction_id, p.amount, p.payment_status, p.paid_at, p.created_at, p.updated_at, p.remarks, p.verified_by, p.verified_at, p.rejection_reason, p.receipt_number, p.resident_id, p.rejected_by, p.rejected_at,
               CASE WHEN p.payment_proof IS NOT NULL OR p.screenshot_url IS NOT NULL THEN 1 ELSE 0 END AS has_screenshot,
               p.transaction_id AS utr_number,
               COALESCE(CONCAT('BILL-', m.id), CONCAT('PAY-', p.id)) AS bill_number,
               m.title, m.month, m.year, m.due_date,
               COALESCE(m.total_amount, p.amount) AS total_amount,
               COALESCE(m.resident_id, p.resident_id) AS resident_id,
               COALESCE(u.name, payer.name, 'Resident') AS resident_name,
               COALESCE(u.phone, payer.phone) AS resident_phone,
               COALESCE(u.email, payer.email) AS resident_email,
               f.flat_no, f.wing
        FROM payments p
        LEFT JOIN maintenance m ON p.bill_id = m.id
        LEFT JOIN users u ON m.resident_id = u.id
        LEFT JOIN users payer ON p.resident_id = payer.id
        LEFT JOIN flats f ON m.flat_id = f.id
        WHERE COALESCE(p.payment_status, 'PENDING_REVIEW') NOT IN ('APPROVED', 'Approved', 'Paid', 'Verified')
        ORDER BY p.created_at DESC
        LIMIT 25
      `);
    }
    return sendResponse(res, 200, 'Pending verification payments fetched successfully', withPaymentScreenshotUrls(req, payments));
  } catch (error) {
    console.error('Get pending payments error:', error);
    return sendResponse(res, 500, 'Server error', null, ['Unable to fetch pending payments']);
  }
};


const getPaymentVerifications = async (req, res) => {
  try {
    let query = `
      SELECT 
          m.id AS "billId",
          m.title,
          m.month AS "billingMonth",
          m.year AS "billingYear",
          m.total_amount AS "billAmount",
          m.paid_amount AS "paidAmount",
          m.remaining_amount AS "remainingAmount",
          m.status AS "billStatus",
          m.due_date AS "dueDate",
          p.id AS "submissionId",
          p.amount AS "submittedAmount",
          p.transaction_id AS "transactionReference",
          p.payment_method AS "paymentMethod",
          p.paid_at AS "paymentDate",
          CASE 
            WHEN p.payment_status IN ('PENDING_REVIEW', 'Pending Verification', 'Pending', 'Under Review') THEN 'PENDING_REVIEW'
            WHEN p.payment_status IN ('NEEDS_CLARIFICATION', 'Needs Clarification') THEN 'NEEDS_CLARIFICATION'
            WHEN p.payment_status IN ('APPROVED', 'Approved', 'Paid', 'Verified') THEN 'APPROVED'
            WHEN p.payment_status IN ('REJECTED', 'Rejected', 'Declined') THEN 'REJECTED'
            WHEN p.id IS NOT NULL THEN 'PENDING_REVIEW'
            ELSE 'NO_SUBMISSION'
          END AS "verificationStatus",
          p.remarks AS "adminNote",
          p.resident_note AS "residentNote",
          p.created_at AS "submittedAt",
          CASE WHEN p.payment_proof IS NOT NULL OR p.screenshot_url IS NOT NULL THEN 1 ELSE 0 END AS has_screenshot,
          u.id AS "residentId",
          u.name AS "residentName",
          f.flat_no AS "flatNumber"
      FROM payments p
      LEFT JOIN payment_maintenance pm ON pm.payment_id = p.id
      LEFT JOIN maintenance m ON m.id = COALESCE(pm.maintenance_id, p.bill_id)
      LEFT JOIN users u ON u.id = COALESCE(m.resident_id, p.resident_id)
      LEFT JOIN flats f ON f.id = m.flat_id
      -- The Android verification screen is also the payment audit ledger.
      -- Return approved/paid rows as well as pending and rejected submissions.
      WHERE p.id IS NOT NULL
      ORDER BY p.created_at DESC
    `;
    
    const [rows] = await promisePool.query(query);
    
    const forwardedProto = String(req?.headers?.['x-forwarded-proto'] || '').split(',')[0].trim();
    const protocol = forwardedProto || req?.protocol || 'https';
    const host = req?.headers?.['x-forwarded-host'] || req?.get?.('host') || req?.headers?.host;
    const baseUrl = host ? `${protocol}://${host}` : '';
    
    const items = rows.map(row => ({
      billId: row.billId || row.billid,
      title: row.title,
      billingMonth: row.billingMonth || row.billingmonth,
      billingYear: row.billingYear || row.billingyear,
      billAmount: row.billAmount || row.billamount,
      paidAmount: row.paidAmount || row.paidamount,
      remainingAmount: row.remainingAmount || row.remainingamount,
      billStatus: row.billStatus || row.billstatus,
      dueDate: row.dueDate || row.duedate,
      submissionId: row.submissionId || row.submissionid,
      submittedAmount: row.submittedAmount || row.submittedamount,
      transactionReference: row.transactionReference || row.transactionreference,
      paymentMethod: row.paymentMethod || row.paymentmethod,
      paymentDate: row.paymentDate || row.paymentdate,
      verificationStatus: row.verificationStatus || row.verificationstatus,
      adminNote: row.adminNote || row.adminnote,
      residentNote: row.residentNote || row.residentnote,
      submittedAt: row.submittedAt || row.submittedat,
      residentId: row.residentId || row.residentid,
      residentName: row.residentName || row.residentname,
      flatNumber: row.flatNumber || row.flatnumber,
      screenshotUrl: (row.has_screenshot || row.has_screenshot === 1) ? `${baseUrl}/api/maintenance/payments/${row.submissionId || row.submissionid}/screenshot` : null,
    }));
    
    // Return items directly in the data field to match Android's ApiResponse<List<MaintenancePaymentVerificationDto>>
    return sendResponse(res, 200, 'Pending payment verifications fetched successfully', items);
  } catch (error) {
    console.error('Error fetching payment verifications:', error);
    return sendResponse(res, 500, 'Server error', null, [error.message]);
  }
};

const getPaymentHistory = async (req, res) => {
  try {
    const where = req.user.role === 'admin' ? '1 = 1' : 'm.resident_id = ?';
    const params = req.user.role === 'admin' ? [] : [req.user.id];
    const [payments] = await promisePool.query(
      `SELECT p.id, p.bill_id, p.payment_method, p.transaction_id, p.amount, p.payment_status, p.paid_at, p.created_at, p.updated_at, p.remarks, p.verified_by, p.verified_at, p.rejection_reason, p.receipt_number, p.resident_id, p.rejected_by, p.rejected_at,
              CASE WHEN p.payment_proof IS NOT NULL OR p.screenshot_url IS NOT NULL THEN 1 ELSE 0 END AS has_screenshot,
              p.transaction_id AS utr_number,
              CONCAT('BILL-', m.id) AS bill_number, m.title, m.month, m.year, m.due_date, m.total_amount,
              u.name AS resident_name, f.flat_no
       FROM payments p
       JOIN maintenance m ON p.bill_id = m.id
       JOIN users u ON m.resident_id = u.id
       JOIN flats f ON m.flat_id = f.id
       WHERE ${where}
       ORDER BY p.created_at DESC`,
      params
    );
    return sendResponse(res, 200, 'Payment history fetched successfully', withPaymentScreenshotUrls(req, payments));
  } catch (error) {
    console.error('Get payment history error:', error);
    return sendResponse(res, 500, 'Server error', null, ['Unable to fetch payment history']);
  }
};

const getPaymentReceipt = async (req, res) => {
  try {
    const { id } = req.params;
    const [payments] = await promisePool.query(
      `SELECT p.*, p.transaction_id AS utr_number, p.screenshot_url AS screenshot,
              m.resident_id, CONCAT('BILL-', m.id) AS bill_number, m.title, m.month, m.year, m.due_date, m.total_amount, m.payment_date,
              m.amount AS base_maintenance_charge, m.penalty_amount AS late_fee,
              u.name AS resident_name, f.flat_no, ft.name AS flat_type_name, verifier.name AS verified_by_name
       FROM payments p
       JOIN maintenance m ON p.bill_id = m.id
       JOIN users u ON m.resident_id = u.id
       JOIN flats f ON m.flat_id = f.id
       LEFT JOIN flat_types ft ON m.flat_type_id = ft.id
       LEFT JOIN users verifier ON verifier.id = p.verified_by
       WHERE p.id = ?`,
      [id]
    );
    if (payments.length === 0) {
      return sendResponse(res, 404, 'Payment receipt not found');
    }
    const receipt = withPaymentScreenshotUrls(req, payments)[0];
    if (req.user.role !== 'admin' && receipt.resident_id !== req.user.id) {
      return sendResponse(res, 403, 'You can only access your own receipt');
    }
    if (!['Approved', 'Paid'].includes(receipt.payment_status)) {
      return sendResponse(res, 400, 'Receipt is available only after payment approval');
    }
    return sendResponse(res, 200, 'Payment receipt fetched successfully', receipt);
  } catch (error) {
    console.error('Get payment receipt error:', error);
    return sendResponse(res, 500, 'Server error', null, ['Unable to fetch receipt']);
  }
};

const updatePayment = async (req, res) => {
  try {
    const { id } = req.params;
    const { paymentStatus, remarks } = req.body;
    if (paymentStatus === 'Paid' || paymentStatus === 'APPROVED') {
      return approvePayment(req, res);
    }
    if (paymentStatus === 'Rejected' || paymentStatus === 'REJECTED') {
      req.body.rejectionReason = remarks || req.body.rejectionReason || 'Rejected by admin';
      return rejectPayment(req, res);
    }

    const [paymentRows] = await promisePool.query('SELECT * FROM payments WHERE id = ?', [id]);
    if (paymentRows.length === 0) {
      return sendResponse(res, 404, 'Payment record not found');
    }

    const payment = paymentRows[0];
    const [billRows] = await promisePool.query('SELECT * FROM maintenance WHERE id = ?', [payment.bill_id]);
    if (billRows.length === 0) {
      return sendResponse(res, 404, 'Associated bill not found');
    }

    let newStatus = paymentStatus;
    if (paymentStatus === 'Needs Clarification') newStatus = 'NEEDS_CLARIFICATION';
    else if (paymentStatus === 'Pending Review' || paymentStatus === 'Pending Verification' || paymentStatus === 'Pending') newStatus = 'PENDING_REVIEW';
    
    await promisePool.query(
      'UPDATE payments SET payment_status = ?, remarks = ?, updated_at = NOW() WHERE id = ?',
      [newStatus, remarks || null, id]
    );
    if (['Paid', 'PAID', 'Approved', 'APPROVED'].includes(paymentStatus)) {
      await markMaintenanceBillPaid(promisePool, payment.bill_id);
    } else {
      await promisePool.query(
        `UPDATE maintenance SET status = ? WHERE id = ?`,
        [paymentStatus, payment.bill_id]
      );
    }

    if (newStatus === 'NEEDS_CLARIFICATION') {
      try {
        const residentId = payment.resident_id || billRows[0].resident_id;
        if (residentId) {
          await promisePool.query(
            `INSERT INTO notifications (resident_id, title, message, type, is_read, created_at)
             VALUES (?, 'Clarification Needed', ?, 'payment', false, NOW())`,
            [
              residentId,
              `Your payment proof for ${billRows[0].title || 'Monthly Maintenance'} requires clarification: ${remarks}. Please update your details.`
            ]
          );
        }
      } catch (notificationError) {
        console.error('Clarification notification failed:', notificationError);
      }
    }

    return sendResponse(res, 200, 'Payment updated successfully');
  } catch (error) {
    console.error('Update payment error:', error);
    return sendResponse(res, 500, 'Server error', null, ['Unable to update payment']);
  }
};

const getPayments = async (req, res) => {
  try {
    await reconcilePaidPayments();
    const [payments] = await promisePool.query(`
      SELECT p.id, p.bill_id, p.payment_method, p.transaction_id, p.amount, p.payment_status, p.paid_at, p.created_at, p.updated_at, p.remarks, p.verified_by, p.verified_at, p.rejection_reason, p.receipt_number, p.resident_id, p.rejected_by, p.rejected_at,
             CASE WHEN p.payment_proof IS NOT NULL OR p.screenshot_url IS NOT NULL THEN 1 ELSE 0 END AS has_screenshot,
             p.transaction_id AS utr_number,
             CONCAT('BILL-', m.id) AS bill_number, m.title, m.month, m.year, m.due_date, m.total_amount AS total_amount,
             COALESCE(m.resident_id, p.resident_id) AS resident_id,
             u.name AS resident_name, u.phone AS resident_phone, u.email AS resident_email, f.flat_no, f.wing
      FROM payments p
      LEFT JOIN payment_maintenance pm ON pm.payment_id = p.id
      LEFT JOIN maintenance m ON m.id = COALESCE(pm.maintenance_id, p.bill_id)
      LEFT JOIN users u ON u.id = COALESCE(m.resident_id, p.resident_id)
      LEFT JOIN flats f ON m.flat_id = f.id
      ORDER BY p.created_at DESC
    `);
    const paymentsWithCoveredBills = await withCoveredPaymentBills(promisePool, payments);
    return sendResponse(res, 200, 'Payments fetched successfully', withPaymentScreenshotUrls(req, paymentsWithCoveredBills));
  } catch (error) {
    console.error('Get payments error:', {
      message: error.message,
      code: error.code,
      detail: error.detail,
      stack: error.stack
    });
    return sendResponse(res, 500, 'Unable to fetch payments', null, [error.message || 'Database query failed']);
  }
};

const markBillPaid = async (req, res) => {
  try {
    const { id } = req.params;
    const { paymentMethod = 'Manual', transactionId = `ADMIN-${Date.now()}`, remarks = 'Marked paid by admin', paidAmount } = req.body;

    const [billRows] = await promisePool.query('SELECT * FROM maintenance WHERE id = ?', [id]);
    if (billRows.length === 0) {
      return sendResponse(res, 404, 'Bill not found');
    }

    const bill = billRows[0];
    const totalAmount = Number(bill.total_amount || bill.amount);
    const pAmount = paidAmount !== undefined ? Number(paidAmount) : totalAmount;
    const remaining = Math.max(0, totalAmount - pAmount);
    
    let status = 'Pending';
    if (pAmount >= totalAmount) {
      status = 'Paid';
    } else if (pAmount > 0) {
      status = 'Partial';
    }

    await promisePool.query(
      `INSERT INTO payments (bill_id, payment_method, transaction_id, amount, payment_status, paid_at)
       VALUES (?, ?, ?, ?, ?, NOW())
       ON CONFLICT (bill_id, transaction_id) DO UPDATE SET amount = EXCLUDED.amount, payment_status = EXCLUDED.payment_status`,
      [id, paymentMethod, transactionId, pAmount, status === 'Paid' ? 'Paid' : 'Pending']
    );

    await promisePool.query(
      `UPDATE maintenance
       SET status = ?, payment_date = NOW(), paid_amount = ?, remaining_amount = ?, remarks = ?
       WHERE id = ?`,
      [status, pAmount, remaining, remarks, id]
    );

    return sendResponse(res, 200, 'Bill marked as paid successfully');
  } catch (error) {
    console.error('Mark bill paid error:', error);
    return sendResponse(res, 500, 'Server error', null, ['Unable to mark bill as paid']);
  }
};

const sendPaymentReminder = async (req, res) => {
  try {
    const { id } = req.params;
    const [result] = await promisePool.query(
      `UPDATE maintenance
       SET remarks = CONCAT(COALESCE(remarks, ''), ?)
       WHERE id = ?`,
      [` Reminder sent on ${new Date().toLocaleString('en-IN')}.`, id]
    );

    if (!result.affectedRows) {
      return sendResponse(res, 404, 'Bill not found');
    }

    return sendResponse(res, 200, 'Payment reminder recorded successfully');
  } catch (error) {
    console.error('Send payment reminder error:', error);
    return sendResponse(res, 500, 'Server error', null, ['Unable to send payment reminder']);
  }
};

const getReports = async (req, res) => {
  try {
    const { type } = req.query;
    let query = '';

    switch (type) {
      case 'monthly-collection':
        query = `SELECT EXTRACT(MONTH FROM payment_date) AS month, EXTRACT(YEAR FROM payment_date) AS year, SUM(COALESCE(paid_amount, 0)) AS amount
                 FROM maintenance WHERE payment_date IS NOT NULL AND COALESCE(paid_amount, 0) > 0 GROUP BY EXTRACT(YEAR FROM payment_date), EXTRACT(MONTH FROM payment_date) ORDER BY year DESC, month DESC`;
        break;
      case 'yearly-collection':
        query = `SELECT EXTRACT(YEAR FROM payment_date) AS year, SUM(COALESCE(paid_amount, 0)) AS amount FROM maintenance WHERE payment_date IS NOT NULL AND COALESCE(paid_amount, 0) > 0 GROUP BY EXTRACT(YEAR FROM payment_date) ORDER BY year DESC`;
        break;
      case 'pending-bills':
        query = `SELECT m.*, m.status AS payment_status, m.total_amount AS total_amount, u.name AS resident_name, f.flat_no, ft.name AS flat_type_name FROM maintenance m JOIN users u ON m.resident_id = u.id JOIN flats f ON m.flat_id = f.id LEFT JOIN flat_types ft ON m.flat_type_id = ft.id WHERE COALESCE(m.remaining_amount, m.total_amount) > 0 ORDER BY m.due_date ASC`;
        break;
      case 'paid-bills':
        query = `SELECT m.*, m.status AS payment_status, m.total_amount AS total_amount, u.name AS resident_name, f.flat_no, ft.name AS flat_type_name FROM maintenance m JOIN users u ON m.resident_id = u.id JOIN flats f ON m.flat_id = f.id LEFT JOIN flat_types ft ON m.flat_type_id = ft.id WHERE COALESCE(m.remaining_amount, 0) <= 0 OR m.status = 'Paid' ORDER BY m.payment_date DESC`;
        break;
      case 'defaulters':
        query = `SELECT m.*, m.status AS payment_status, m.total_amount AS total_amount, u.name AS resident_name, f.flat_no, ft.name AS flat_type_name FROM maintenance m JOIN users u ON m.resident_id = u.id JOIN flats f ON m.flat_id = f.id LEFT JOIN flat_types ft ON m.flat_type_id = ft.id WHERE COALESCE(m.remaining_amount, m.total_amount) > 0 AND m.due_date < CURRENT_DATE ORDER BY m.due_date ASC`;
        break;
      case 'income-summary':
        query = `SELECT SUM(total_amount) AS total_bills_generated, SUM(COALESCE(paid_amount, 0)) AS total_collection, SUM(COALESCE(remaining_amount, 0)) AS pending_collection FROM maintenance`;
        break;
      default:
        query = `SELECT COUNT(*) AS total_bills,
                        SUM(CASE WHEN COALESCE(remaining_amount, 0) <= 0 OR status = 'Paid' THEN 1 ELSE 0 END) AS paid_bills,
                        SUM(CASE WHEN COALESCE(remaining_amount, total_amount) > 0 AND (due_date >= CURRENT_DATE OR due_date IS NULL) THEN 1 ELSE 0 END) AS pending_bills,
                        SUM(CASE WHEN due_date < CURRENT_DATE AND COALESCE(remaining_amount, total_amount) > 0 THEN 1 ELSE 0 END) AS overdue_bills,
                        SUM(COALESCE(paid_amount, 0)) AS total_collection,
                        SUM(COALESCE(remaining_amount, 0)) AS pending_collection
                 FROM maintenance`;
    }

    const [rows] = await promisePool.query(query);
    return sendResponse(res, 200, 'Reports fetched successfully', rows);
  } catch (error) {
    console.error('Get reports error:', error);
    return sendResponse(res, 500, 'Server error', null, ['Unable to fetch reports']);
  }
};

const createDetailedWriteOff = async (req, res) => {
  const url = `${req.baseUrl || ''}${req.path}`;
  const method = req.method;
  console.log(`[DETAILED WRITE-OFF DEBUG] Route: ${method} ${url}`);
  console.log('[DETAILED WRITE-OFF DEBUG] Request Body:', JSON.stringify(req.body));

  try {
    const { id } = req.params;
    const { type, reason, amount } = req.body;

    const normalizedType = String(type || '').trim();
    if (!normalizedType || !reason || !String(reason).trim()) {
      return sendResponse(res, 400, 'Type and reason are required');
    }

    const mapType = (t) => {
      const lower = t.toLowerCase();
      if (lower.includes('full') || lower.includes('total')) return 'Full';
      if (lower.includes('penalty')) return 'Penalty';
      if (lower.includes('maintenance')) return 'Maintenance';
      return 'Partial';
    };

    const targetType = mapType(normalizedType);

    const result = await processWriteOffTransaction(
      id,
      targetType,
      amount,
      null, // maintenanceAmount
      null, // penaltyAmount
      reason,
      null, // remarks
      req.user,
      req.ip || req.headers['x-forwarded-for'] || null,
      req.headers['user-agent'] || null
    );

    if (!result.success) {
      console.log(`[DETAILED WRITE-OFF DEBUG] Error Response: status=${result.code}, message=${result.message}`);
      return sendResponse(res, result.code, result.message);
    }

    console.log('[DETAILED WRITE-OFF DEBUG] Success Response:', JSON.stringify(result.data));
    return sendResponse(res, 201, 'Write-off recorded successfully', result.data);

  } catch (error) {
    console.error('[DETAILED WRITE-OFF DEBUG] PostgreSQL / Transaction Error:', error);
    console.error('[DETAILED WRITE-OFF DEBUG] Error Code:', error.code, 'Error Message:', error.message);
    return sendResponse(res, 500, error.message || 'Server error', null, [error.code || 'Unable to record write-off']);
  }
};

const getWriteOffHistory = async (req, res) => {
  try {
    const { resident, flat, wing, month, startDate, endDate, type } = req.query;
    let query = `
      SELECT w.*, m.month, m.year, m.title AS bill_title, m.amount AS bill_amount, m.penalty_amount AS bill_penalty, m.total_amount AS bill_total, m.remaining_amount AS bill_remaining,
             u.name AS resident_name, f.flat_no, f.wing
      FROM write_offs w
      JOIN maintenance m ON w.bill_id = m.id
      JOIN users u ON m.resident_id = u.id
      JOIN flats f ON m.flat_id = f.id
      WHERE 1 = 1
    `;
    const params = [];

    if (resident) {
      query += ` AND (u.name ILIKE ? OR u.id = ?)`;
      params.push(`%${resident}%`, Number(resident) || -1);
    }
    if (flat) {
      query += ` AND f.flat_no = ?`;
      params.push(flat);
    }
    if (wing) {
      query += ` AND f.wing = ?`;
      params.push(wing);
    }
    if (month) {
      query += ` AND m.month = ?`;
      params.push(Number(month));
    }
    if (type) {
      query += ` AND w.type = ?`;
      params.push(type);
    }
    if (startDate) {
      query += ` AND w.created_at >= ?`;
      params.push(new Date(startDate));
    }
    if (endDate) {
      query += ` AND w.created_at <= ?`;
      params.push(new Date(endDate));
    }

    query += ` ORDER BY w.created_at DESC`;

    const [rows] = await promisePool.query(query, params);
    return sendResponse(res, 200, 'Write-off history fetched successfully', rows);
  } catch (error) {
    console.error('Get write-off history error:', error);
    return sendResponse(res, 500, 'Server error', null, ['Unable to fetch write-off history']);
  }
};

const getAGMReport = async (req, res) => {
  try {
    const { financialYear, startDate, endDate, resident, flat, wing, month, type } = req.query;
    
    let whereClause = 'WHERE 1=1';
    const params = [];
    
    if (financialYear) {
      const parts = financialYear.split('-');
      if (parts.length === 2) {
        const startY = Number(parts[0]);
        const endY = Number(parts[1]);
        whereClause += ` AND ((m.year = ? AND m.month >= 4) OR (m.year = ? AND m.month <= 3))`;
        params.push(startY, endY);
      } else {
        whereClause += ` AND m.year = ?`;
        params.push(Number(financialYear));
      }
    }
    
    if (startDate) {
      whereClause += ` AND m.created_at >= ?`;
      params.push(new Date(startDate));
    }
    if (endDate) {
      whereClause += ` AND m.created_at <= ?`;
      params.push(new Date(endDate));
    }
    if (resident) {
      whereClause += ` AND (u.name ILIKE ? OR u.id = ?)`;
      params.push(`%${resident}%`, Number(resident) || -1);
    }
    if (flat) {
      whereClause += ` AND f.flat_no = ?`;
      params.push(flat);
    }
    if (wing) {
      whereClause += ` AND f.wing = ?`;
      params.push(wing);
    }
    if (month) {
      whereClause += ` AND m.month = ?`;
      params.push(Number(month));
    }

    // 1. Financial Summary:
    const [[financialSummary]] = await promisePool.query(`
      SELECT 
        COALESCE(SUM(m.total_amount), 0) AS total_bills_generated,
        COALESCE(SUM(m.paid_amount), 0) AS total_amount_collected,
        COALESCE(SUM(m.remaining_amount), 0) AS outstanding_amount
      FROM maintenance m
      JOIN users u ON m.resident_id = u.id
      JOIN flats f ON m.flat_id = f.id
      ${whereClause}
    `, params);

    // 2. Write-Off Summary & Counts calculated directly from write_offs table:
    let writeOffsWhere = 'WHERE 1=1';
    const writeOffsParams = [];
    if (financialYear && financialYear !== 'All') {
      const parts = financialYear.split('-');
      if (parts.length === 2) {
        const startY = Number(parts[0]);
        const endY = Number(parts[1]);
        writeOffsWhere += ` AND ((m.year = ? AND m.month >= 4) OR (m.year = ? AND m.month <= 3))`;
        writeOffsParams.push(startY, endY);
      } else {
        writeOffsWhere += ` AND m.year = ?`;
        writeOffsParams.push(Number(financialYear));
      }
    }
    if (startDate) {
      writeOffsWhere += ` AND w.created_at >= ?`;
      writeOffsParams.push(new Date(startDate));
    }
    if (endDate) {
      writeOffsWhere += ` AND w.created_at <= ?`;
      writeOffsParams.push(new Date(endDate));
    }
    if (resident) {
      writeOffsWhere += ` AND (u.name ILIKE ? OR u.id = ?)`;
      writeOffsParams.push(`%${resident}%`, Number(resident) || -1);
    }
    if (flat) {
      writeOffsWhere += ` AND f.flat_no = ?`;
      writeOffsParams.push(flat);
    }
    if (wing) {
      writeOffsWhere += ` AND f.wing = ?`;
      writeOffsParams.push(wing);
    }
    if (month) {
      writeOffsWhere += ` AND m.month = ?`;
      writeOffsParams.push(Number(month));
    }
    if (type) {
      writeOffsWhere += ` AND w.type = ?`;
      writeOffsParams.push(type);
    }

    const [[writeOffSummary]] = await promisePool.query(`
      SELECT 
        COALESCE(SUM(w.maintenance_write_off_amount), 0) AS total_maintenance_write_off,
        COALESCE(SUM(w.penalty_write_off_amount), 0) AS total_penalty_write_off,
        COALESCE(SUM(w.amount), 0) AS total_write_off,
        COUNT(w.id) AS total_write_off_count,
        COUNT(CASE WHEN w.type = 'Full' THEN 1 END) AS number_fully_written_off,
        COUNT(CASE WHEN w.maintenance_write_off_amount > 0 THEN 1 END) AS number_maint_write_offs,
        COUNT(CASE WHEN w.penalty_write_off_amount > 0 THEN 1 END) AS number_penalty_write_offs
      FROM write_offs w
      JOIN maintenance m ON w.bill_id = m.id
      JOIN users u ON m.resident_id = u.id
      JOIN flats f ON m.flat_id = f.id
      ${writeOffsWhere}
    `, writeOffsParams);

    // Detailed write-off table with exact amount collected (paid_amount)
    const [detailedTable] = await promisePool.query(`
      SELECT w.*, m.month, m.year, m.title AS bill_title, m.amount AS bill_amount, m.penalty_amount AS bill_penalty, m.total_amount AS bill_total, m.paid_amount AS bill_paid, m.remaining_amount AS bill_remaining,
             u.name AS resident_name, f.flat_no, f.wing
      FROM write_offs w
      JOIN maintenance m ON w.bill_id = m.id
      JOIN users u ON m.resident_id = u.id
      JOIN flats f ON m.flat_id = f.id
      ${writeOffsWhere}
      ORDER BY w.created_at DESC
    `, writeOffsParams);

    let expenseWhere = 'WHERE 1=1';
    const expenseParams = [];
    if (financialYear && financialYear !== 'All') {
      const parts = financialYear.split('-');
      if (parts.length === 2) {
        expenseWhere += ` AND expense_date >= ? AND expense_date <= ?`;
        expenseParams.push(`${parts[0]}-04-01`, `${parts[1]}-03-31`);
      } else {
        expenseWhere += ` AND EXTRACT(YEAR FROM expense_date) = ?`;
        expenseParams.push(Number(financialYear));
      }
    }
    if (startDate) {
      expenseWhere += ` AND expense_date >= ?`;
      expenseParams.push(new Date(startDate));
    }
    if (endDate) {
      expenseWhere += ` AND expense_date <= ?`;
      expenseParams.push(new Date(endDate));
    }

    const [[expenseRow]] = await promisePool.query(`
      SELECT COALESCE(SUM(amount), 0) AS total_expenses 
      FROM maintenance_expenses
      ${expenseWhere}
    `, expenseParams);
    const totalExpenses = Number(expenseRow?.total_expenses || 0);
    const totalCollection = Number(financialSummary.total_amount_collected || 0);

    return sendResponse(res, 200, 'AGM report fetched successfully', {
      financialSummary: {
        totalBillsGenerated: Number(financialSummary.total_bills_generated),
        totalAmountCollected: totalCollection,
        outstandingAmount: Number(financialSummary.outstanding_amount),
        totalExpenses: totalExpenses,
        netBalance: totalCollection - totalExpenses
      },
      writeOffSummary: {
        totalMaintenanceWriteOff: Number(writeOffSummary.total_maintenance_write_off),
        totalPenaltyWriteOff: Number(writeOffSummary.total_penalty_write_off),
        totalWriteOff: Number(writeOffSummary.total_write_off),
        numberMaintenanceWriteOffs: Number(writeOffSummary.number_maint_write_offs),
        numberPenaltyWriteOffs: Number(writeOffSummary.number_penalty_write_offs),
        numberFullyWrittenOff: Number(writeOffSummary.number_fully_written_off),
        numberWriteOffs: Number(writeOffSummary.total_write_off_count)
      },
      detailedTable
    });
  } catch (error) {
    console.error('Get AGM report error:', error);
    return sendResponse(res, 500, 'Server error', null, ['Unable to fetch AGM report']);
  }
};

const getWriteOffReceipt = async (req, res) => {
  try {
    const { id } = req.params;
    const [bills] = await promisePool.query(`
      SELECT m.*, u.name AS resident_name, f.flat_no, ft.name AS flat_type_name
      FROM maintenance m
      JOIN users u ON m.resident_id = u.id
      JOIN flats f ON m.flat_id = f.id
      LEFT JOIN flat_types ft ON m.flat_type_id = ft.id
      WHERE m.id = ?
    `, [id]);

    if (bills.length === 0) {
      return sendResponse(res, 404, 'Bill not found');
    }
    const bill = bills[0];

    if (req.user.role !== 'admin' && req.user.role !== 'super_admin' && bill.resident_id !== req.user.id) {
      return sendResponse(res, 403, 'Access denied. You can only view your own bills.');
    }

    if (Number(bill.write_off_amount) <= 0) {
      return sendResponse(res, 400, 'No write-off details exist for this bill');
    }

    const [writeOffs] = await promisePool.query(`
      SELECT * FROM write_offs WHERE bill_id = ? ORDER BY created_at DESC LIMIT 1
    `, [id]);

    const receipt = {
      id: bill.id,
      bill_id: bill.id,
      bill_number: bill.bill_number || `BILL-${bill.id}`,
      resident_name: bill.resident_name,
      flat_no: bill.flat_no,
      flat_type_name: bill.flat_type_name,
      month: bill.month,
      year: bill.year,
      due_date: bill.due_date,
      base_maintenance_charge: Number(bill.amount),
      late_fee: Number(bill.penalty_amount),
      total_amount: Number(bill.total_amount),
      write_off_amount: Number(bill.write_off_amount),
      remaining_amount: Number(bill.remaining_amount),
      paid_amount: 0,
      reason: writeOffs[0]?.reason || 'Approved write-off',
      approved_by: writeOffs[0]?.admin_name || 'Admin',
      approval_date: writeOffs[0]?.created_at || bill.updated_at
    };

    return sendResponse(res, 200, 'Write-off receipt fetched successfully', receipt);
  } catch (error) {
    console.error('Get write-off receipt error:', error);
    return sendResponse(res, 500, 'Server error', null, ['Unable to fetch write-off receipt']);
  }
};

const reverseWriteOff = async (req, res) => {
  const connection = await promisePool.getConnection();
  try {
    const { id } = req.params;
    await connection.beginTransaction();

    const [writeOffs] = await connection.query('SELECT * FROM write_offs WHERE id = ?', [id]);
    if (writeOffs.length === 0) {
      await connection.rollback();
      return sendResponse(res, 404, 'Write-off record not found');
    }
    const writeOff = writeOffs[0];

    const [bills] = await connection.query('SELECT * FROM maintenance WHERE id = ?', [writeOff.bill_id]);
    if (bills.length === 0) {
      await connection.rollback();
      return sendResponse(res, 404, 'Associated bill not found');
    }
    const bill = bills[0];

    const newMaintWriteOffTotal = Math.max(0, Number(bill.maintenance_write_off_amount || 0) - Number(writeOff.maintenance_write_off_amount));
    const newPenaltyWriteOffTotal = Math.max(0, Number(bill.penalty_write_off_amount || 0) - Number(writeOff.penalty_write_off_amount));
    const newWriteOffTotal = Math.max(0, Number(bill.write_off_amount || 0) - Number(writeOff.amount));
    const newRemaining = Number(bill.remaining_amount || 0) + Number(writeOff.amount);
    
    let newStatus = 'Pending';
    if (bill.due_date && new Date(bill.due_date) < new Date()) {
      newStatus = 'Overdue';
    }

    let writeOffStatus = null;
    if (newWriteOffTotal > 0) {
      if (newRemaining <= 0) {
        writeOffStatus = 'Fully Written Off';
      } else if (newMaintWriteOffTotal > 0 && newPenaltyWriteOffTotal === 0) {
        writeOffStatus = 'Maintenance Written Off';
      } else if (newPenaltyWriteOffTotal > 0 && newMaintWriteOffTotal === 0) {
        writeOffStatus = 'Penalty Written Off';
      } else {
        writeOffStatus = 'Partially Written Off';
      }
    }

    await connection.query(
      `UPDATE maintenance
       SET remaining_amount = ?, write_off_amount = ?, maintenance_write_off_amount = ?, penalty_write_off_amount = ?, status = ?, write_off_status = ?, updated_at = NOW()
       WHERE id = ?`,
      [newRemaining, newWriteOffTotal, newMaintWriteOffTotal, newPenaltyWriteOffTotal, newStatus, writeOffStatus, writeOff.bill_id]
    );

    await connection.query('DELETE FROM write_offs WHERE id = ?', [id]);

    const auditDetails = {
      writeOffId: id,
      billId: writeOff.bill_id,
      reversedAmount: writeOff.amount,
      adminName: req.user.name || 'Super Admin',
      dateTime: new Date().toISOString()
    };
    await connection.query(
      `INSERT INTO maintenance_audit_logs (user_id, action, entity_type, entity_id, details)
       VALUES (?, ?, ?, ?, ?)`,
      [req.user.id, 'REVERSE_WRITE_OFF', 'WRITE_OFF', id, JSON.stringify(auditDetails)]
    );

    await connection.query(
      `INSERT INTO notifications (resident_id, title, message, type, is_read, created_at)
       VALUES (?, ?, ?, 'maintenance', false, NOW())`,
      [
        bill.resident_id,
        'Write-Off Reversed',
        `A write-off of ₹${Number(writeOff.amount).toLocaleString('en-IN')} has been reversed for your bill: ${bill.title}.`,
      ]
    );

    await connection.commit();
    return sendResponse(res, 200, 'Write-off reversed successfully');
  } catch (error) {
    try { await connection.rollback(); } catch (e) {}
    console.error('Reverse write-off error:', error);
    return sendResponse(res, 500, 'Server error', null, ['Unable to reverse write-off']);
  } finally {
    connection.release();
  }
};

const editWriteOff = async (req, res) => {
  const connection = await promisePool.getConnection();
  try {
    const { id } = req.params;
    const { reason, amount } = req.body;

    if (!reason || amount === undefined || Number(amount) <= 0) {
      return sendResponse(res, 400, 'Reason and valid amount are required');
    }

    await connection.beginTransaction();

    const [writeOffs] = await connection.query('SELECT * FROM write_offs WHERE id = ?', [id]);
    if (writeOffs.length === 0) {
      await connection.rollback();
      return sendResponse(res, 404, 'Write-off record not found');
    }
    const writeOff = writeOffs[0];

    const [bills] = await connection.query('SELECT * FROM maintenance WHERE id = ?', [writeOff.bill_id]);
    if (bills.length === 0) {
      await connection.rollback();
      return sendResponse(res, 404, 'Associated bill not found');
    }
    const bill = bills[0];

    const oldAmount = Number(writeOff.amount);
    const newAmount = Number(amount);
    const diff = newAmount - oldAmount;

    const remaining = Number(bill.remaining_amount || 0);
    if (diff > remaining) {
      await connection.rollback();
      return sendResponse(res, 400, `Cannot increase write-off by ${diff} because bill remaining payable is only ${remaining}`);
    }

    let newMaintWriteOff = Number(writeOff.maintenance_write_off_amount);
    let newPenaltyWriteOff = Number(writeOff.penalty_write_off_amount);

    if (writeOff.type === 'Maintenance') {
      newMaintWriteOff = newAmount;
      const maxMaintWriteOff = Math.max(0, Number(bill.amount) - Number(bill.maintenance_write_off_amount || 0) + oldAmount);
      if (newMaintWriteOff > maxMaintWriteOff) {
        await connection.rollback();
        return sendResponse(res, 400, `Write-off exceeds maximum maintenance capacity of ${maxMaintWriteOff}`);
      }
    } else if (writeOff.type === 'Penalty') {
      newPenaltyWriteOff = newAmount;
      const maxPenaltyWriteOff = Math.max(0, Number(bill.penalty_amount) - Number(bill.penalty_write_off_amount || 0) + oldAmount);
      if (newPenaltyWriteOff > maxPenaltyWriteOff) {
        await connection.rollback();
        return sendResponse(res, 400, `Write-off exceeds maximum penalty capacity of ${maxPenaltyWriteOff}`);
      }
    } else if (writeOff.type === 'Full') {
      const capacity = Number(bill.amount) + Number(bill.penalty_amount);
      if (newAmount > capacity) {
        await connection.rollback();
        return sendResponse(res, 400, `Full write-off cannot exceed bill capacity of ${capacity}`);
      }
      newMaintWriteOff = Math.min(newAmount, Number(bill.amount));
      newPenaltyWriteOff = Math.max(0, newAmount - newMaintWriteOff);
    }

    await connection.query(
      `UPDATE write_offs
       SET amount = ?, maintenance_write_off_amount = ?, penalty_write_off_amount = ?, reason = ?
       WHERE id = ?`,
      [newAmount, newMaintWriteOff, newPenaltyWriteOff, reason.trim(), id]
    );

    const newBillMaintWriteOff = Math.max(0, Number(bill.maintenance_write_off_amount || 0) - Number(writeOff.maintenance_write_off_amount) + newMaintWriteOff);
    const newBillPenaltyWriteOff = Math.max(0, Number(bill.penalty_write_off_amount || 0) - Number(writeOff.penalty_write_off_amount) + newPenaltyWriteOff);
    const newBillWriteOff = Math.max(0, Number(bill.write_off_amount || 0) - oldAmount + newAmount);
    const newRemaining = Math.max(0, remaining - diff);
    const newStatus = newRemaining <= 0 ? 'Paid' : (bill.status === 'Paid' ? 'Pending' : bill.status);

    let writeOffStatus = 'Partially Written Off';
    if (newRemaining <= 0) {
      writeOffStatus = 'Fully Written Off';
    } else if (newBillMaintWriteOff > 0 && newBillPenaltyWriteOff === 0) {
      writeOffStatus = 'Maintenance Written Off';
    } else if (newBillPenaltyWriteOff > 0 && newBillMaintWriteOff === 0) {
      writeOffStatus = 'Penalty Written Off';
    }

    await connection.query(
      `UPDATE maintenance
       SET remaining_amount = ?, write_off_amount = ?, maintenance_write_off_amount = ?, penalty_write_off_amount = ?, status = ?, write_off_status = ?, updated_at = NOW()
       WHERE id = ?`,
      [newRemaining, newBillWriteOff, newBillMaintWriteOff, newBillPenaltyWriteOff, newStatus, writeOffStatus, writeOff.bill_id]
    );

    const auditDetails = {
      writeOffId: id,
      billId: writeOff.bill_id,
      oldAmount,
      newAmount,
      reason,
      adminName: req.user.name || 'Super Admin',
      dateTime: new Date().toISOString()
    };
    await connection.query(
      `INSERT INTO maintenance_audit_logs (user_id, action, entity_type, entity_id, details)
       VALUES (?, ?, ?, ?, ?)`,
      [req.user.id, 'EDIT_WRITE_OFF', 'WRITE_OFF', id, JSON.stringify(auditDetails)]
    );

    await connection.commit();
    return sendResponse(res, 200, 'Write-off updated successfully');
  } catch (error) {
    try { await connection.rollback(); } catch (e) {}
    console.error('Edit write-off error:', error);
    return sendResponse(res, 500, 'Server error', null, ['Unable to update write-off']);
  } finally {
    connection.release();
  }
};

const getCurrentIndianFY = () => {
  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();
  const startYear = month >= 4 ? year : year - 1;
  return `${startYear}-${startYear + 1}`;
};

const parseFinancialYear = (fyStr) => {
  const fy = fyStr || getCurrentIndianFY();
  const parts = fy.split('-');
  const startYear = parseInt(parts[0], 10) || 2026;
  const endYear = parseInt(parts[1], 10) || (startYear + 1);
  return {
    fy,
    startDate: `${startYear}-04-01`,
    endDate: `${endYear}-03-31`,
    startYear,
    endYear
  };
};

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const formatMonthName = (month) => {
  if (typeof month === 'number') {
    return MONTH_NAMES[month - 1] || String(month);
  }
  if (typeof month === 'string' && /^\d+$/.test(month.trim())) {
    const num = parseInt(month.trim(), 10);
    return MONTH_NAMES[num - 1] || month;
  }
  return month;
};

const getFYOpeningBalance = async (fyInfo) => {
  const [exactRows] = await promisePool.query(
    'SELECT bank_opening, cash_opening FROM society_opening_balances WHERE financial_year = ?',
    [fyInfo.fy]
  );
  if (exactRows && exactRows.length > 0) {
    return {
      bankOpening: Number(exactRows[0].bank_opening ?? 0.00),
      cashOpening: Number(exactRows[0].cash_opening ?? 0.00)
    };
  }

  // Start from earliest recorded initial opening balance
  const [initialRows] = await promisePool.query(
    'SELECT bank_opening, cash_opening FROM society_opening_balances ORDER BY id ASC LIMIT 1'
  );
  let baseBank = Number(initialRows?.[0]?.bank_opening ?? 0.00);
  let baseCash = Number(initialRows?.[0]?.cash_opening ?? 0.00);

  // Approved payments prior to FY start date (April 1 of startYear)
  const [priorPayments] = await promisePool.query(
    `SELECT p.amount, p.payment_method, p.payment_account,
            COALESCE(m.month, EXTRACT(MONTH FROM COALESCE(p.paid_at, p.created_at))) AS month,
            COALESCE(m.year, EXTRACT(YEAR FROM COALESCE(p.paid_at, p.created_at))) AS year
     FROM payments p
     LEFT JOIN maintenance m ON p.bill_id = m.id
     WHERE p.payment_status IN ('Paid', 'Approved')`
  );

  // Direct paid bills prior to FY start date
  const [priorDirectPaid] = await promisePool.query(
    `SELECT COALESCE(m.paid_amount, m.amount) AS amount, m.month, m.year
     FROM maintenance m
     WHERE m.status IN ('Paid', 'PAID')
       AND NOT EXISTS (SELECT 1 FROM payments p WHERE p.bill_id = m.id AND p.payment_status IN ('Paid', 'Approved'))`
  );

  // Approved expenses prior to FY start date
  const [priorExpenses] = await promisePool.query(
    `SELECT e.amount, e.payment_account,
            EXTRACT(MONTH FROM e.expense_date) AS month,
            EXTRACT(YEAR FROM e.expense_date) AS year
     FROM maintenance_expenses e
     WHERE COALESCE(e.status, 'Paid') = 'Paid'`
  );

  const isPriorPeriod = (m, y) => {
    const monthNum = Number(m);
    const yearNum = Number(y);
    if (!monthNum || !yearNum) return false;
    return yearNum < fyInfo.startYear;
  };

  let priorBankInc = priorPayments
    .filter((p) => isPriorPeriod(p.month, p.year) && (p.payment_account === 'BANK' || String(p.payment_method || '').toLowerCase() !== 'cash'))
    .reduce((sum, p) => sum + Number(p.amount || 0), 0);
  priorBankInc += priorDirectPaid
    .filter((b) => isPriorPeriod(b.month, b.year))
    .reduce((sum, b) => sum + Number(b.amount || 0), 0);

  const priorCashInc = priorPayments
    .filter((p) => isPriorPeriod(p.month, p.year) && (p.payment_account === 'CASH' || String(p.payment_method || '').toLowerCase() === 'cash'))
    .reduce((sum, p) => sum + Number(p.amount || 0), 0);

  const priorBankExp = priorExpenses
    .filter((e) => isPriorPeriod(e.month, e.year) && (e.payment_account || 'BANK') === 'BANK')
    .reduce((sum, e) => sum + Number(e.amount || 0), 0);

  const priorCashExp = priorExpenses
    .filter((e) => isPriorPeriod(e.month, e.year) && e.payment_account === 'CASH')
    .reduce((sum, e) => sum + Number(e.amount || 0), 0);

  return {
    bankOpening: baseBank + priorBankInc - priorBankExp,
    cashOpening: baseCash + priorCashInc - priorCashExp
  };
};

const getFinancialAccountingReport = async (req, res) => {
  try {
    const { financialYear } = req.query;
    const fyInfo = parseFinancialYear(financialYear);
    const openingBalances = await getFYOpeningBalance(fyInfo);

    const baseBankOpening = openingBalances.bankOpening;
    const baseCashOpening = openingBalances.cashOpening;

    const [payments] = await promisePool.query(
      `SELECT p.id, p.amount, p.payment_method, p.payment_account, p.paid_at, p.created_at,
              COALESCE(m.month, EXTRACT(MONTH FROM COALESCE(p.paid_at, p.created_at))) AS month,
              COALESCE(m.year, EXTRACT(YEAR FROM COALESCE(p.paid_at, p.created_at))) AS year
       FROM payments p
       LEFT JOIN maintenance m ON p.bill_id = m.id
       WHERE p.payment_status IN ('Paid', 'Approved')`
    );

    const [directPaidBills] = await promisePool.query(
      `SELECT m.id, COALESCE(m.paid_amount, m.amount) AS amount, m.payment_date,
              m.month AS month,
              m.year AS year
       FROM maintenance m
       WHERE m.status IN ('Paid', 'PAID')
         AND NOT EXISTS (SELECT 1 FROM payments p WHERE p.bill_id = m.id AND p.payment_status IN ('Paid', 'Approved'))`
    );

    const [expenses] = await promisePool.query(
      `SELECT e.id, e.amount, e.payment_method, e.payment_account, e.expense_date,
              EXTRACT(MONTH FROM e.expense_date) AS month,
              EXTRACT(YEAR FROM e.expense_date) AS year
       FROM maintenance_expenses e
       WHERE COALESCE(e.status, 'Paid') = 'Paid'`
    );

    const [pendingRows] = await promisePool.query(
      `SELECT SUM(COALESCE(remaining_amount, total_amount, amount, 0)) AS total_pending
       FROM maintenance
       WHERE status NOT IN ('Paid', 'PAID', 'Waived', 'Cancelled', 'SETTLED', 'WRITTEN_OFF')`
    );

    const pendingMaintenance = Number(pendingRows?.[0]?.total_pending || 0);

    // Fetch month-wise write-off records for the financial year
    const [writeOffRows] = await promisePool.query(
      `SELECT 
         EXTRACT(MONTH FROM w.created_at) AS month,
         EXTRACT(YEAR FROM w.created_at) AS year,
         SUM(CASE WHEN LOWER(COALESCE(w.writeoff_type, '')) = 'penalty' THEN COALESCE(w.amount, 0) ELSE 0 END) AS penalty_write_off,
         SUM(CASE WHEN LOWER(COALESCE(w.writeoff_type, '')) != 'penalty' THEN COALESCE(w.amount, 0) ELSE 0 END) AS maintenance_write_off,
         SUM(COALESCE(w.amount, 0)) AS total_write_off
       FROM maintenance_writeoffs w
       WHERE w.created_at >= ? AND w.created_at <= ?
       GROUP BY EXTRACT(MONTH FROM w.created_at), EXTRACT(YEAR FROM w.created_at)`,
      [`${fyInfo.startDate} 00:00:00`, `${fyInfo.endDate} 23:59:59`]
    );

    const [billWriteOffRows] = await promisePool.query(
      `SELECT 
         m.month,
         m.year,
         SUM(COALESCE(m.maintenance_write_off_amount, CASE WHEN COALESCE(m.write_off_amount, 0) > 0 AND (m.penalty_write_off_amount IS NULL OR m.penalty_write_off_amount = 0) THEN m.write_off_amount ELSE 0 END, 0)) AS maintenance_write_off,
         SUM(COALESCE(m.penalty_write_off_amount, 0)) AS penalty_write_off,
         SUM(COALESCE(m.write_off_amount, 0)) AS total_write_off
       FROM maintenance m
       WHERE COALESCE(m.write_off_amount, 0) > 0
         AND m.created_at >= ? AND m.created_at <= ?
       GROUP BY m.month, m.year`,
      [`${fyInfo.startDate} 00:00:00`, `${fyInfo.endDate} 23:59:59`]
    );

    const fyMonths = [
      { monthNum: 1, name: 'January', year: fyInfo.startYear },
      { monthNum: 2, name: 'February', year: fyInfo.startYear },
      { monthNum: 3, name: 'March', year: fyInfo.startYear },
      { monthNum: 4, name: 'April', year: fyInfo.startYear },
      { monthNum: 5, name: 'May', year: fyInfo.startYear },
      { monthNum: 6, name: 'June', year: fyInfo.startYear },
      { monthNum: 7, name: 'July', year: fyInfo.startYear },
      { monthNum: 8, name: 'August', year: fyInfo.startYear },
      { monthNum: 9, name: 'September', year: fyInfo.startYear },
      { monthNum: 10, name: 'October', year: fyInfo.startYear },
      { monthNum: 11, name: 'November', year: fyInfo.startYear },
      { monthNum: 12, name: 'December', year: fyInfo.startYear }
    ];

    let currentBankBal = baseBankOpening;
    let currentCashBal = baseCashOpening;

    const monthlyBreakdown = [];

    for (const mObj of fyMonths) {
      const monthBankOpening = currentBankBal;
      const monthCashOpening = currentCashBal;
      const monthTotalOpening = monthBankOpening + monthCashOpening;

      const isMatchYear = (y) => {
        const ny = Number(y);
        return ny === mObj.year || ny === fyInfo.startYear || ny === fyInfo.endYear;
      };

      const monthPayments = payments.filter((p) => Number(p.month) === mObj.monthNum && isMatchYear(p.year));
      const monthDirectPaid = directPaidBills.filter((b) => Number(b.month) === mObj.monthNum && isMatchYear(b.year));
      const monthExpenses = expenses.filter((e) => Number(e.month) === mObj.monthNum && isMatchYear(e.year));

      let bankIncome = monthPayments
        .filter((p) => p.payment_account === 'BANK' || String(p.payment_method || '').toLowerCase() !== 'cash')
        .reduce((sum, p) => sum + Number(p.amount || 0), 0);

      bankIncome += monthDirectPaid.reduce((sum, b) => sum + Number(b.amount || 0), 0);

      const cashIncome = monthPayments
        .filter((p) => p.payment_account === 'CASH' || String(p.payment_method || '').toLowerCase() === 'cash')
        .reduce((sum, p) => sum + Number(p.amount || 0), 0);

      const bankExpense = monthExpenses
        .filter((e) => (e.payment_account || 'BANK') === 'BANK')
        .reduce((sum, e) => sum + Number(e.amount || 0), 0);

      const cashExpense = monthExpenses
        .filter((e) => e.payment_account === 'CASH')
        .reduce((sum, e) => sum + Number(e.amount || 0), 0);

      const totalIncome = bankIncome + cashIncome;
      const totalExpense = bankExpense + cashExpense;

      // Calculate write-offs for this month
      const monthWriteOffs = writeOffRows.filter((w) => Number(w.month) === mObj.monthNum && isMatchYear(w.year));
      const monthBillWO = billWriteOffRows.filter((w) => Number(w.month) === mObj.monthNum && isMatchYear(w.year));

      let maintenanceWriteOff = monthWriteOffs.reduce((sum, w) => sum + Number(w.maintenance_write_off || 0), 0);
      let penaltyWriteOff = monthWriteOffs.reduce((sum, w) => sum + Number(w.penalty_write_off || 0), 0);

      if (maintenanceWriteOff === 0 && penaltyWriteOff === 0 && monthBillWO.length > 0) {
        maintenanceWriteOff = monthBillWO.reduce((sum, w) => sum + Number(w.maintenance_write_off || 0), 0);
        penaltyWriteOff = monthBillWO.reduce((sum, w) => sum + Number(w.penalty_write_off || 0), 0);
      }

      const totalWriteOff = maintenanceWriteOff + penaltyWriteOff;

      const bankClosing = monthBankOpening + bankIncome - bankExpense;
      const cashClosing = monthCashOpening + cashIncome - cashExpense;
      const totalClosing = bankClosing + cashClosing;

      const netSurplus = totalIncome > totalExpense ? totalIncome - totalExpense : 0;
      const netDeficit = totalExpense > totalIncome ? totalExpense - totalIncome : 0;

      currentBankBal = bankClosing;
      currentCashBal = cashClosing;

      // Cumulative pending maintenance up to end of this month
      const [cumulativePendingRows] = await promisePool.query(
        `SELECT SUM(COALESCE(remaining_amount, total_amount, amount, 0)) AS pending
         FROM maintenance
         WHERE status NOT IN ('Paid', 'PAID', 'Waived', 'Cancelled', 'SETTLED', 'WRITTEN_OFF')
           AND (year < ? OR (year = ? AND month <= ?))`,
        [mObj.year, mObj.year, mObj.monthNum]
      );
      const monthPendingMaintenance = Number(cumulativePendingRows?.[0]?.pending || 0);

      monthlyBreakdown.push({
        month: mObj.name,
        monthNum: mObj.monthNum,
        year: mObj.year,
        bankOpening: monthBankOpening,
        cashOpening: monthCashOpening,
        totalOpening: monthTotalOpening,
        bankIncome,
        cashIncome,
        totalIncome,
        bankExpense,
        cashExpense,
        totalExpense,
        maintenanceWriteOff,
        penaltyWriteOff,
        totalWriteOff,
        bankClosing,
        cashClosing,
        totalClosing,
        netSurplus,
        netDeficit,
        pendingMaintenance: monthPendingMaintenance
      });
    }

    const fyBankIncome = monthlyBreakdown.reduce((s, m) => s + m.bankIncome, 0);
    const fyCashIncome = monthlyBreakdown.reduce((s, m) => s + m.cashIncome, 0);
    const fyTotalIncome = fyBankIncome + fyCashIncome;

    const fyBankExpense = monthlyBreakdown.reduce((s, m) => s + m.bankExpense, 0);
    const fyCashExpense = monthlyBreakdown.reduce((s, m) => s + m.cashExpense, 0);
    const fyTotalExpense = fyBankExpense + fyCashExpense;

    const fyMaintenanceWriteOff = monthlyBreakdown.reduce((s, m) => s + m.maintenanceWriteOff, 0);
    const fyPenaltyWriteOff = monthlyBreakdown.reduce((s, m) => s + m.penaltyWriteOff, 0);
    const fyTotalWriteOff = fyMaintenanceWriteOff + fyPenaltyWriteOff;

    const fyBankClosing = currentBankBal;
    const fyCashClosing = currentCashBal;
    const fyTotalClosing = fyBankClosing + fyCashClosing;

    const collectionDenominator = fyTotalIncome + pendingMaintenance;
    const collectionPercentage = collectionDenominator > 0 ? Math.round((fyTotalIncome / collectionDenominator) * 100) : 0;

    return sendResponse(res, 200, 'Financial report generated successfully', {
      financialYear: fyInfo.fy,
      summary: {
        totalOpening: baseBankOpening + baseCashOpening,
        bankOpening: baseBankOpening,
        cashOpening: baseCashOpening,
        totalIncome: fyTotalIncome,
        bankIncome: fyBankIncome,
        cashIncome: fyCashIncome,
        totalExpense: fyTotalExpense,
        bankExpense: fyBankExpense,
        cashExpense: fyCashExpense,
        maintenanceWriteOff: fyMaintenanceWriteOff,
        penaltyWriteOff: fyPenaltyWriteOff,
        totalWriteOff: fyTotalWriteOff,
        totalClosing: fyTotalClosing,
        bankClosing: fyBankClosing,
        cashClosing: fyCashClosing,
        pendingMaintenance,
        collectionPercentage
      },
      monthlyBreakdown
    });
  } catch (error) {
    console.error('Financial report error:', error);
    return sendResponse(res, 500, 'Server error generating financial report');
  }
};

const getBankLedgerReport = async (req, res) => {
  try {
    const { financialYear } = req.query;
    const fyInfo = parseFinancialYear(financialYear);
    const openingBalances = await getFYOpeningBalance(fyInfo);
    const openingBalance = openingBalances.bankOpening;

    const [payments] = await promisePool.query(
      `SELECT p.id, COALESCE(p.paid_at, p.created_at) AS date, 'Maintenance Income' AS transaction_type,
              CONCAT('Maintenance payment from ', COALESCE(u.name, 'Resident'), ' (Flat ', COALESCE(f.flat_no, '—'), ')') AS description,
              p.amount AS income, 0 AS expense, COALESCE(p.transaction_id, CONCAT('PAY-', p.id)) AS reference,
              p.payment_status AS approval_status, 'Admin' AS approved_by
       FROM payments p
       LEFT JOIN users u ON p.resident_id = u.id
       LEFT JOIN maintenance m ON p.bill_id = m.id
       LEFT JOIN flats f ON m.flat_id = f.id
       WHERE p.payment_status IN ('Paid', 'Approved')
         AND (p.payment_account = 'BANK' OR LOWER(COALESCE(p.payment_method, '')) != 'cash')
         AND COALESCE(p.paid_at, p.created_at) >= ?
         AND COALESCE(p.paid_at, p.created_at) <= ?::date + INTERVAL '1 day'`,
      [fyInfo.startDate, fyInfo.endDate]
    );

    const [expenses] = await promisePool.query(
      `SELECT e.id, e.expense_date AS date, CONCAT(e.category, ' Expense') AS transaction_type,
              CONCAT(e.description, ' (Vendor: ', e.vendor, ')') AS description,
              0 AS income, e.amount AS expense, e.expense_number AS reference,
              COALESCE(e.status, 'Paid') AS approval_status, 'Admin' AS approved_by
       FROM maintenance_expenses e
       WHERE COALESCE(e.status, 'Paid') = 'Paid'
         AND (e.payment_account = 'BANK' OR e.payment_account IS NULL)
         AND e.expense_date >= ?
         AND e.expense_date <= ?`,
      [fyInfo.startDate, fyInfo.endDate]
    );

    const allTxns = [...payments, ...expenses].sort((a, b) => new Date(a.date) - new Date(b.date));

    let runningBal = openingBalance;
    const ledger = allTxns.map((t) => {
      runningBal = runningBal + Number(t.income || 0) - Number(t.expense || 0);
      return {
        ...t,
        runningBalance: runningBal
      };
    });

    return sendResponse(res, 200, 'Bank ledger generated successfully', {
      openingBalance,
      closingBalance: runningBal,
      ledger
    });
  } catch (error) {
    console.error('Bank ledger error:', error);
    return sendResponse(res, 500, 'Server error generating bank ledger');
  }
};

const getCashLedgerReport = async (req, res) => {
  try {
    const { financialYear } = req.query;
    const fyInfo = parseFinancialYear(financialYear);
    const openingBalances = await getFYOpeningBalance(fyInfo);
    const openingBalance = openingBalances.cashOpening;

    const [payments] = await promisePool.query(
      `SELECT p.id, COALESCE(p.paid_at, p.created_at) AS date, 'Cash Maintenance Collection' AS transaction_type,
              CONCAT('Cash payment from ', COALESCE(u.name, 'Resident'), ' (Flat ', COALESCE(f.flat_no, '—'), ')') AS description,
              p.amount AS income, 0 AS expense, 'Admin' AS recorded_by, 'Admin' AS approved_by
       FROM payments p
       LEFT JOIN users u ON p.resident_id = u.id
       LEFT JOIN maintenance m ON p.bill_id = m.id
       LEFT JOIN flats f ON m.flat_id = f.id
       WHERE p.payment_status IN ('Paid', 'Approved')
         AND (p.payment_account = 'CASH' OR LOWER(COALESCE(p.payment_method, '')) = 'cash')
         AND COALESCE(p.paid_at, p.created_at) >= ?
         AND COALESCE(p.paid_at, p.created_at) <= ?::date + INTERVAL '1 day'`,
      [fyInfo.startDate, fyInfo.endDate]
    );

    const [expenses] = await promisePool.query(
      `SELECT e.id, e.expense_date AS date, CONCAT('Cash Expense - ', e.category) AS transaction_type,
              CONCAT(e.description, ' (Vendor: ', e.vendor, ')') AS description,
              0 AS income, e.amount AS expense, 'Admin' AS recorded_by, 'Admin' AS approved_by
       FROM maintenance_expenses e
       WHERE COALESCE(e.status, 'Paid') = 'Paid'
         AND e.payment_account = 'CASH'
         AND e.expense_date >= ?
         AND e.expense_date <= ?`,
      [fyInfo.startDate, fyInfo.endDate]
    );

    const allTxns = [...payments, ...expenses].sort((a, b) => new Date(a.date) - new Date(b.date));

    let runningBal = openingBalance;
    const ledger = allTxns.map((t) => {
      runningBal = runningBal + Number(t.income || 0) - Number(t.expense || 0);
      return {
        ...t,
        runningBalance: runningBal
      };
    });

    return sendResponse(res, 200, 'Cash ledger generated successfully', {
      openingBalance,
      closingBalance: runningBal,
      ledger
    });
  } catch (error) {
    console.error('Cash ledger error:', error);
    return sendResponse(res, 500, 'Server error generating cash ledger');
  }
};

const getFlatCollectionReport = async (req, res) => {
  try {
    const { financialYear, month, wing, flatNo, status } = req.query;
    const fyInfo = parseFinancialYear(financialYear);

    // Fetch all maintenance bills for the financial year
    const [rawBills] = await promisePool.query(
      `SELECT m.id AS bill_id, m.flat_id, m.resident_id, m.month, m.year,
              m.amount AS bill_amount,
              m.write_off_amount,
              m.status,
              m.created_at,
              u.name AS resident_name, f.flat_no, f.wing
       FROM maintenance m
       LEFT JOIN users u ON m.resident_id = u.id
       LEFT JOIN flats f ON m.flat_id = f.id
       ORDER BY f.wing ASC, f.flat_no ASC, m.year ASC, m.month ASC`
    );

    // Fetch all approved payments for these bills
    const [approvedPayments] = await promisePool.query(
      `SELECT p.id, p.bill_id, p.amount, p.paid_at, p.created_at, p.payment_status
       FROM payments p
       WHERE p.payment_status IN ('Paid', 'Approved')`
    );

    // Group bills by flat_id
    const flatMap = {};
    for (const bill of rawBills) {
      const fKey = bill.flat_id || `${bill.wing}-${bill.flat_no}`;
      if (!flatMap[fKey]) flatMap[fKey] = [];
      flatMap[fKey].push(bill);
    }

    const calculatedRows = [];

    // For each flat, compute carry-forward outstanding balance month by month
    for (const fKey of Object.keys(flatMap)) {
      const bills = flatMap[fKey];
      let runningOutstanding = 0;

      for (const b of bills) {
        const openingOutstanding = runningOutstanding;
        const bAmount = Number(b.bill_amount || 0);

        // Find approved payments for this bill
        const billPayments = approvedPayments.filter((p) => Number(p.bill_id) === Number(b.bill_id));
        let paidAmount = billPayments.reduce((sum, p) => sum + Number(p.amount || 0), 0);

        // Check if bill itself marked paid with no payment record
        if (paidAmount === 0 && String(b.status).toUpperCase() === 'PAID') {
          paidAmount = bAmount;
        }

        const closingOutstanding = Math.max(0, openingOutstanding + bAmount - paidAmount);
        runningOutstanding = closingOutstanding;

        const monthName = formatMonthName(b.month);

        calculatedRows.push({
          bill_id: b.bill_id,
          flat_id: b.flat_id,
          wing: b.wing || '—',
          flat_no: b.flat_no || '—',
          resident_name: b.resident_name || '—',
          month_number: b.month,
          month: monthName,
          year: b.year,
          opening_outstanding: openingOutstanding,
          bill_amount: bAmount,
          paid_amount: paidAmount,
          pending_amount: closingOutstanding,
          closing_outstanding: closingOutstanding,
          payment_date: billPayments[0]?.paid_at || billPayments[0]?.created_at || null,
          status: closingOutstanding <= 0 ? 'Paid' : (paidAmount > 0 ? 'Partial' : 'Pending')
        });
      }
    }

    // Apply filters on the calculated rows for the requested financial year
    let filtered = calculatedRows.filter((r) => {
      const inFY = (r.year === fyInfo.startYear && r.month_number >= 4) || (r.year === fyInfo.endYear && r.month_number <= 3);
      return inFY;
    });

    if (month && month !== 'All') {
      const mNum = parseInt(month, 10);
      filtered = filtered.filter((r) => r.month_number === mNum || String(r.month).toLowerCase() === String(month).toLowerCase());
    }
    if (wing && wing !== 'All') {
      filtered = filtered.filter((r) => String(r.wing).toLowerCase() === String(wing).toLowerCase());
    }
    if (flatNo && flatNo.trim()) {
      const target = flatNo.trim().toLowerCase();
      filtered = filtered.filter((r) => String(r.flat_no).toLowerCase().includes(target));
    }
    if (status && status !== 'All') {
      filtered = filtered.filter((r) => String(r.status).toLowerCase() === String(status).toLowerCase());
    }

    return sendResponse(res, 200, 'Flat collection report generated successfully', filtered);
  } catch (error) {
    console.error('Flat collection report error:', error);
    return sendResponse(res, 500, 'Server error generating flat collection report');
  }
};

const saveOpeningBalance = async (req, res) => {
  try {
    const { financialYear, bankOpening, cashOpening } = req.body;
    if (!financialYear) {
      return sendResponse(res, 400, 'Financial year is required');
    }

    const bOpen = Number(bankOpening || 0);
    const cOpen = Number(cashOpening || 0);

    await promisePool.query(
      `INSERT INTO society_opening_balances (financial_year, bank_opening, cash_opening)
       VALUES (?, ?, ?)
       ON CONFLICT (financial_year)
       DO UPDATE SET bank_opening = EXCLUDED.bank_opening, cash_opening = EXCLUDED.cash_opening, updated_at = NOW()`,
      [financialYear, bOpen, cOpen]
    );

    return sendResponse(res, 200, 'Opening balance saved successfully', {
      financialYear,
      bankOpening: bOpen,
      cashOpening: cOpen
    });
  } catch (error) {
    console.error('Save opening balance error:', error);
    return sendResponse(res, 500, 'Server error saving opening balance');
  }
};

module.exports = {
  getAllMaintenance,
  getMaintenanceById,
  createMaintenance,
  generateMaintenanceBills,
  updateMaintenance,
  deleteMaintenance,
  deleteOrphanedMaintenance,
  getUserMaintenance,
  getAllBills,
  getBillById,
  createPayment,
  updatePayment,
  approvePayment,
  rejectPayment,
  getPendingVerificationPayments,
  getPaymentVerifications,
  getPaymentHistory,
  getPaymentReceipt,
  getPaymentScreenshot,
  getPayments,
  markBillPaid,
  sendPaymentReminder,
  getReports,
  createLegacyWriteOff,
  getWriteOffs,
  getWriteOffDashboard,
  getWriteOffReport,
  payMaintenanceBill,
  getSettings,
  saveSettings,
  applyPenalty,
  createDetailedWriteOff,
  getWriteOffHistory,
  getAGMReport,
  getWriteOffReceipt,
  reverseWriteOff,
  editWriteOff,
  getFinancialAccountingReport,
  getBankLedgerReport,
  getCashLedgerReport,
  getFlatCollectionReport,
  saveOpeningBalance,
  createManualBill
};

