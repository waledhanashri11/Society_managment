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

const getPublicBackendOrigin = (req) => {
  const configured = process.env.PUBLIC_BACKEND_URL || process.env.BACKEND_PUBLIC_URL;
  if (configured) return configured.replace(/\/api\/?$/, '').replace(/\/$/, '');
  return `${req.protocol}://${req.get('host')}`;
};

const resolvePaymentScreenshotUrl = (req, value) => {
  if (!value) return null;
  const cleanValue = String(value).trim().replace(/\\/g, '/');
  if (/^(https?:|data:)/i.test(cleanValue)) return cleanValue;
  if (cleanValue.startsWith('/uploads/')) {
    const localPath = path.join(__dirname, '..', cleanValue.replace(/^\/uploads\//, 'uploads/'));
    if (!fs.existsSync(localPath)) {
      return null;
    }
  }
  return `${getPublicBackendOrigin(req)}${cleanValue.startsWith('/') ? cleanValue : `/${cleanValue}`}`;
};

const withPaymentScreenshotUrls = (req, payments = []) => payments.map((payment) => {
  const rawScreenshot = payment.screenshot_url || payment.screenshot || null;
  const publicUrl = resolvePaymentScreenshotUrl(req, rawScreenshot);
  return {
    ...payment,
    screenshot_url: publicUrl,
    screenshot: publicUrl,
    screenshot_path: rawScreenshot
  };
});

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

const markMaintenanceBillPaid = async (db, billId, paidAt = new Date()) => {
  const maintenanceHasPaymentDate = await hasTableColumn('maintenance', 'payment_date');
  const maintenanceHasUpdatedAt = await hasTableColumn('maintenance', 'updated_at');
  const setParts = [
    "status = 'Paid'",
    'paid_amount = total_amount',
    'remaining_amount = 0'
  ];
  const values = [];

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
  const result = [];
  for (const payment of payments) {
    const covered_bills = await getCoveredBillsForPayment(db, payment);
    result.push({ ...payment, covered_bills });
  }
  return result;
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

    const [bills] = await promisePool.query("SELECT * FROM maintenance WHERE status NOT IN ('Paid', 'Pending Verification', 'Under Review')");
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

const createMaintenance = async (req, res) => {
  try {
    const { title, month, year, dueDate, amount = 0, residentId, flatId } = req.body;
    let flatTypeId = null;
    let defaultAmt = Number(amount);

    if (flatId) {
      const [flatRows] = await promisePool.query(
        `SELECT f.flat_type_id, ft.default_maintenance_amount
         FROM flats f
         LEFT JOIN flat_types ft ON f.flat_type_id = ft.id
         WHERE f.id = ?`,
        [flatId]
      );
      if (flatRows.length > 0) {
        flatTypeId = flatRows[0].flat_type_id || null;
        if (flatRows[0].default_maintenance_amount !== null && flatRows[0].default_maintenance_amount !== undefined) {
          defaultAmt = Number(flatRows[0].default_maintenance_amount);
        }
      }
    }

    const amt = Number(amount);
    const isCustom = amt !== defaultAmt;

    const [result] = await promisePool.query(
      `INSERT INTO maintenance 
       (resident_id, flat_id, title, month, year, amount, penalty_amount, total_amount, paid_amount, remaining_amount, status, due_date,
        flat_type_id, default_maintenance_amount, final_maintenance_amount, is_custom_amount, custom_reason, edited_by, edited_at)
       VALUES (?, ?, ?, ?, ?, ?, 0.00, ?, 0.00, ?, 'Pending', ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        residentId || null,
        flatId || null,
        title,
        month,
        year,
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

// POST /api/maintenance/generate
const generateMaintenanceBills = async (req, res) => {
  try {
    const { month, year } = req.body;

    if (!month || !year) {
      return sendResponse(res, 400, 'Month and year are required');
    }

    const reqMonth = Number(month);
    const reqYear = Number(year);

    // 1. Get settings rules
    const [settingsRows] = await promisePool.query('SELECT * FROM maintenance_settings ORDER BY id DESC LIMIT 1');
    if (settingsRows.length === 0) {
      return sendResponse(res, 400, 'Configure maintenance settings first');
    }
    const settings = settingsRows[0];

    // 2. Enforce strict chronological generation.
    const [cycleRows] = await promisePool.query(
      `SELECT year, month, MAX(year * 12 + month) AS cycle
       FROM maintenance
       WHERE resident_id IS NOT NULL AND flat_id IS NOT NULL
       GROUP BY year, month
       ORDER BY cycle DESC`
    );
    
    const reqCycle = reqYear * 12 + reqMonth;

    const months = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    const reqMonthName = months[reqMonth - 1];

    if (cycleRows.length > 0) {
      const latestCycle = Number(cycleRows[0].cycle);
      const nextPendingCycle = latestCycle + 1;

      if (reqCycle < nextPendingCycle) {
        const allCycles = cycleRows.map(row => Number(row.cycle));
        if (allCycles.includes(reqCycle)) {
          return sendResponse(res, 400, `Maintenance bills for ${reqMonthName} ${reqYear} have already been generated.`);
        }
        return sendResponse(res, 400, 'Previous months cannot be generated.');
      }

      if (reqCycle > nextPendingCycle) {
        const nextPendingYear = Math.floor((nextPendingCycle - 1) / 12);
        const nextPendingMonth = nextPendingCycle - (nextPendingYear * 12);
        const nextPendingMonthName = months[nextPendingMonth - 1];
        return sendResponse(res, 400, `${nextPendingMonthName} ${nextPendingYear} maintenance has not been generated yet. Please generate ${nextPendingMonthName} first.`);
      }
    }

    // 3. Prevent bill generation if any occupied flat lacks a Flat Type
    const [missingFlatTypes] = await promisePool.query(
      `SELECT f.id, f.flat_no, f.wing 
       FROM flats f
       WHERE f.current_resident_id IS NOT NULL 
         AND f.status = 'Occupied' 
         AND f.flat_type_id IS NULL`
    );

    if (missingFlatTypes.length > 0) {
      const flatNames = missingFlatTypes.map(f => `${f.wing || 'A'}-${f.flat_no}`).join(', ');
      return sendResponse(
        res,
        400,
        `Cannot generate bills. Some occupied flats are not assigned a Flat Type: ${flatNames}. Please assign a Flat Type to all occupied flats in Flat Master before billing.`
      );
    }

    // 4. Fetch occupied flats using active flat assignments or directly from occupied flats table (with Flat Types)
    const [flats] = await promisePool.query(`
      SELECT f.id, f.current_resident_id, f.flat_no, f.wing,
             ft.id as flat_type_id, ft.default_maintenance_amount
      FROM flats f
      JOIN flat_types ft ON f.flat_type_id = ft.id
      WHERE f.current_resident_id IS NOT NULL AND f.status = 'Occupied'
    `);
    if (flats.length === 0) {
      return sendResponse(res, 404, 'No occupied flats found to bill');
    }

    // Use transaction to insert bills and their items
    const connection = await promisePool.getConnection();
    try {
      await connection.beginTransaction();

      for (const flat of flats) {
        const dueDateString = `${reqYear}-${String(reqMonth).padStart(2, '0')}-${String(settings.due_day).padStart(2, '0')}`;
        
        // Fetch active categories assigned specifically to this flat
        const [flatCategories] = await connection.query(
          `SELECT mc.*
           FROM flat_category_assignments fca
           JOIN maintenance_categories mc ON fca.category_id = mc.id
           WHERE fca.flat_id = ? AND mc.active = TRUE`,
          [flat.id]
        );

        const flatCategoriesSum = flatCategories.reduce((sum, cat) => sum + Number(cat.amount || 0), 0);
        
        // Use flat type's default maintenance amount as the base amount
        const baseAmt = Number(flat.default_maintenance_amount || 0);
        const flatTotalAmt = baseAmt + flatCategoriesSum;

        const [insertResult] = await connection.query(
          `INSERT INTO maintenance 
           (resident_id, flat_id, title, month, year, amount, penalty_amount, total_amount, paid_amount, remaining_amount, status, due_date, created_at, updated_at,
            flat_type_id, default_maintenance_amount, final_maintenance_amount, is_custom_amount) 
           VALUES (?, ?, ?, ?, ?, ?, 0.00, ?, 0.00, ?, 'Pending', ?, NOW(), NOW(), ?, ?, ?, false)`,
          [flat.current_resident_id, flat.id, settings.title, reqMonth, reqYear, baseAmt, flatTotalAmt, flatTotalAmt, dueDateString, flat.flat_type_id, baseAmt, baseAmt]
        );

        const billId = insertResult.insertId;

        // Insert items into maintenance_bill_items
        for (const cat of flatCategories) {
          await connection.query(
            `INSERT INTO maintenance_bill_items (bill_id, category_id, name, amount)
             VALUES (?, ?, ?, ?)`,
            [billId, cat.id, cat.name, cat.amount]
          );
        }
      }

      await connection.commit();
    } catch (err) {
      await connection.rollback();
      throw err;
    } finally {
      connection.release();
    }

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
    await reconcilePaidPayments(promisePool, userId);
    await applyPenaltyLogic();
    const [bills] = await promisePool.query(`
      SELECT m.*, m.status AS payment_status, m.total_amount AS total_amount, m.due_date AS maintenance_due_date,
             f.flat_no, f.floor_no, ft.name AS flat_type_name,
             rejected_payment.rejection_reason,
             rejected_payment.rejected_at,
             rejected_payment.payment_status AS latest_payment_status,
             approved_payment.id AS payment_id
      FROM maintenance m
      JOIN flats f ON m.flat_id = f.id
      LEFT JOIN flat_types ft ON m.flat_type_id = ft.id
      LEFT JOIN LATERAL (
        SELECT p.rejection_reason,
               COALESCE(p.rejected_at, p.verified_at, p.updated_at, p.created_at) AS rejected_at,
               p.payment_status
        FROM payments p
        LEFT JOIN payment_maintenance pm ON pm.payment_id = p.id
        WHERE (pm.maintenance_id = m.id OR p.bill_id = m.id)
          AND p.payment_status = 'Rejected'
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

    return sendResponse(res, 200, 'Resident maintenance bills fetched successfully', bills);
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
      insertValues.push(screenshotPath);
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

const approvePayment = async (req, res) => {
  const connection = await promisePool.getConnection();
  try {
    const { id } = req.params;
    await connection.beginTransaction();
    const [paymentRows] = await connection.query('SELECT * FROM payments WHERE id = ?', [id]);
    if (paymentRows.length === 0) {
      await connection.rollback();
      return sendResponse(res, 404, 'Payment record not found');
    }

    const payment = paymentRows[0];
    if (['Approved', 'Paid', 'Rejected'].includes(payment.payment_status)) {
      await connection.rollback();
      return sendResponse(res, 400, `Payment has already been ${String(payment.payment_status).toLowerCase()}`);
    }
    const receiptNumber = payment.receipt_number || `RCP-${payment.bill_id}-${Date.now()}`;
    const paymentsHasVerifiedBy = await hasTableColumn('payments', 'verified_by');
    const paymentsHasVerifiedAt = await hasTableColumn('payments', 'verified_at');
    const paymentsHasRejectionReason = await hasTableColumn('payments', 'rejection_reason');
    const paymentsHasReceiptNumber = await hasTableColumn('payments', 'receipt_number');
    const paymentsHasRemarks = await hasTableColumn('payments', 'remarks');
    const paymentsHasUpdatedAt = await hasTableColumn('payments', 'updated_at');
    const maintenanceHasRemarks = await hasTableColumn('maintenance', 'remarks');

    const paymentSet = ["payment_status = 'Approved'"];
    const paymentValues = [];
    if (paymentsHasVerifiedBy) {
      paymentSet.push('verified_by = ?');
      paymentValues.push(req.user.id);
    }
    if (paymentsHasVerifiedAt) paymentSet.push('verified_at = NOW()');
    if (paymentsHasRejectionReason) paymentSet.push('rejection_reason = NULL');
    if (paymentsHasReceiptNumber) {
      paymentSet.push('receipt_number = ?');
      paymentValues.push(receiptNumber);
    }
    if (paymentsHasRemarks) paymentSet.push("remarks = COALESCE(remarks, 'Approved by admin')");
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
      const auditDetails = {
        paymentId: id,
        billNumber: auditBillNumbers,
        residentName: residentInfo.resident_name,
        amount: Number(payment.amount),
        previousStatus: payment.payment_status,
        newStatus: 'Approved',
        adminName: residentInfo.admin_name || 'Admin',
        dateTime: new Date().toISOString()
      };
      
      await connection.query(
        `INSERT INTO maintenance_audit_logs (user_id, action, entity_type, entity_id, details)
         VALUES (?, ?, ?, ?, ?)`,
        [req.user.id, 'APPROVE_PAYMENT', 'PAYMENT', id, JSON.stringify(auditDetails)]
      );

      // Notify the resident
      await connection.query(
        `INSERT INTO notifications (resident_id, title, message, type, is_read, created_at)
         VALUES (?, ?, ?, ?, false, NOW())`,
        [
          residentInfo.resident_user_id,
          'Payment Approved',
          `Your maintenance payment of ₹${Number(payment.amount).toLocaleString('en-IN')} for ${auditBillNumbers} has been approved. Receipt: ${receiptNumber}`,
          'payment'
        ]
      );
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
    const { id } = req.params;
    const { rejectionReason, remarks } = req.body;
    const reason = String(rejectionReason || remarks || '').trim();
    if (!reason) {
      return sendResponse(res, 400, 'Rejection reason is required');
    }

    await connection.beginTransaction();
    const [paymentRows] = await connection.query('SELECT * FROM payments WHERE id = ?', [id]);
    if (paymentRows.length === 0) {
      await connection.rollback();
      return sendResponse(res, 404, 'Payment record not found');
    }

    const payment = paymentRows[0];
    if (['Approved', 'Paid', 'Rejected'].includes(payment.payment_status)) {
      await connection.rollback();
      return sendResponse(res, 400, `Payment has already been ${String(payment.payment_status).toLowerCase()}`);
    }
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

    const paymentSet = ["payment_status = 'Rejected'"];
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

    const maintenanceSet = ["status = 'Overdue'"];
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
      await connection.query(
        `INSERT INTO notifications (resident_id, title, message, type, is_read, created_at)
         VALUES (?, ?, ?, ?, false, NOW())`,
        [
          residentId,
          'Payment Rejected',
          `Your maintenance payment for ${monthText} has been rejected. Reason: ${reason}`,
          'payment'
        ]
      );
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
    const [payments] = await promisePool.query(`
      SELECT p.*, p.transaction_id AS utr_number, p.screenshot_url AS screenshot,
             CONCAT('BILL-', m.id) AS bill_number, m.title, m.month, m.year, m.due_date, m.total_amount,
             u.name AS resident_name, f.flat_no
      FROM payments p
      JOIN maintenance m ON p.bill_id = m.id
      JOIN users u ON m.resident_id = u.id
      JOIN flats f ON m.flat_id = f.id
      WHERE p.payment_status = 'Pending Verification'
      ORDER BY p.created_at DESC
    `);
    return sendResponse(res, 200, 'Pending verification payments fetched successfully', withPaymentScreenshotUrls(req, payments));
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
    await reconcilePaidPayments();
    const [payments] = await promisePool.query(`
      SELECT p.*, p.transaction_id AS utr_number, p.screenshot_url AS screenshot,
             CONCAT('BILL-', m.id) AS bill_number, m.title, m.month, m.year, m.due_date, m.total_amount AS total_amount,
             m.resident_id,
             u.name AS resident_name, f.flat_no
      FROM payments p
      JOIN maintenance m ON p.bill_id = m.id
      JOIN users u ON m.resident_id = u.id
      JOIN flats f ON m.flat_id = f.id
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

const createWriteOff = async (req, res) => {
  const connection = await promisePool.getConnection();
  try {
    const { id } = req.params;
    const { type, reason, amount } = req.body;

    if (!type || !reason || !['Maintenance', 'Penalty', 'Full'].includes(type)) {
      return sendResponse(res, 400, 'Type and reason are required');
    }

    await connection.beginTransaction();

    const [bills] = await connection.query('SELECT * FROM maintenance WHERE id = ?', [id]);
    if (bills.length === 0) {
      await connection.rollback();
      return sendResponse(res, 404, 'Bill not found');
    }
    const bill = bills[0];
    const remaining = Number(bill.remaining_amount || 0);

    if (remaining <= 0) {
      await connection.rollback();
      return sendResponse(res, 400, 'Bill is already fully paid or written off');
    }

    let writeOffAmt = 0;
    let maintWriteOffAmt = 0;
    let penaltyWriteOffAmt = 0;

    const currentMaintWriteOff = Number(bill.maintenance_write_off_amount || 0);
    const currentPenaltyWriteOff = Number(bill.penalty_write_off_amount || 0);

    if (type === 'Full') {
      writeOffAmt = remaining;
      maintWriteOffAmt = Math.max(0, Number(bill.amount) - currentMaintWriteOff);
      penaltyWriteOffAmt = Math.max(0, Number(bill.penalty_amount) - currentPenaltyWriteOff);
    } else if (type === 'Maintenance') {
      writeOffAmt = Number(amount);
      if (!writeOffAmt || writeOffAmt <= 0) {
        await connection.rollback();
        return sendResponse(res, 400, 'A valid write-off amount is required');
      }
      const maxMaintWriteOff = Math.max(0, Number(bill.amount) - currentMaintWriteOff);
      if (writeOffAmt > maxMaintWriteOff) {
        await connection.rollback();
        return sendResponse(res, 400, `Write-off amount exceeds remaining maintenance balance of ${maxMaintWriteOff}`);
      }
      if (writeOffAmt > remaining) {
        await connection.rollback();
        return sendResponse(res, 400, `Write-off amount exceeds remaining bill balance of ${remaining}`);
      }
      maintWriteOffAmt = writeOffAmt;
    } else if (type === 'Penalty') {
      writeOffAmt = Number(amount);
      if (!writeOffAmt || writeOffAmt <= 0) {
        await connection.rollback();
        return sendResponse(res, 400, 'A valid write-off amount is required');
      }
      const maxPenaltyWriteOff = Math.max(0, Number(bill.penalty_amount) - currentPenaltyWriteOff);
      if (writeOffAmt > maxPenaltyWriteOff) {
        await connection.rollback();
        return sendResponse(res, 400, `Write-off amount exceeds remaining penalty balance of ${maxPenaltyWriteOff}`);
      }
      if (writeOffAmt > remaining) {
        await connection.rollback();
        return sendResponse(res, 400, `Write-off amount exceeds remaining bill balance of ${remaining}`);
      }
      penaltyWriteOffAmt = writeOffAmt;
    }


    const [adminRows] = await connection.query('SELECT name FROM users WHERE id = ?', [req.user.id]);
    const adminName = adminRows[0]?.name || req.user.name || 'Admin';

    const [writeOffResult] = await connection.query(
      `INSERT INTO write_offs (bill_id, type, amount, maintenance_write_off_amount, penalty_write_off_amount, reason, admin_id, admin_name)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, type, writeOffAmt, maintWriteOffAmt, penaltyWriteOffAmt, reason.trim(), req.user.id, adminName]
    );
    const writeOffId = writeOffResult.insertId || writeOffResult.id;

    const newMaintWriteOffTotal = currentMaintWriteOff + maintWriteOffAmt;
    const newPenaltyWriteOffTotal = currentPenaltyWriteOff + penaltyWriteOffAmt;
    const newWriteOffTotal = Number(bill.write_off_amount || 0) + writeOffAmt;
    const newRemaining = Math.max(0, remaining - writeOffAmt);
    const newStatus = newRemaining <= 0 ? 'Paid' : bill.status;

    let writeOffStatus = 'Partially Written Off';
    if (newRemaining <= 0) {
      writeOffStatus = 'Fully Written Off';
    } else if (newMaintWriteOffTotal > 0 && newPenaltyWriteOffTotal === 0) {
      writeOffStatus = 'Maintenance Written Off';
    } else if (newPenaltyWriteOffTotal > 0 && newMaintWriteOffTotal === 0) {
      writeOffStatus = 'Penalty Written Off';
    }

    await connection.query(
      `UPDATE maintenance
       SET remaining_amount = ?, write_off_amount = ?, maintenance_write_off_amount = ?, penalty_write_off_amount = ?, status = ?, write_off_status = ?, updated_at = NOW()
       WHERE id = ?`,
      [newRemaining, newWriteOffTotal, newMaintWriteOffTotal, newPenaltyWriteOffTotal, newStatus, writeOffStatus, id]
    );

    // Audit log
    const auditDetails = {
      writeOffId,
      billId: id,
      type,
      amount: writeOffAmt,
      reason,
      adminName,
      dateTime: new Date().toISOString()
    };
    await connection.query(
      `INSERT INTO maintenance_audit_logs (user_id, action, entity_type, entity_id, details)
       VALUES (?, ?, ?, ?, ?)`,
      [req.user.id, 'CREATE_WRITE_OFF', 'WRITE_OFF', writeOffId, JSON.stringify(auditDetails)]
    );

    // Resident notification
    await connection.query(
      `INSERT INTO notifications (resident_id, title, message, type, is_read, created_at)
       VALUES (?, ?, ?, 'maintenance', false, NOW())`,
      [
        bill.resident_id,
        'Bill Status Updated',
        `Your maintenance bill "${bill.title}" status has been updated to ${newStatus}.`,
      ]
    );

    await connection.commit();
    return sendResponse(res, 201, 'Write-off recorded successfully', { writeOffId });
  } catch (error) {
    try { await connection.rollback(); } catch (e) {}
    console.error('Create write-off error:', error);
    return sendResponse(res, 500, 'Server error', null, ['Unable to record write-off']);
  } finally {
    connection.release();
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
  applyPenalty,
  createWriteOff,
  getWriteOffHistory,
  getAGMReport,
  getWriteOffReceipt,
  reverseWriteOff,
  editWriteOff
};
