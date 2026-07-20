const { promisePool } = require('../config/database');

const send = (res, status, message, data = null, errors = null) => {
  const payload = { success: status < 400, message };
  if (data !== null) payload.data = data;
  if (errors) payload.errors = errors;
  return res.status(status).json(payload);
};

const toNumber = (value, fallback = 0) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
};

const positiveMoney = (value) => {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : null;
};

const audit = async (db, userId, action, entityType, entityId, details = {}) => {
  await db.query(
    `INSERT INTO maintenance_audit_logs (user_id, action, entity_type, entity_id, details)
     VALUES (?, ?, ?, ?, ?)`,
    [userId || null, action, entityType, entityId || null, JSON.stringify(details)]
  );
};

const notifyResident = async (db, residentId, title, message, type = 'maintenance') => {
  if (!residentId) return;
  await db.query(
    `INSERT INTO notifications (resident_id, title, message, type, is_read, created_at)
     VALUES (?, ?, ?, ?, false, NOW())`,
    [residentId, title, message, type]
  );
};

const buildBillWhere = (query = {}) => {
  const where = ['m.cancelled_at IS NULL'];
  const values = [];
  const add = (sql, value) => {
    where.push(sql);
    values.push(value);
  };

  if (query.month) add('m.month = ?', Number(query.month));
  if (query.year) add('m.year = ?', Number(query.year));
  if (query.status) add('m.status = ?', query.status);
  if (query.paymentStatus) add('m.status = ?', query.paymentStatus);
  if (query.flatId) add('m.flat_id = ?', Number(query.flatId));
  if (query.floor) add('f.floor_no = ?', String(query.floor));
  if (query.wing) add('LOWER(COALESCE(f.wing, \'\')) = LOWER(?)', String(query.wing));
  if (query.building) add('LOWER(COALESCE(f.wing, \'\')) = LOWER(?)', String(query.building));
  if (query.minAmount) add('m.total_amount >= ?', Number(query.minAmount));
  if (query.maxAmount) add('m.total_amount <= ?', Number(query.maxAmount));
  if (query.search) {
    const search = `%${String(query.search).trim()}%`;
    where.push(`(
      u.name ILIKE ? OR f.flat_no ILIKE ? OR COALESCE(m.bill_number, CONCAT('BILL-', m.id)) ILIKE ?
      OR u.phone ILIKE ? OR EXISTS (
        SELECT 1 FROM payments p WHERE p.bill_id = m.id AND COALESCE(p.transaction_id, '') ILIKE ?
      )
    )`);
    values.push(search, search, search, search, search);
  }

  return { where: where.join(' AND '), values };
};

const billSelect = `
  SELECT m.*, COALESCE(m.bill_number, CONCAT('BILL-', m.id)) AS bill_number,
         m.status AS payment_status,
         u.name AS resident_name, u.phone AS resident_phone,
         f.flat_no, f.floor_no, f.wing,
         COALESCE(SUM(w.waiver_amount), 0) AS waiver_total
  FROM maintenance m
  LEFT JOIN users u ON u.id = m.resident_id
  LEFT JOIN flats f ON f.id = m.flat_id
  LEFT JOIN maintenance_waivers w ON w.bill_id = m.id
`;

const billGroup = `
  GROUP BY m.id, u.name, u.phone, f.flat_no, f.floor_no, f.wing
`;

