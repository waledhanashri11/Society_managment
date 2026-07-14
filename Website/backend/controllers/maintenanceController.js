const { promisePool } = require('../config/database');
const fs = require('fs');
const path = require('path');

const LATE_FEE = 100;

const sendResponse = (res, statusCode, message, data = null, errors = null) => {
  const payload = { success: statusCode < 400, message };
  if (data !== null) payload.data = data;
  if (errors) payload.errors = errors;
  return res.status(statusCode).json(payload);
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

    const [bills] = await promisePool.query("SELECT * FROM maintenance WHERE status != 'Paid'");
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (const bill of bills) {
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
        const newTotalAmount = Number(bill.amount) + newPenaltyAmount;
        const newRemainingAmount = Math.max(0, newTotalAmount - Number(bill.paid_amount || 0));
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
          const totalAmt = Number(bill.amount) + Number(bill.penalty_amount);
          const remaining = Math.max(0, totalAmt - Number(bill.paid_amount || 0));
          let status = 'Overdue';
          if (remaining <= 0) {
            status = 'Paid';
          } else if (Number(bill.paid_amount) > 0) {
            status = 'Partial';
          }
          await promisePool.query(
            `UPDATE maintenance SET status = ?, remaining_amount = ? WHERE id = ?`,
            [status, remaining, bill.id]
          );
        } else {
          // If not past due date, double check if it is Partial or Pending
          const totalAmt = Number(bill.amount) + Number(bill.penalty_amount);
          const remaining = Math.max(0, totalAmt - Number(bill.paid_amount || 0));
          let status = remaining <= 0 ? 'Paid' : (Number(bill.paid_amount) > 0 ? 'Partial' : 'Pending');
          await promisePool.query(
            `UPDATE maintenance SET status = ?, remaining_amount = ? WHERE id = ?`,
            [status, remaining, bill.id]
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
      SELECT m.*, u.name AS resident_name, u.name AS owner_name, f.flat_no, f.floor_no
      FROM maintenance m
      LEFT JOIN users u ON m.resident_id = u.id
      LEFT JOIN flats f ON m.flat_id = f.id
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
      `SELECT m.*, u.name AS resident_name, u.name AS owner_name, f.flat_no, f.floor_no
       FROM maintenance m
       LEFT JOIN users u ON m.resident_id = u.id
       LEFT JOIN flats f ON m.flat_id = f.id
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

const createMaintenance = async (req, res) => {
  try {
    const { title, month, year, dueDate, amount = 0, residentId, flatId } = req.body;
    const [result] = await promisePool.query(
      `INSERT INTO maintenance (resident_id, flat_id, title, month, year, amount, penalty_amount, total_amount, paid_amount, remaining_amount, status, due_date)
       VALUES (?, ?, ?, ?, ?, ?, 0.00, ?, 0.00, ?, 'Pending', ?)`,
      [residentId || null, flatId || null, title, month, year, amount, amount, amount, dueDate]
    );
    return sendResponse(res, 201, 'Maintenance created successfully', { id: result.insertId });
  } catch (error) {
    console.error('Create maintenance error:', error);
    return sendResponse(res, 500, 'Server error', null, ['Unable to create maintenance']);
  }
};

// POST /api/maintenance/generate
const generateMaintenanceBills = async (req, res) => {
  try {
    const { month, year } = req.body;

    if (!month || !year) {
      return sendResponse(res, 400, 'Month and year are required');
    }

    // 1. Get settings rules
    const [settingsRows] = await promisePool.query('SELECT * FROM maintenance_settings ORDER BY id DESC LIMIT 1');
    if (settingsRows.length === 0) {
      return sendResponse(res, 400, 'Configure maintenance settings first');
    }
    const settings = settingsRows[0];

    // 2. Check if bills already exist for the selected month and year
    const [existing] = await promisePool.query(
      'SELECT id FROM maintenance WHERE month = ? AND year = ? LIMIT 1',
      [Number(month), Number(year)]
    );
    if (existing.length > 0) {
      return sendResponse(res, 409, 'Maintenance bills already generated for this month and year');
    }

    // 3. Fetch occupied flats
    const [flats] = await promisePool.query(
      'SELECT id, owner_id FROM flats WHERE owner_id IS NOT NULL'
    );
    if (flats.length === 0) {
      return sendResponse(res, 404, 'No occupied flats found to bill');
    }

    // Calculate due date (YYYY-MM-DD)
    const dueDateString = `${year}-${String(month).padStart(2, '0')}-${String(settings.due_day).padStart(2, '0')}`;

    const flatValues = [];
    const placeholders = flats.map(() => '(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())').join(', ');
    
    for (const flat of flats) {
      const amt = Number(settings.fixed_amount || 0);
      flatValues.push(
        flat.owner_id, flat.id, settings.title, Number(month), Number(year), amt, 0.00, amt, 0.00, amt, 'Pending', dueDateString
      );
    }

    const query = `
      INSERT INTO maintenance 
      (resident_id, flat_id, title, month, year, amount, penalty_amount, total_amount, paid_amount, remaining_amount, status, due_date, created_at, updated_at) 
      VALUES ${placeholders}
    `;

    await promisePool.query(query, flatValues);

    return sendResponse(res, 201, 'Maintenance bills generated successfully', { billsGenerated: flats.length });
  } catch (error) {
    console.error('Generate bills error:', error);
    return sendResponse(res, 500, 'Server error', null, ['Unable to generate maintenance bills']);
  }
};

const updateMaintenance = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, month, year, dueDate, amount, status } = req.body;

    const [existing] = await promisePool.query('SELECT amount, penalty_amount, paid_amount FROM maintenance WHERE id = ?', [id]);
    if (existing.length === 0) {
      return sendResponse(res, 404, 'Maintenance record not found');
    }

    const amt = amount !== undefined ? Number(amount) : Number(existing[0].amount);
    const penaltyAmt = Number(existing[0].penalty_amount);
    const paidAmt = Number(existing[0].paid_amount);
    const newTotal = amt + penaltyAmt;
    const remaining = Math.max(0, newTotal - paidAmt);

    await promisePool.query(
      `UPDATE maintenance 
       SET title = COALESCE(?, title), month = COALESCE(?, month), year = COALESCE(?, year), 
           due_date = COALESCE(?, due_date), amount = ?, total_amount = ?, remaining_amount = ?, status = COALESCE(?, status), updated_at = NOW()
       WHERE id = ?`,
      [title, month, year, dueDate, amt, newTotal, remaining, status, id]
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
    await promisePool.query('DELETE FROM maintenance WHERE id = ?', [id]);
    return sendResponse(res, 200, 'Maintenance deleted successfully');
  } catch (error) {
    console.error('Delete maintenance error:', error);
    return sendResponse(res, 500, 'Server error', null, ['Unable to delete maintenance']);
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
    await applyPenaltyLogic();
    const [bills] = await promisePool.query(`
      SELECT m.*, m.status AS payment_status, m.total_amount AS total_amount, m.due_date AS maintenance_due_date, f.flat_no, f.floor_no
      FROM maintenance m
      JOIN flats f ON m.flat_id = f.id
      WHERE m.resident_id = ?
      ORDER BY m.created_at DESC
    `, [userId]);

    return sendResponse(res, 200, 'Resident maintenance bills fetched successfully', bills);
  } catch (error) {
    console.error('Get user maintenance error:', error);
    return sendResponse(res, 500, 'Server error', null, ['Unable to fetch resident maintenance bills']);
  }
};

const getAllBills = async (req, res) => {
  try {
    await applyPenaltyLogic();
    const [bills] = await promisePool.query(`
      SELECT m.*, m.status AS payment_status, m.total_amount AS total_amount, u.name AS resident_name, f.flat_no, f.floor_no
      FROM maintenance m
      JOIN users u ON m.resident_id = u.id
      JOIN flats f ON m.flat_id = f.id
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
      SELECT m.*, m.status AS payment_status, m.total_amount AS total_amount, u.name AS resident_name, f.flat_no, f.floor_no
      FROM maintenance m
      JOIN users u ON m.resident_id = u.id
      JOIN flats f ON m.flat_id = f.id
      WHERE m.id = ?
    `, [id]);

    if (bills.length === 0) {
      return sendResponse(res, 404, 'Bill not found');
    }

    if (req.user.role !== 'admin' && bills[0].resident_id !== req.user.id) {
      return sendResponse(res, 403, 'You can only access your own bills');
    }

    const [payments] = await promisePool.query('SELECT * FROM payments WHERE bill_id = ? ORDER BY created_at DESC', [id]);
    return sendResponse(res, 200, 'Bill fetched successfully', { bill: bills[0], payments });
  } catch (error) {
    console.error('Get bill error:', error);
    return sendResponse(res, 500, 'Server error', null, ['Unable to fetch bill']);
  }
};

const createPayment = async (req, res) => {
  try {
    const {
      billId,
      paymentMethod = 'UPI',
      transactionId,
      utrNumber,
      amount,
      screenshotUrl,
      screenshot,
      paymentDate
    } = req.body;
    const utr = String(utrNumber || transactionId || '').trim();
    if (!billId || !utr || !amount) {
      return sendResponse(res, 400, 'Bill ID, UTR number and amount are required');
    }

    const [billRows] = await promisePool.query('SELECT * FROM maintenance WHERE id = ?', [billId]);
    if (billRows.length === 0) {
      return sendResponse(res, 404, 'Bill not found');
    }

    const bill = billRows[0];
    if (bill.resident_id !== req.user.id) {
      return sendResponse(res, 403, 'You can only access your own bills');
    }

    if (bill.status === 'Paid') {
      return sendResponse(res, 400, 'This bill is already paid');
    }

    const [paymentRows] = await promisePool.query('SELECT id FROM payments WHERE bill_id = ? AND transaction_id = ?', [billId, utr]);
    if (paymentRows.length > 0) {
      return sendResponse(res, 409, 'Duplicate payment transaction', null, ['This UTR number has already been used']);
    }

    const screenshotPath = savePaymentScreenshot(screenshot || screenshotUrl);

    await promisePool.query(
      `INSERT INTO payments (bill_id, payment_method, transaction_id, amount, payment_status, paid_at, screenshot_url)
       VALUES (?, ?, ?, ?, 'Pending Verification', ?, ?)`,
      [billId, paymentMethod, utr, amount, paymentDate || new Date(), screenshotPath]
    );

    await promisePool.query(
      "UPDATE maintenance SET status = 'Pending Verification', payment_date = ? WHERE id = ?",
      [paymentDate || new Date(), billId]
    );

    return sendResponse(res, 201, 'Payment submitted successfully. It is pending admin verification.');
  } catch (error) {
    console.error('Create payment error:', error);
    return sendResponse(res, 500, 'Server error', null, ['Unable to submit payment']);
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

const approvePayment = async (req, res) => {
  try {
    const { id } = req.params;
    const [paymentRows] = await promisePool.query('SELECT * FROM payments WHERE id = ?', [id]);
    if (paymentRows.length === 0) {
      return sendResponse(res, 404, 'Payment record not found');
    }

    const payment = paymentRows[0];
    const receiptNumber = payment.receipt_number || `RCP-${payment.bill_id}-${Date.now()}`;

    await promisePool.query(
      `UPDATE payments
       SET payment_status = 'Paid',
           verified_by = ?,
           verified_at = NOW(),
           rejection_reason = NULL,
           receipt_number = ?,
           remarks = COALESCE(remarks, 'Approved by admin'),
           updated_at = NOW()
       WHERE id = ?`,
      [req.user.id, receiptNumber, id]
    );

    await promisePool.query(
      `UPDATE maintenance
       SET status = 'Paid',
           paid_amount = total_amount,
           remaining_amount = 0,
           payment_date = COALESCE(?, NOW()),
           remarks = CONCAT(COALESCE(remarks, ''), ?),
           updated_at = NOW()
       WHERE id = ?`,
      [payment.paid_at || new Date(), ` Payment approved on ${new Date().toLocaleString('en-IN')}.`, payment.bill_id]
    );

    return sendResponse(res, 200, 'Payment approved successfully', { receiptNumber });
  } catch (error) {
    console.error('Approve payment error:', error);
    return sendResponse(res, 500, 'Server error', null, ['Unable to approve payment']);
  }
};

const rejectPayment = async (req, res) => {
  try {
    const { id } = req.params;
    const { rejectionReason, remarks } = req.body;
    const reason = String(rejectionReason || remarks || '').trim();
    if (!reason) {
      return sendResponse(res, 400, 'Rejection reason is required');
    }

    const [paymentRows] = await promisePool.query('SELECT * FROM payments WHERE id = ?', [id]);
    if (paymentRows.length === 0) {
      return sendResponse(res, 404, 'Payment record not found');
    }

    const payment = paymentRows[0];
    await promisePool.query(
      `UPDATE payments
       SET payment_status = 'Rejected',
           verified_by = ?,
           verified_at = NOW(),
           rejection_reason = ?,
           remarks = ?,
           updated_at = NOW()
       WHERE id = ?`,
      [req.user.id, reason, reason, id]
    );

    await promisePool.query(
      `UPDATE maintenance
       SET status = 'Rejected',
           payment_date = NULL,
           remarks = CONCAT(COALESCE(remarks, ''), ?),
           updated_at = NOW()
       WHERE id = ?`,
      [` Payment rejected: ${reason}.`, payment.bill_id]
    );

    return sendResponse(res, 200, 'Payment rejected successfully');
  } catch (error) {
    console.error('Reject payment error:', error);
    return sendResponse(res, 500, 'Server error', null, ['Unable to reject payment']);
  }
};

const getPendingVerificationPayments = async (req, res) => {
  try {
    const [payments] = await promisePool.query(`
      SELECT p.*, p.transaction_id AS utr_number, p.screenshot_url AS screenshot,
             m.bill_number, m.title, m.month, m.year, m.due_date, m.total_amount,
             u.name AS resident_name, f.flat_no
      FROM payments p
      JOIN maintenance m ON p.bill_id = m.id
      JOIN users u ON m.resident_id = u.id
      JOIN flats f ON m.flat_id = f.id
      WHERE p.payment_status = 'Pending Verification'
      ORDER BY p.created_at DESC
    `);
    return sendResponse(res, 200, 'Pending verification payments fetched successfully', payments);
  } catch (error) {
    console.error('Get pending payments error:', error);
    return sendResponse(res, 500, 'Server error', null, ['Unable to fetch pending payments']);
  }
};

const getPaymentHistory = async (req, res) => {
  try {
    const where = req.user.role === 'admin' ? '1 = 1' : 'm.resident_id = ?';
    const params = req.user.role === 'admin' ? [] : [req.user.id];
    const [payments] = await promisePool.query(
      `SELECT p.*, p.transaction_id AS utr_number, p.screenshot_url AS screenshot,
              m.bill_number, m.title, m.month, m.year, m.due_date, m.total_amount,
              u.name AS resident_name, f.flat_no
       FROM payments p
       JOIN maintenance m ON p.bill_id = m.id
       JOIN users u ON m.resident_id = u.id
       JOIN flats f ON m.flat_id = f.id
       WHERE ${where}
       ORDER BY p.created_at DESC`,
      params
    );
    return sendResponse(res, 200, 'Payment history fetched successfully', payments);
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
              m.resident_id, m.bill_number, m.title, m.month, m.year, m.due_date, m.total_amount, m.payment_date,
              u.name AS resident_name, f.flat_no, verifier.name AS verified_by_name
       FROM payments p
       JOIN maintenance m ON p.bill_id = m.id
       JOIN users u ON m.resident_id = u.id
       JOIN flats f ON m.flat_id = f.id
       LEFT JOIN users verifier ON verifier.id = p.verified_by
       WHERE p.id = ?`,
      [id]
    );
    if (payments.length === 0) {
      return sendResponse(res, 404, 'Payment receipt not found');
    }
    const receipt = payments[0];
    if (req.user.role !== 'admin' && receipt.resident_id !== req.user.id) {
      return sendResponse(res, 403, 'You can only access your own receipt');
    }
    if (receipt.payment_status !== 'Paid') {
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
    if (paymentStatus === 'Paid') {
      return approvePayment(req, res);
    }
    if (paymentStatus === 'Rejected') {
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

    await promisePool.query(
      'UPDATE payments SET payment_status = ?, remarks = ?, updated_at = NOW() WHERE id = ?',
      [paymentStatus, remarks || null, id]
    );
    await promisePool.query(
      `UPDATE maintenance SET status = ?,
       paid_amount = CASE WHEN ? = 'Paid' THEN total_amount ELSE paid_amount END,
       remaining_amount = CASE WHEN ? = 'Paid' THEN 0 ELSE remaining_amount END
       WHERE id = ?`,
      [paymentStatus, paymentStatus, paymentStatus, payment.bill_id]
    );

    if (paymentStatus === 'Paid') {
      await promisePool.query('UPDATE maintenance SET payment_date = NOW() WHERE id = ?', [payment.bill_id]);
    }

    return sendResponse(res, 200, 'Payment updated successfully');
  } catch (error) {
    console.error('Update payment error:', error);
    return sendResponse(res, 500, 'Server error', null, ['Unable to update payment']);
  }
};

const getPayments = async (req, res) => {
  try {
    const [payments] = await promisePool.query(`
      SELECT p.*, p.transaction_id AS utr_number, p.screenshot_url AS screenshot,
             m.bill_number, m.title, m.month, m.year, m.due_date, m.total_amount AS total_amount,
             u.name AS resident_name, f.flat_no
      FROM payments p
      JOIN maintenance m ON p.bill_id = m.id
      JOIN users u ON m.resident_id = u.id
      JOIN flats f ON m.flat_id = f.id
      ORDER BY p.created_at DESC
    `);
    return sendResponse(res, 200, 'Payments fetched successfully', payments);
  } catch (error) {
    console.error('Get payments error:', error);
    return sendResponse(res, 500, 'Server error', null, ['Unable to fetch payments']);
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
        query = `SELECT EXTRACT(MONTH FROM payment_date) AS month, EXTRACT(YEAR FROM payment_date) AS year, SUM(amount) AS amount
                 FROM maintenance WHERE status = 'Paid' AND payment_date IS NOT NULL GROUP BY EXTRACT(YEAR FROM payment_date), EXTRACT(MONTH FROM payment_date) ORDER BY year DESC, month DESC`;
        break;
      case 'yearly-collection':
        query = `SELECT EXTRACT(YEAR FROM payment_date) AS year, SUM(amount) AS amount FROM maintenance WHERE status = 'Paid' AND payment_date IS NOT NULL GROUP BY EXTRACT(YEAR FROM payment_date) ORDER BY year DESC`;
        break;
      case 'pending-bills':
        query = `SELECT m.*, m.status AS payment_status, m.total_amount AS total_amount, u.name AS resident_name, f.flat_no FROM maintenance m JOIN users u ON m.resident_id = u.id JOIN flats f ON m.flat_id = f.id WHERE m.status != 'Paid' ORDER BY m.due_date ASC`;
        break;
      case 'paid-bills':
        query = `SELECT m.*, m.status AS payment_status, m.total_amount AS total_amount, u.name AS resident_name, f.flat_no FROM maintenance m JOIN users u ON m.resident_id = u.id JOIN flats f ON m.flat_id = f.id WHERE m.status = 'Paid' ORDER BY m.payment_date DESC`;
        break;
      case 'defaulters':
        query = `SELECT m.*, m.status AS payment_status, m.total_amount AS total_amount, u.name AS resident_name, f.flat_no FROM maintenance m JOIN users u ON m.resident_id = u.id JOIN flats f ON m.flat_id = f.id WHERE m.status != 'Paid' AND m.due_date < CURRENT_DATE ORDER BY m.due_date ASC`;
        break;
      case 'income-summary':
        query = `SELECT SUM(total_amount) AS total_collection, SUM(CASE WHEN status = 'Paid' THEN paid_amount ELSE 0 END) AS paid_collection, SUM(CASE WHEN status != 'Paid' THEN remaining_amount ELSE 0 END) AS pending_collection FROM maintenance`;
        break;
      default:
        query = `SELECT COUNT(*) AS total_bills, SUM(CASE WHEN status = 'Paid' THEN 1 ELSE 0 END) AS paid_bills, SUM(CASE WHEN status != 'Paid' THEN 1 ELSE 0 END) AS pending_bills, SUM(CASE WHEN due_date < CURRENT_DATE AND status != 'Paid' THEN 1 ELSE 0 END) AS overdue_bills, SUM(CASE WHEN status = 'Paid' THEN paid_amount ELSE 0 END) AS total_collection, SUM(CASE WHEN status != 'Paid' THEN remaining_amount ELSE 0 END) AS pending_collection FROM maintenance`;
    }

    const [rows] = await promisePool.query(query);
    return sendResponse(res, 200, 'Reports fetched successfully', rows);
  } catch (error) {
    console.error('Get reports error:', error);
    return sendResponse(res, 500, 'Server error', null, ['Unable to fetch reports']);
  }
};

module.exports = {
  getAllMaintenance,
  getMaintenanceById,
  createMaintenance,
  generateMaintenanceBills,
  updateMaintenance,
  deleteMaintenance,
  getUserMaintenance,
  getAllBills,
  getBillById,
  createPayment,
  updatePayment,
  approvePayment,
  rejectPayment,
  getPendingVerificationPayments,
  getPaymentHistory,
  getPaymentReceipt,
  getPayments,
  markBillPaid,
  sendPaymentReminder,
  getReports,
  payMaintenanceBill,
  getSettings,
  saveSettings,
  applyPenalty
};
