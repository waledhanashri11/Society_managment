const { promisePool } = require('../config/database');

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

const getAllMaintenance = async (req, res) => {
  try {
    const [maintenance] = await promisePool.query(`
      SELECT m.*, f.flat_no, f.floor_no, u.name AS owner_name
      FROM maintenance m
      LEFT JOIN flats f ON m.flat_id = f.id
      LEFT JOIN users u ON f.owner_id = u.id
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
      `SELECT m.*, f.flat_no, f.floor_no, u.name AS owner_name
       FROM maintenance m
       LEFT JOIN flats f ON m.flat_id = f.id
       LEFT JOIN users u ON f.owner_id = u.id
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
    const { title, month, year, dueDate, description } = req.body;
    const errors = [];

    if (!title || !month || !year || !dueDate) {
      errors.push('Title, month, year and due date are required');
    }

    if (Number(month) < 1 || Number(month) > 12) {
      errors.push('Month must be between 1 and 12');
    }

    if (!Number.isInteger(Number(year)) || Number(year) < 2000) {
      errors.push('Year must be a valid four-digit year');
    }

    if (errors.length > 0) {
      return sendResponse(res, 400, 'Validation failed', null, errors);
    }

    const [columns] = await promisePool.query('SHOW COLUMNS FROM maintenance');
    const columnNames = columns.map((column) => column.Field);
    const insertFields = ['month', 'year', 'due_date'];
    const insertValues = [month, year, dueDate];

    if (columnNames.includes('amount')) {
      insertFields.push('amount');
      insertValues.push(0.0);
    }

    if (columnNames.includes('status')) {
      insertFields.push('status');
      insertValues.push('pending');
    }

    if (columnNames.includes('title')) {
      insertFields.push('title');
      insertValues.push(title);
    }

    if (columnNames.includes('description')) {
      insertFields.push('description');
      insertValues.push(description || '');
    }

    if (columnNames.includes('created_by')) {
      insertFields.push('created_by');
      insertValues.push(req.user.id);
    }

    if (columnNames.includes('maintenance_status')) {
      insertFields.push('maintenance_status');
      insertValues.push('ACTIVE');
    }

    const [existing] = await promisePool.query(
      'SELECT id FROM maintenance WHERE month = ? AND year = ? LIMIT 1',
      [month, year]
    );

    if (existing.length > 0) {
      return sendResponse(res, 409, 'Maintenance for this month/year already exists', null, ['A maintenance cycle already exists for the selected month and year']);
    }

    const placeholders = insertFields.map(() => '?').join(', ');
    const [result] = await promisePool.query(
      `INSERT INTO maintenance (${insertFields.join(', ')}) VALUES (${placeholders})`,
      insertValues
    );

    return sendResponse(res, 201, 'Maintenance created successfully', { id: result.insertId, title, month, year, dueDate, description: description || '' });
  } catch (error) {
    console.error('Create maintenance error:', error);
    return sendResponse(res, 500, 'Server error', null, ['Unable to create maintenance']);
  }
};

const generateMaintenanceBills = async (req, res) => {
  try {
    const { maintenanceId } = req.body;
    if (!maintenanceId) {
      return sendResponse(res, 400, 'Maintenance ID is required');
    }

    const [maintenanceRows] = await promisePool.query('SELECT * FROM maintenance WHERE id = ?', [maintenanceId]);
    if (maintenanceRows.length === 0) {
      return sendResponse(res, 404, 'Maintenance record not found');
    }

    const maintenance = maintenanceRows[0];
    const [existingBills] = await promisePool.query('SELECT id FROM maintenance_bills WHERE maintenance_id = ?', [maintenanceId]);
    if (existingBills.length > 0) {
      return sendResponse(res, 409, 'Bills already generated for this maintenance cycle', null, ['Duplicate generation is not allowed']);
    }

    const [flats] = await promisePool.query('SELECT id, owner_id, maintenance_charge FROM flats WHERE owner_id IS NOT NULL');
    if (flats.length === 0) {
      return sendResponse(res, 404, 'No occupied flats found', null, ['There are no occupied flats available for billing']);
    }

    const values = [];
    for (const [index, flat] of flats.entries()) {
      const amount = Number(flat.maintenance_charge || 0);
      const dueDate = maintenance.due_date;
      const lateFee = calculateLateFee(dueDate);
      const totalAmount = amount + lateFee;
      const serial = String(index + 1).padStart(4, '0');
      const billNumber = `BILL-${maintenance.year}${String(maintenance.month).padStart(2, '0')}-${serial}`;
      const invoiceNumber = `INV-${maintenance.year}${String(maintenance.month).padStart(2, '0')}-${serial}`;
      values.push([
        maintenanceId, flat.owner_id, flat.id, billNumber, invoiceNumber,
        amount, lateFee, totalAmount, 0, totalAmount, dueDate, 'Pending'
      ]);
    }

    if (values.length > 0) {
      await promisePool.query(
        `INSERT INTO maintenance_bills
         (maintenance_id, resident_id, flat_id, bill_number, invoice_number, amount, late_fee,
          total_amount, paid_amount, remaining_amount, due_date, payment_status)
         VALUES ?`,
        [values]
      );
    }

    const [bills] = await promisePool.query(
      `SELECT mb.*, u.name AS resident_name, f.flat_no, f.floor_no
       FROM maintenance_bills mb
       JOIN users u ON mb.resident_id = u.id
       JOIN flats f ON mb.flat_id = f.id
       WHERE mb.maintenance_id = ?`,
      [maintenanceId]
    );

    return sendResponse(res, 201, 'Maintenance bills generated successfully', { maintenanceId, billsGenerated: bills.length, bills });
  } catch (error) {
    console.error('Generate bills error:', error);
    return sendResponse(res, 500, 'Server error', null, ['Unable to generate maintenance bills']);
  }
};

const updateMaintenance = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, month, year, dueDate, description, maintenanceStatus } = req.body;

    const [existing] = await promisePool.query('SELECT id FROM maintenance WHERE id = ?', [id]);
    if (existing.length === 0) {
      return sendResponse(res, 404, 'Maintenance record not found');
    }

    const [columns] = await promisePool.query('SHOW COLUMNS FROM maintenance');
    const columnNames = columns.map((column) => column.Field);
    const updateFields = ['month = ?', 'year = ?', 'due_date = ?'];
    const updateValues = [month, year, dueDate];

    if (columnNames.includes('title')) {
      updateFields.push('title = ?');
      updateValues.push(title || '');
    }

    if (columnNames.includes('description')) {
      updateFields.push('description = ?');
      updateValues.push(description || '');
    }

    if (columnNames.includes('maintenance_status')) {
      updateFields.push('maintenance_status = ?');
      updateValues.push(maintenanceStatus || 'ACTIVE');
    } else if (columnNames.includes('status')) {
      updateFields.push('status = ?');
      updateValues.push('pending');
    }

    updateValues.push(id);
    await promisePool.query(`UPDATE maintenance SET ${updateFields.join(', ')} WHERE id = ?`, updateValues);

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