const getSummary = async (req, res) => {
  try {
    const { where, values } = buildBillWhere(req.query);
    const [summaryRows] = await promisePool.query(
      `SELECT
         COALESCE(SUM(m.total_amount), 0) AS total_generated,
         COALESCE(SUM(m.paid_amount), 0) AS total_collected,
         COALESCE(SUM(m.remaining_amount), 0) AS total_outstanding,
         COUNT(*) FILTER (WHERE m.status != 'Paid') AS pending_bills,
         COUNT(*) FILTER (WHERE m.status != 'Paid' AND m.due_date < CURRENT_DATE) AS overdue_bills,
         COALESCE(SUM(m.penalty_amount), 0) AS total_penalty_collected,
         COALESCE(SUM(m.waiver_amount), 0) AS total_waived_amount,
         COALESCE(SUM(m.paid_amount) FILTER (
           WHERE EXTRACT(MONTH FROM COALESCE(m.payment_date, m.updated_at)) = EXTRACT(MONTH FROM CURRENT_DATE)
             AND EXTRACT(YEAR FROM COALESCE(m.payment_date, m.updated_at)) = EXTRACT(YEAR FROM CURRENT_DATE)
         ), 0) AS current_month_collection,
         COALESCE(SUM(m.paid_amount) FILTER (
           WHERE DATE_TRUNC('month', COALESCE(m.payment_date, m.updated_at)) = DATE_TRUNC('month', CURRENT_DATE - INTERVAL '1 month')
         ), 0) AS previous_month_collection
       FROM maintenance m
       LEFT JOIN users u ON u.id = m.resident_id
       LEFT JOIN flats f ON f.id = m.flat_id
       WHERE ${where}`,
      values
    );
    const [paymentRows] = await promisePool.query(
      `SELECT
         COUNT(*) FILTER (WHERE payment_status = 'Pending Verification') AS verification_pending,
         COUNT(*) FILTER (WHERE payment_status IN ('Paid', 'Approved')) AS approved_payments,
         COUNT(*) FILTER (WHERE payment_status = 'Rejected') AS rejected_payments
       FROM payments`
    );
    const [recentPayments] = await promisePool.query(
      `SELECT p.*, u.name AS resident_name, f.flat_no, m.bill_number, m.month, m.year
       FROM payments p
       JOIN maintenance m ON m.id = p.bill_id
       LEFT JOIN users u ON u.id = COALESCE(p.resident_id, m.resident_id)
       LEFT JOIN flats f ON f.id = m.flat_id
       ORDER BY p.created_at DESC LIMIT 8`
    );
    const [topOutstanding] = await promisePool.query(
      `${billSelect}
       WHERE m.status != 'Paid' AND m.remaining_amount > 0
       ${billGroup}
       ORDER BY m.remaining_amount DESC LIMIT 8`
    );
    const [trend] = await promisePool.query(
      `SELECT m.year, m.month, COALESCE(SUM(m.paid_amount), 0) AS collected,
              COALESCE(SUM(m.remaining_amount), 0) AS pending
       FROM maintenance m
       WHERE m.created_at >= CURRENT_DATE - INTERVAL '12 months'
       GROUP BY m.year, m.month
       ORDER BY m.year, m.month`
    );
    const [methodBreakdown] = await promisePool.query(
      `SELECT COALESCE(payment_method, 'Unknown') AS method, COUNT(*) AS count, COALESCE(SUM(amount), 0) AS amount
       FROM payments GROUP BY COALESCE(payment_method, 'Unknown') ORDER BY amount DESC`
    );

    const summary = summaryRows[0] || {};
    const totalGenerated = toNumber(summary.total_generated);
    const totalCollected = toNumber(summary.total_collected);
    return send(res, 200, 'Admin maintenance summary fetched', {
      ...summary,
      collection_percentage: totalGenerated > 0 ? Math.round((totalCollected / totalGenerated) * 100) : 0,
      ...(paymentRows[0] || {}),
      recent_payments: recentPayments,
      top_outstanding_flats: topOutstanding,
      overdue_residents: topOutstanding.filter((bill) => bill.due_date && new Date(bill.due_date) < new Date()),
      monthly_collection_trend: trend,
      payment_method_breakdown: methodBreakdown,
      paid_unpaid_summary: {
        paid: totalCollected,
        unpaid: toNumber(summary.total_outstanding)
      }
    });
  } catch (error) {
    console.error('Admin maintenance summary error:', error);
    return send(res, 500, 'Unable to fetch admin maintenance summary');
  }
};

const getBills = async (req, res) => {
  try {
    const { where, values } = buildBillWhere(req.query);
    const sortMap = {
      oldest: 'm.created_at ASC',
      highest: 'm.total_amount DESC',
      lowest: 'm.total_amount ASC',
      due: 'm.due_date ASC',
      outstanding: 'm.remaining_amount DESC',
      latest: 'm.created_at DESC'
    };
    const orderBy = sortMap[String(req.query.sort || 'latest').toLowerCase()] || sortMap.latest;
    const limit = Math.min(Math.max(Number(req.query.limit || 50), 1), 100);
    const offset = Math.max(Number(req.query.offset || 0), 0);
    const [rows] = await promisePool.query(
      `${billSelect}
       WHERE ${where}
       ${billGroup}
       ORDER BY ${orderBy}
       LIMIT ? OFFSET ?`,
      [...values, limit, offset]
    );
    return send(res, 200, 'Bills fetched', rows);
  } catch (error) {
    console.error('Admin get bills error:', error);
    return send(res, 500, 'Unable to fetch bills');
  }
};

const getBillDetails = async (req, res) => {
  try {
    const [bills] = await promisePool.query(`${billSelect} WHERE m.id = ? ${billGroup}`, [req.params.id]);
    if (!bills.length) return send(res, 404, 'Bill not found');
    const [items] = await promisePool.query('SELECT * FROM maintenance_bill_items WHERE bill_id = ? ORDER BY id', [req.params.id]);
    const [payments] = await promisePool.query('SELECT * FROM payments WHERE bill_id = ? ORDER BY created_at DESC', [req.params.id]);
    const [waivers] = await promisePool.query('SELECT * FROM maintenance_waivers WHERE bill_id = ? ORDER BY created_at DESC', [req.params.id]);
    const [auditRows] = await promisePool.query(
      `SELECT * FROM maintenance_audit_logs
       WHERE entity_id = ? AND entity_type IN ('BILL', 'PAYMENT', 'WAIVER')
       ORDER BY created_at DESC`,
      [req.params.id]
    );
    return send(res, 200, 'Bill details fetched', { bill: bills[0], items, payments, waivers, audit: auditRows });
  } catch (error) {
    console.error('Admin bill details error:', error);
    return send(res, 500, 'Unable to fetch bill details');
  }
};

const createBill = async (req, res) => {
  try {
    const { residentId, flatId, month, year, title = 'Monthly Maintenance', amount, dueDate, notes } = req.body;
    const baseAmount = positiveMoney(amount);
    if (!residentId || !flatId || !month || !year || !baseAmount || !dueDate) {
      return send(res, 400, 'Resident, flat, period, positive amount and due date are required');
    }
    const [duplicates] = await promisePool.query(
      'SELECT id FROM maintenance WHERE flat_id = ? AND month = ? AND year = ? AND cancelled_at IS NULL',
      [flatId, month, year]
    );
    if (duplicates.length) return send(res, 409, 'Bill already exists for this flat and period');
    const [result] = await promisePool.query(
      `INSERT INTO maintenance (resident_id, flat_id, title, month, year, amount, total_amount, paid_amount, remaining_amount, status, due_date, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?, 'Pending', ?, ?)`,
      [residentId, flatId, title, month, year, baseAmount, baseAmount, baseAmount, dueDate, notes || null]
    );
    const id = result.insertId;
    await promisePool.query('UPDATE maintenance SET bill_number = ? WHERE id = ?', [`BILL-${id}`, id]);
    return send(res, 201, 'Bill created', { id, billNumber: `BILL-${id}` });
  } catch (error) {
    console.error('Admin create bill error:', error);
    return send(res, 500, 'Unable to create bill');
  }
};