const getUserMaintenance = async (req, res) => {
  try {
    const userId = req.user.id;
    const [bills] = await promisePool.query(`
      SELECT mb.*, m.title, m.month, m.year, m.due_date AS maintenance_due_date, f.flat_no, f.floor_no
      FROM maintenance_bills mb
      JOIN maintenance m ON mb.maintenance_id = m.id
      JOIN flats f ON mb.flat_id = f.id
      WHERE mb.resident_id = ?
      ORDER BY mb.created_at DESC
    `, [userId]);

    return sendResponse(res, 200, 'Resident maintenance bills fetched successfully', bills);
  } catch (error) {
    console.error('Get user maintenance error:', error);
    return sendResponse(res, 500, 'Server error', null, ['Unable to fetch resident maintenance bills']);
  }
};

const getAllBills = async (req, res) => {
  try {
    const [bills] = await promisePool.query(`
      SELECT mb.*, m.title, m.month, m.year, u.name AS resident_name, f.flat_no, f.floor_no
      FROM maintenance_bills mb
      JOIN maintenance m ON mb.maintenance_id = m.id
      JOIN users u ON mb.resident_id = u.id
      JOIN flats f ON mb.flat_id = f.id
      ORDER BY mb.created_at DESC
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
      SELECT mb.*, m.title, m.month, m.year, u.name AS resident_name, f.flat_no, f.floor_no
      FROM maintenance_bills mb
      JOIN maintenance m ON mb.maintenance_id = m.id
      JOIN users u ON mb.resident_id = u.id
      JOIN flats f ON mb.flat_id = f.id
      WHERE mb.id = ?
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
    const { billId, paymentMethod, transactionId, amount, screenshotUrl } = req.body;
    if (!billId || !paymentMethod || !transactionId || !amount) {
      return sendResponse(res, 400, 'Bill ID, payment method, transaction ID and amount are required');
    }

    const [billRows] = await promisePool.query('SELECT * FROM maintenance_bills WHERE id = ?', [billId]);
    if (billRows.length === 0) {
      return sendResponse(res, 404, 'Bill not found');
    }

    const bill = billRows[0];
    if (bill.resident_id !== req.user.id) {
      return sendResponse(res, 403, 'You can only access your own bills');
    }

    const [paymentRows] = await promisePool.query('SELECT id FROM payments WHERE bill_id = ? AND transaction_id = ?', [billId, transactionId]);
    if (paymentRows.length > 0) {
      return sendResponse(res, 409, 'Duplicate payment transaction', null, ['This transaction ID has already been used']);
    }

    const [paymentColumns] = await promisePool.query('SHOW COLUMNS FROM payments');
    const paymentColumnNames = paymentColumns.map((column) => column.Field);
    const insertFields = [];
    const insertValues = [];

    if (paymentColumnNames.includes('bill_id')) {
      insertFields.push('bill_id');
      insertValues.push(billId);
    }

    if (paymentColumnNames.includes('payment_method')) {
      insertFields.push('payment_method');
      insertValues.push(paymentMethod);
    }

    if (paymentColumnNames.includes('transaction_id')) {
      insertFields.push('transaction_id');
      insertValues.push(transactionId);
    }

    if (paymentColumnNames.includes('amount')) {
      insertFields.push('amount');
      insertValues.push(amount);
    }

    if (paymentColumnNames.includes('payment_status')) {
      insertFields.push('payment_status');
      insertValues.push('Under Review');
    }

    if (paymentColumnNames.includes('paid_at')) {
      insertFields.push('paid_at');
      insertValues.push(new Date());
    }

    if (paymentColumnNames.includes('screenshot_url')) {
      insertFields.push('screenshot_url');
      insertValues.push(screenshotUrl || null);
    }

    if (paymentColumnNames.includes('maintenance_id')) {
      insertFields.push('maintenance_id');
      insertValues.push(billRows[0].maintenance_id);
    }

    if (insertFields.length > 0) {
      const placeholders = insertFields.map(() => '?').join(', ');
      await promisePool.query(
        `INSERT INTO payments (${insertFields.join(', ')}) VALUES (${placeholders})`,
        insertValues
      );
    }

    await promisePool.query(
      'UPDATE maintenance_bills SET payment_status = ?, payment_date = NOW() WHERE id = ?',
      ['Under Review', billId]
    );

    return sendResponse(res, 201, 'Payment submitted successfully');
  } catch (error) {
    console.error('Create payment error:', error);
    return sendResponse(res, 500, 'Server error', null, ['Unable to submit payment']);
  }
};

const updatePayment = async (req, res) => {
  try {
    const { id } = req.params;
    const { paymentStatus, remarks } = req.body;
    const [paymentRows] = await promisePool.query('SELECT * FROM payments WHERE id = ?', [id]);
    if (paymentRows.length === 0) {
      return sendResponse(res, 404, 'Payment record not found');
    }

    const payment = paymentRows[0];
    const [billRows] = await promisePool.query('SELECT * FROM maintenance_bills WHERE id = ?', [payment.bill_id]);
    if (billRows.length === 0) {
      return sendResponse(res, 404, 'Associated bill not found');
    }

    await promisePool.query(
      'UPDATE payments SET payment_status = ?, updated_at = NOW() WHERE id = ?',
      [paymentStatus, id]
    );
    await promisePool.query(
      `UPDATE maintenance_bills SET payment_status = ?, remarks = ?,
       paid_amount = CASE WHEN ? = 'Paid' THEN total_amount ELSE paid_amount END,
       remaining_amount = CASE WHEN ? = 'Paid' THEN 0 ELSE remaining_amount END
       WHERE id = ?`,
      [paymentStatus, remarks || null, paymentStatus, paymentStatus, payment.bill_id]
    );

    if (paymentStatus === 'Paid') {
      await promisePool.query('UPDATE maintenance_bills SET payment_date = NOW() WHERE id = ?', [payment.bill_id]);
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
      SELECT p.*, mb.total_amount, u.name AS resident_name, f.flat_no
      FROM payments p
      JOIN maintenance_bills mb ON p.bill_id = mb.id
      JOIN users u ON mb.resident_id = u.id
      JOIN flats f ON mb.flat_id = f.id
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
    const { paymentMethod = 'Manual', transactionId = `ADMIN-${Date.now()}`, remarks = 'Marked paid by admin' } = req.body;

    const [billRows] = await promisePool.query('SELECT * FROM maintenance_bills WHERE id = ?', [id]);
    if (billRows.length === 0) {
      return sendResponse(res, 404, 'Bill not found');
    }

    const bill = billRows[0];
    const amount = Number(bill.total_amount || 0);

    await promisePool.query(
      `INSERT INTO payments (bill_id, payment_method, transaction_id, amount, payment_status, paid_at)
       VALUES (?, ?, ?, ?, 'Paid', NOW())`,
      [id, paymentMethod, transactionId, amount]
    );

    await promisePool.query(
      `UPDATE maintenance_bills
       SET payment_status = 'Paid', payment_date = NOW(), paid_amount = total_amount,
           remaining_amount = 0, remarks = ?
       WHERE id = ?`,
      [remarks, id]
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
      `UPDATE maintenance_bills
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
        query = `SELECT MONTH(payment_date) AS month, YEAR(payment_date) AS year, SUM(total_amount) AS amount
                 FROM maintenance_bills WHERE payment_status = 'Paid' AND payment_date IS NOT NULL GROUP BY YEAR(payment_date), MONTH(payment_date) ORDER BY year DESC, month DESC`;
        break;
      case 'yearly-collection':
        query = `SELECT YEAR(payment_date) AS year, SUM(total_amount) AS amount FROM maintenance_bills WHERE payment_status = 'Paid' AND payment_date IS NOT NULL GROUP BY YEAR(payment_date) ORDER BY year DESC`;
        break;
      case 'pending-bills':
        query = `SELECT mb.*, u.name AS resident_name, f.flat_no FROM maintenance_bills mb JOIN users u ON mb.resident_id = u.id JOIN flats f ON mb.flat_id = f.id WHERE mb.payment_status != 'Paid' ORDER BY mb.due_date ASC`;
        break;
      case 'paid-bills':
        query = `SELECT mb.*, u.name AS resident_name, f.flat_no FROM maintenance_bills mb JOIN users u ON mb.resident_id = u.id JOIN flats f ON mb.flat_id = f.id WHERE mb.payment_status = 'Paid' ORDER BY mb.payment_date DESC`;
        break;
      case 'defaulters':
        query = `SELECT mb.*, u.name AS resident_name, f.flat_no FROM maintenance_bills mb JOIN users u ON mb.resident_id = u.id JOIN flats f ON mb.flat_id = f.id WHERE mb.payment_status != 'Paid' AND mb.due_date < CURDATE() ORDER BY mb.due_date ASC`;
        break;
      case 'income-summary':
        query = `SELECT SUM(total_amount) AS total_collection, SUM(CASE WHEN payment_status = 'Paid' THEN total_amount ELSE 0 END) AS paid_collection, SUM(CASE WHEN payment_status != 'Paid' THEN total_amount ELSE 0 END) AS pending_collection FROM maintenance_bills`;
        break;
      default:
        query = `SELECT COUNT(*) AS total_bills, SUM(CASE WHEN payment_status = 'Paid' THEN 1 ELSE 0 END) AS paid_bills, SUM(CASE WHEN payment_status != 'Paid' THEN 1 ELSE 0 END) AS pending_bills, SUM(CASE WHEN due_date < CURDATE() AND payment_status != 'Paid' THEN 1 ELSE 0 END) AS overdue_bills, SUM(CASE WHEN payment_status = 'Paid' THEN total_amount ELSE 0 END) AS total_collection, SUM(CASE WHEN payment_status != 'Paid' THEN total_amount ELSE 0 END) AS pending_collection FROM maintenance_bills`;
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
  getPayments,
  markBillPaid,
  sendPaymentReminder,
  getReports
};