const generateBills = async (req, res) => {
  const connection = await promisePool.getConnection();
  try {
    const { month, year, dueDate, baseAmount, amount, flatIds = [], includeVacant = false, notes } = req.body;
    const billAmount = positiveMoney(baseAmount || amount);
    if (!month || !year || !dueDate || !billAmount) return send(res, 400, 'Month, year, due date and amount are required');

    const params = [];
    const filters = [];
    if (!includeVacant) filters.push('f.current_resident_id IS NOT NULL');
    if (Array.isArray(flatIds) && flatIds.length) {
      filters.push('f.id = ANY(?::int[])');
      params.push(flatIds.map(Number).filter(Boolean));
    }
    if (req.body.wing) {
      filters.push('LOWER(COALESCE(f.wing, \'\')) = LOWER(?)');
      params.push(req.body.wing);
    }
    if (req.body.floor) {
      filters.push('f.floor_no = ?');
      params.push(String(req.body.floor));
    }

    const [flats] = await connection.query(
      `SELECT f.id AS flat_id, f.flat_no, f.current_resident_id AS resident_id
       FROM flats f
       ${filters.length ? `WHERE ${filters.join(' AND ')}` : ''}
       ORDER BY f.flat_no`,
      params
    );

    await connection.beginTransaction();
    const generated = [];
    const skipped = [];
    for (const flat of flats) {
      if (!flat.resident_id && !includeVacant) {
        skipped.push({ flatId: flat.flat_id, flatNo: flat.flat_no, reason: 'Missing resident assignment' });
        continue;
      }
      const [existing] = await connection.query(
        'SELECT id FROM maintenance WHERE flat_id = ? AND month = ? AND year = ? AND cancelled_at IS NULL',
        [flat.flat_id, month, year]
      );
      if (existing.length) {
        skipped.push({ flatId: flat.flat_id, flatNo: flat.flat_no, reason: 'Bill already exists' });
        continue;
      }
      const [inserted] = await connection.query(
        `INSERT INTO maintenance (resident_id, flat_id, title, month, year, amount, total_amount, paid_amount, remaining_amount, status, due_date, notes)
         VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?, 'Pending', ?, ?)`,
        [flat.resident_id || null, flat.flat_id, req.body.title || 'Monthly Maintenance', month, year, billAmount, billAmount, billAmount, dueDate, notes || null]
      );
      const id = inserted.insertId;
      await connection.query('UPDATE maintenance SET bill_number = ? WHERE id = ?', [`BILL-${id}`, id]);
      generated.push({ id, flatId: flat.flat_id, flatNo: flat.flat_no, billNumber: `BILL-${id}` });
      await notifyResident(connection, flat.resident_id, 'New maintenance bill', `Maintenance bill BILL-${id} has been generated.`, 'maintenance');
    }
    await audit(connection, req.user.id, 'GENERATE_BILLS', 'BILL', null, { month, year, generated: generated.length, skipped: skipped.length });
    await connection.commit();
    return send(res, 201, 'Bills generated', { billsGenerated: generated.length, generated, skipped, failed: [] });
  } catch (error) {
    try { await connection.rollback(); } catch (_) {}
    console.error('Admin generate bills error:', error);
    return send(res, 500, 'Unable to generate bills');
  } finally {
    connection.release();
  }
};

const updateBill = async (req, res) => {
  try {
    const { title, dueDate, amount, notes, status } = req.body;
    const [currentRows] = await promisePool.query('SELECT * FROM maintenance WHERE id = ?', [req.params.id]);
    if (!currentRows.length) return send(res, 404, 'Bill not found');
    const current = currentRows[0];
    const baseAmount = amount !== undefined ? positiveMoney(amount) : toNumber(current.amount);
    if (!baseAmount) return send(res, 400, 'Amount must be positive');
    const total = Math.max(0, baseAmount + toNumber(current.penalty_amount) - toNumber(current.waiver_amount));
    const remaining = Math.max(0, total - toNumber(current.paid_amount));
    await promisePool.query(
      `UPDATE maintenance SET title = COALESCE(?, title), due_date = COALESCE(?, due_date),
       amount = ?, total_amount = ?, remaining_amount = ?, notes = COALESCE(?, notes),
       status = COALESCE(?, status), updated_at = NOW() WHERE id = ?`,
      [title || null, dueDate || null, baseAmount, total, remaining, notes || null, status || null, req.params.id]
    );
    return send(res, 200, 'Bill updated');
  } catch (error) {
    console.error('Admin update bill error:', error);
    return send(res, 500, 'Unable to update bill');
  }
};

const cancelBill = async (req, res) => {
  try {
    const reason = String(req.body.reason || '').trim();
    if (!reason) return send(res, 400, 'Cancellation reason is required');
    const [result] = await promisePool.query(
      `UPDATE maintenance SET status = 'Rejected', cancelled_at = NOW(), cancelled_by = ?, notes = CONCAT(COALESCE(notes, ''), ?), updated_at = NOW()
       WHERE id = ? AND COALESCE(paid_amount, 0) = 0`,
      [req.user.id, ` Cancelled: ${reason}.`, req.params.id]
    );
    if (!result.affectedRows) return send(res, 409, 'Only unpaid bills can be cancelled');
    return send(res, 200, 'Bill cancelled');
  } catch (error) {
    console.error('Admin cancel bill error:', error);
    return send(res, 500, 'Unable to cancel bill');
  }
};

const sendReminder = async (req, res) => {
  try {
    const [bills] = await promisePool.query('SELECT * FROM maintenance WHERE id = ?', [req.params.id]);
    if (!bills.length) return send(res, 404, 'Bill not found');
    const bill = bills[0];
    const message = req.body.message || `Reminder: maintenance bill ${bill.bill_number || `BILL-${bill.id}`} is pending.`;
    await promisePool.query(
      'INSERT INTO maintenance_reminders (bill_id, resident_id, flat_id, message, sent_by) VALUES (?, ?, ?, ?, ?)',
      [bill.id, bill.resident_id, bill.flat_id, message, req.user.id]
    );
    await notifyResident(promisePool, bill.resident_id, 'Maintenance reminder', message, 'maintenance');
    return send(res, 200, 'Reminder sent');
  } catch (error) {
    console.error('Admin reminder error:', error);
    return send(res, 500, 'Unable to send reminder');
  }
};

const applyPenalty = async (req, res) => {
  try {
    const amount = positiveMoney(req.body.amount);
    if (!amount) return send(res, 400, 'Penalty amount is required');
    const [currentRows] = await promisePool.query('SELECT * FROM maintenance WHERE id = ?', [req.params.id]);
    if (!currentRows.length) return send(res, 404, 'Bill not found');
    const bill = currentRows[0];
    const penalty = toNumber(bill.penalty_amount) + amount;
    const total = toNumber(bill.amount) + penalty - toNumber(bill.waiver_amount);
    const remaining = Math.max(0, total - toNumber(bill.paid_amount));
    await promisePool.query(
      `UPDATE maintenance SET penalty_amount = ?, total_amount = ?, remaining_amount = ?,
       status = CASE WHEN ? > 0 AND due_date < CURRENT_DATE THEN 'Overdue' ELSE status END, updated_at = NOW()
       WHERE id = ?`,
      [penalty, total, remaining, remaining, req.params.id]
    );
    await audit(promisePool, req.user.id, 'APPLY_PENALTY', 'BILL', req.params.id, { amount, reason: req.body.reason || null });
    return send(res, 200, 'Penalty applied');
  } catch (error) {
    console.error('Admin apply penalty error:', error);
    return send(res, 500, 'Unable to apply penalty');
  }
};

const applyWaiver = async (req, res) => {
  const connection = await promisePool.getConnection();
  try {
    const amount = positiveMoney(req.body.waiverAmount || req.body.amount);
    const reason = String(req.body.reason || '').trim();
    if (!amount || !reason) return send(res, 400, 'Waiver amount and reason are required');
    await connection.beginTransaction();
    const [rows] = await connection.query('SELECT * FROM maintenance WHERE id = ? FOR UPDATE', [req.params.id]);
    if (!rows.length) {
      await connection.rollback();
      return send(res, 404, 'Bill not found');
    }
    const bill = rows[0];
    if (amount > toNumber(bill.remaining_amount)) {
      await connection.rollback();
      return send(res, 400, 'Waiver cannot exceed remaining payable amount');
    }
    const finalPayable = Math.max(0, toNumber(bill.total_amount) - amount);
    const finalRemaining = Math.max(0, toNumber(bill.remaining_amount) - amount);
    const [inserted] = await connection.query(
      `INSERT INTO maintenance_waivers
       (bill_id, resident_id, flat_id, waiver_type, original_amount, waiver_amount, final_payable_amount, reason, approval_reference, approval_date, admin_note, approved_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        bill.id, bill.resident_id, bill.flat_id, req.body.waiverType || 'Partial waiver',
        bill.total_amount, amount, finalPayable, reason, req.body.approvalReference || null,
        req.body.approvalDate || null, req.body.adminNote || null, req.user.id
      ]
    );
    await connection.query(
      `UPDATE maintenance SET waiver_amount = waiver_amount + ?, total_amount = ?, remaining_amount = ?,
       status = CASE WHEN ? = 0 THEN 'Paid' ELSE status END, updated_at = NOW() WHERE id = ?`,
      [amount, finalPayable, finalRemaining, finalRemaining, bill.id]
    );
    await audit(connection, req.user.id, 'APPLY_WAIVER', 'WAIVER', inserted.insertId, { billId: bill.id, amount, reason });
    await notifyResident(connection, bill.resident_id, 'Maintenance waiver approved', `A waiver of ₹${amount} was applied to ${bill.bill_number || `BILL-${bill.id}`}.`, 'maintenance');
    await connection.commit();
    return send(res, 201, 'Waiver applied', { id: inserted.insertId });
  } catch (error) {
    try { await connection.rollback(); } catch (_) {}
    console.error('Admin waiver error:', error);
    return send(res, 500, 'Unable to apply waiver');
  } finally {
    connection.release();
  }
};

const getWaivers = async (req, res) => {
  try {
    const [rows] = await promisePool.query(
      `SELECT w.*, u.name AS resident_name, f.flat_no, m.bill_number
       FROM maintenance_waivers w
       LEFT JOIN users u ON u.id = w.resident_id
       LEFT JOIN flats f ON f.id = w.flat_id
       LEFT JOIN maintenance m ON m.id = w.bill_id
       ORDER BY w.created_at DESC`
    );
    return send(res, 200, 'Waivers fetched', rows);
  } catch (error) {
    return send(res, 500, 'Unable to fetch waivers');
  }
};

const recordPayment = async (req, res) => {
  const connection = await promisePool.getConnection();
  try {
    const amount = positiveMoney(req.body.amount);
    if (!amount) return send(res, 400, 'Payment amount is required');
    await connection.beginTransaction();
    const [rows] = await connection.query('SELECT * FROM maintenance WHERE id = ? FOR UPDATE', [req.params.id]);
    if (!rows.length) {
      await connection.rollback();
      return send(res, 404, 'Bill not found');
    }
    const bill = rows[0];
    const isAdvance = amount > toNumber(bill.remaining_amount);
    const appliedAmount = isAdvance ? toNumber(bill.remaining_amount) : amount;
    const receiptNumber = `RCPT-${Date.now()}-${req.params.id}`;
    const [payment] = await connection.query(
      `INSERT INTO payments (bill_id, resident_id, payment_method, transaction_id, amount, payment_status, paid_at, receipt_number, admin_notes, verified_by, verified_at)
       VALUES (?, ?, ?, ?, ?, 'Paid', ?, ?, ?, ?, NOW())`,
      [
        bill.id, bill.resident_id, req.body.paymentMethod || 'Cash', req.body.transactionId || null,
        appliedAmount, req.body.paymentDate || new Date(), receiptNumber, req.body.notes || null, req.user.id
      ]
    );
    const paid = toNumber(bill.paid_amount) + appliedAmount;
    const remaining = Math.max(0, toNumber(bill.total_amount) - paid);
    await connection.query(
      `UPDATE maintenance SET paid_amount = ?, remaining_amount = ?, status = ?, payment_date = NOW(), updated_at = NOW()
       WHERE id = ?`,
      [paid, remaining, remaining <= 0 ? 'Paid' : 'Partial', bill.id]
    );
    if (isAdvance && amount - appliedAmount > 0 && bill.resident_id) {
      const advance = amount - appliedAmount;
      await connection.query(
        `INSERT INTO resident_advance_balances (resident_id, opening_balance, available_balance)
         VALUES (?, 0, ?)
         ON CONFLICT (resident_id) DO UPDATE SET available_balance = resident_advance_balances.available_balance + EXCLUDED.available_balance, updated_at = NOW()`,
        [bill.resident_id, advance]
      );
      await connection.query(
        `INSERT INTO advance_transactions (resident_id, flat_id, bill_id, transaction_type, amount, payment_method, transaction_id, notes, created_by)
         VALUES (?, ?, ?, 'Credit', ?, ?, ?, ?, ?)`,
        [bill.resident_id, bill.flat_id, bill.id, advance, req.body.paymentMethod || 'Cash', req.body.transactionId || null, 'Advance balance from overpayment', req.user.id]
      );
    }
    await audit(connection, req.user.id, 'RECORD_PAYMENT', 'PAYMENT', payment.insertId, { billId: bill.id, amount, appliedAmount, isAdvance });
    await notifyResident(connection, bill.resident_id, 'Maintenance payment recorded', `Payment receipt ${receiptNumber} has been recorded.`, 'payment');
    await connection.commit();
    return send(res, 201, 'Payment recorded', { id: payment.insertId, receiptNumber, advanceAmount: Math.max(0, amount - appliedAmount) });
  } catch (error) {
    try { await connection.rollback(); } catch (_) {}
    console.error('Admin record payment error:', error);
    return send(res, 500, 'Unable to record payment');
  } finally {
    connection.release();
  }
};

const getPaymentReviews = async (req, res) => {
  try {
    const status = req.query.status;
    const values = [];
    const where = [];
    if (status && status !== 'All') {
      where.push('p.payment_status = ?');
      values.push(status);
    }
    const [rows] = await promisePool.query(
      `SELECT p.*, p.transaction_id AS utr_number, p.screenshot_url AS screenshot,
              m.bill_number, m.month, m.year, m.total_amount, m.remaining_amount,
              u.name AS resident_name, f.flat_no, f.wing, f.floor_no
       FROM payments p
       JOIN maintenance m ON m.id = p.bill_id
       LEFT JOIN users u ON u.id = COALESCE(p.resident_id, m.resident_id)
       LEFT JOIN flats f ON f.id = m.flat_id
       ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
       ORDER BY p.created_at DESC`,
      values
    );
    return send(res, 200, 'Payment reviews fetched', rows);
  } catch (error) {
    console.error('Admin payment reviews error:', error);
    return send(res, 500, 'Unable to fetch payment reviews');
  }
};

const updatePaymentReview = (target) => async (req, res) => {
  const connection = await promisePool.getConnection();
  try {
    await connection.beginTransaction();
    const [rows] = await connection.query('SELECT * FROM payments WHERE id = ? FOR UPDATE', [req.params.id]);
    if (!rows.length) {
      await connection.rollback();
      return send(res, 404, 'Payment not found');
    }
    const payment = rows[0];
    if (target === 'approve' && ['Paid', 'Approved'].includes(payment.payment_status)) {
      await connection.commit();
      return send(res, 200, 'Payment already approved', { receiptNumber: payment.receipt_number });
    }
    if (target === 'approve') {
      const [dupes] = await connection.query(
        `SELECT id FROM payments WHERE id != ? AND transaction_id = ? AND payment_status IN ('Paid', 'Approved')`,
        [payment.id, payment.transaction_id]
      );
      if (payment.transaction_id && dupes.length) {
        await connection.rollback();
        return send(res, 409, 'Duplicate transaction ID already approved');
      }
      const [billRows] = await connection.query('SELECT * FROM maintenance WHERE id = ? FOR UPDATE', [payment.bill_id]);
      if (!billRows.length) {
        await connection.rollback();
        return send(res, 404, 'Linked bill not found');
      }
      const bill = billRows[0];
      const approvedAmount = toNumber(payment.corrected_amount || payment.amount);
      const paid = toNumber(bill.paid_amount) + approvedAmount;
      const remaining = Math.max(0, toNumber(bill.total_amount) - paid);
      const receiptNumber = payment.receipt_number || `RCPT-${Date.now()}-${payment.id}`;
      await connection.query(
        `UPDATE payments SET payment_status = 'Paid', verified_by = ?, verified_at = NOW(), receipt_number = ?, admin_notes = COALESCE(?, admin_notes), updated_at = NOW()
         WHERE id = ?`,
        [req.user.id, receiptNumber, req.body.adminNotes || null, payment.id]
      );
      await connection.query(
        `UPDATE maintenance SET paid_amount = ?, remaining_amount = ?, status = ?, payment_date = NOW(), updated_at = NOW()
         WHERE id = ?`,
        [paid, remaining, remaining <= 0 ? 'Paid' : 'Partial', bill.id]
      );
      await audit(connection, req.user.id, 'APPROVE_PAYMENT', 'PAYMENT', payment.id, { billId: bill.id, approvedAmount, receiptNumber });
      await notifyResident(connection, bill.resident_id, 'Payment approved', `Your maintenance payment was approved. Receipt: ${receiptNumber}`, 'payment');
      await connection.commit();
      return send(res, 200, 'Payment approved', { receiptNumber });
    }

    if (target === 'reject') {
      const reason = String(req.body.reason || req.body.rejectionReason || '').trim();
      if (!reason) {
        await connection.rollback();
        return send(res, 400, 'Rejection reason is required');
      }
      await connection.query(
        `UPDATE payments SET payment_status = 'Rejected', rejection_reason = ?, rejected_by = ?, rejected_at = NOW(), admin_notes = COALESCE(?, admin_notes), updated_at = NOW()
         WHERE id = ?`,
        [reason, req.user.id, req.body.adminNotes || null, payment.id]
      );
      await audit(connection, req.user.id, 'REJECT_PAYMENT', 'PAYMENT', payment.id, { reason });
      const [billRows] = await connection.query('SELECT resident_id FROM maintenance WHERE id = ?', [payment.bill_id]);
      await notifyResident(connection, billRows[0]?.resident_id, 'Payment rejected', `Your maintenance payment was rejected. Reason: ${reason}`, 'payment');
      await connection.commit();
      return send(res, 200, 'Payment rejected');
    }

    if (target === 'clarification') {
      const message = String(req.body.message || '').trim();
      if (!message) {
        await connection.rollback();
        return send(res, 400, 'Clarification message is required');
      }
      await connection.query(
        `UPDATE payments SET payment_status = 'Under Review', clarification_message = ?, clarification_requested_at = NOW(), admin_notes = COALESCE(?, admin_notes), updated_at = NOW()
         WHERE id = ?`,
        [message, req.body.adminNotes || null, payment.id]
      );
      const [billRows] = await connection.query('SELECT resident_id FROM maintenance WHERE id = ?', [payment.bill_id]);
      await notifyResident(connection, billRows[0]?.resident_id, 'Payment clarification requested', message, 'payment');
      await audit(connection, req.user.id, 'REQUEST_CLARIFICATION', 'PAYMENT', payment.id, { message });
      await connection.commit();
      return send(res, 200, 'Clarification requested');
    }

    await connection.query(
      `UPDATE payments SET is_duplicate = true, duplicate_reason = ?, payment_status = 'Rejected', updated_at = NOW() WHERE id = ?`,
      [req.body.reason || 'Marked duplicate by admin', payment.id]
    );
    await audit(connection, req.user.id, 'MARK_DUPLICATE', 'PAYMENT', payment.id, { reason: req.body.reason || null });
    await connection.commit();
    return send(res, 200, 'Payment marked duplicate');
  } catch (error) {
    try { await connection.rollback(); } catch (_) {}
    console.error('Admin payment review update error:', error);
    return send(res, 500, 'Unable to update payment review');
  } finally {
    connection.release();
  }
};

const getTransactions = async (req, res) => getPaymentReviews(req, res);

const getReports = async (req, res) => {
  try {
    const [collection] = await promisePool.query(
      `SELECT year, month, COALESCE(SUM(total_amount), 0) AS billed, COALESCE(SUM(paid_amount), 0) AS collected,
              COALESCE(SUM(remaining_amount), 0) AS outstanding
       FROM maintenance GROUP BY year, month ORDER BY year DESC, month DESC`
    );
    const [expenses] = await promisePool.query(
      `SELECT category, COALESCE(SUM(amount), 0) AS amount
       FROM maintenance_expenses GROUP BY category ORDER BY amount DESC`
    );
    const [waivers] = await promisePool.query(
      `SELECT waiver_type, COALESCE(SUM(waiver_amount), 0) AS amount, COUNT(*) AS count
       FROM maintenance_waivers GROUP BY waiver_type`
    );
    return send(res, 200, 'Reports fetched', { collection, expenses, waivers });
  } catch (error) {
    return send(res, 500, 'Unable to fetch reports');
  }
};

const exportReports = async (req, res) => {
  try {
    const [rows] = await promisePool.query(
      `SELECT COALESCE(m.bill_number, CONCAT('BILL-', m.id)) AS bill_number, u.name AS resident_name, f.flat_no,
              m.month, m.year, m.total_amount, m.paid_amount, m.remaining_amount, m.status
       FROM maintenance m
       LEFT JOIN users u ON u.id = m.resident_id
       LEFT JOIN flats f ON f.id = m.flat_id
       ORDER BY m.year DESC, m.month DESC, m.id DESC`
    );
    const header = ['Bill Number', 'Resident', 'Flat', 'Month', 'Year', 'Total', 'Paid', 'Remaining', 'Status'];
    const csv = [
      header.join(','),
      ...rows.map((row) => header.map((label) => {
        const key = label.toLowerCase().replace(/ /g, '_');
        return `"${String(row[key] ?? '').replace(/"/g, '""')}"`;
      }).join(','))
    ].join('\n');
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="maintenance-report.csv"');
    return res.status(200).send(csv);
  } catch (error) {
    return send(res, 500, 'Unable to export report');
  }
};

module.exports = {
  getSummary,
  getBills,
  getBillDetails,
  createBill,
  generateBills,
  updateBill,
  cancelBill,
  sendReminder,
  applyPenalty,
  applyWaiver,
  getWaivers,
  recordPayment,
  getPaymentReviews,
  approvePaymentReview: updatePaymentReview('approve'),
  rejectPaymentReview: updatePaymentReview('reject'),
  clarifyPaymentReview: updatePaymentReview('clarification'),
  duplicatePaymentReview: updatePaymentReview('duplicate'),
  getTransactions,
  getReports,
  exportReports
};
