const { promisePool } = require('../config/database');

const normalizeStatus = (status) => {
  if (!status) return null;
  const normalized = String(status).trim();
  return normalized === 'all' ? null : normalized;
};

const sanitizeForResident = (data) => {
  if (data === null || data === undefined) return data;
  if (Array.isArray(data)) return data.map(sanitizeForResident);
  if (typeof data === 'object') {
    const cleaned = {};
    for (const [key, val] of Object.entries(data)) {
      if (
        /write_?off/i.test(key) ||
        /written_?off/i.test(key) ||
        key === 'approvedWriteOffs' ||
        key === 'writeOffs'
      ) {
        continue;
      }
      let value = sanitizeForResident(val);
      if (
        (key === 'status' || key === 'payment_status' || key === 'paymentStatus' || key === 'calculated_status') &&
        typeof value === 'string' &&
        /write_?off|written_?off/i.test(value)
      ) {
        value = value === value.toUpperCase() ? 'PAID' : 'Paid';
      }
      cleaned[key] = value;
    }
    return cleaned;
  }
  return data;
};

const addMonthYearFilters = (where, params, dateExpression, month, year) => {
  if (month) {
    where.push(`EXTRACT(MONTH FROM ${dateExpression}) = ?`);
    params.push(Number(month));
  }

  if (year) {
    where.push(`EXTRACT(YEAR FROM ${dateExpression}) = ?`);
    params.push(Number(year));
  }
};

const getTableColumns = async (tableName) => {
  const [columns] = await promisePool.query(`SHOW COLUMNS FROM ${tableName}`);
  return columns.map((column) => column.Field);
};

const hasColumn = (columns, columnName) => columns.includes(columnName);

const maintenanceReportColumns = async () => {
  const columns = await getTableColumns('maintenance');
  if (!columns.length) return null;

  return {
    columns,
    penalty: hasColumn(columns, 'penalty_amount') ? 'penalty_amount' : '0',
    total: hasColumn(columns, 'total_amount') ? 'total_amount' : 'amount',
    paid: hasColumn(columns, 'paid_amount') ? 'paid_amount' : "CASE WHEN status = 'Paid' THEN amount ELSE 0 END",
    remaining: hasColumn(columns, 'remaining_amount') ? 'remaining_amount' : "CASE WHEN status = 'Paid' THEN 0 ELSE amount END",
    paymentDate: hasColumn(columns, 'payment_date') ? 'payment_date' : 'NULL',
    title: hasColumn(columns, 'title') ? 'title' : "'Maintenance Bill'",
    month: hasColumn(columns, 'month') ? 'month' : 'EXTRACT(MONTH FROM due_date)',
    year: hasColumn(columns, 'year') ? 'year' : 'EXTRACT(YEAR FROM due_date)',
  };
};

const getDashboard = async (req, res) => {
  try {
    const userId = req.user.id;
    const societyName = process.env.SOCIETY_NAME || 'Green Valley Society';

    const [userRows] = await promisePool.query(
      `SELECT u.id, u.name, u.email, u.phone, u.flat_id,
              f.flat_no, f.wing, f.floor_no, f.maintenance_charge, f.status AS flat_status
       FROM users u
       LEFT JOIN flats f ON f.id = u.flat_id
       WHERE u.id = ?`,
      [userId]
    );

    const user = userRows[0] || {};

    const [billSummaryRows] = await promisePool.query(
      `SELECT
         COUNT(*) AS total_bills,
         SUM(CASE WHEN status != 'Paid' THEN 1 ELSE 0 END) AS pending_bills,
         SUM(CASE WHEN status = 'Paid' THEN 1 ELSE 0 END) AS paid_bills,
         SUM(CASE WHEN status != 'Paid' THEN remaining_amount ELSE 0 END) AS pending_amount,
         SUM(CASE WHEN status = 'Paid' THEN paid_amount ELSE 0 END) AS paid_amount
       FROM maintenance
       WHERE resident_id = ?`,
      [userId]
    );

    const billSummary = billSummaryRows[0] || {};

    const [currentBillRows] = await promisePool.query(
      `SELECT m.*, 
              m.amount AS "maintenanceAmount", m.amount AS maintenance_amount,
              m.penalty_amount AS "penaltyAmount", m.penalty_amount AS penalty_amount,
              m.total_amount AS "originalAmount", m.total_amount AS original_amount,
              m.maintenance_write_off_amount AS "maintenanceWrittenOff", m.maintenance_write_off_amount AS maintenance_written_off,
              m.penalty_write_off_amount AS "penaltyWrittenOff", m.penalty_write_off_amount AS penalty_written_off,
              m.write_off_amount AS "totalWrittenOff", m.write_off_amount AS total_written_off,
              m.remaining_amount AS "remainingPayable", m.remaining_amount AS remaining_payable,
              m.status AS payment_status, f.flat_no
       FROM maintenance m
       LEFT JOIN flats f ON m.flat_id = f.id
       WHERE m.resident_id = ? AND m.status != 'Paid'
       ORDER BY m.due_date ASC, m.created_at DESC
       LIMIT 1`,
      [userId]
    );

    const [visitorSummaryRows] = await promisePool.query(
      `SELECT
         SUM(CASE WHEN DATE(visit_time) = CURDATE() THEN 1 ELSE 0 END) AS today_visitors,
         SUM(CASE WHEN visit_time > NOW() THEN 1 ELSE 0 END) AS upcoming_visitors,
         SUM(CASE WHEN status = 'approved' AND DATE(visit_time) = CURDATE() THEN 1 ELSE 0 END) AS approved_visitors
       FROM visitors
       WHERE resident_id = ?`,
      [userId]
    );

    const [parcelSummaryRows] = await promisePool.query(
      `SELECT
         SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) AS pending_parcels,
         SUM(CASE WHEN status = 'delivered' THEN 1 ELSE 0 END) AS delivered_parcels
       FROM parcels
       WHERE resident_id = ?`,
      [userId]
    );

    const [activityCountRows] = await promisePool.query(
      `SELECT COUNT(*) AS total_activities FROM activities WHERE resident_id = ?`,
      [userId]
    );

    return res.json(sanitizeForResident({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone || null,
        flat_id: user.flat_id || null,
        flat_no: user.flat_no || 'N/A',
        wing: user.wing || null,
        floor_no: user.floor_no || null,
        maintenance_charge: Number(user.maintenance_charge || 0),
        flat_status: user.flat_status || null,
        society_name: societyName,
      },
      summary: {
        total_bills: Number(billSummary.total_bills || 0),
        pending_bills: Number(billSummary.pending_bills || 0),
        paid_bills: Number(billSummary.paid_bills || 0),
        pending_amount: Number(billSummary.pending_amount || 0),
        paid_amount: Number(billSummary.paid_amount || 0),
        family_members: 1,
        registered_vehicles: 0,
        active_notices: 0,
        today_visitors: Number(visitorSummaryRows[0]?.today_visitors || 0),
        upcoming_visitors: Number(visitorSummaryRows[0]?.upcoming_visitors || 0),
        approved_visitors: Number(visitorSummaryRows[0]?.approved_visitors || 0),
        pending_parcels: Number(parcelSummaryRows[0]?.pending_parcels || 0),
        delivered_parcels: Number(parcelSummaryRows[0]?.delivered_parcels || 0),
        total_activities: Number(activityCountRows[0]?.total_activities || 0),
      },
      currentBill: currentBillRows[0] || null,
    }));
  } catch (error) {
    console.error('Resident dashboard error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const getMaintenance = async (req, res) => {
  try {
    const userId = req.user.id;
    const [maintenance] = await promisePool.query(
      `SELECT m.*, 
              m.amount AS "maintenanceAmount", m.amount AS maintenance_amount,
              m.penalty_amount AS "penaltyAmount", m.penalty_amount AS penalty_amount,
              m.total_amount AS "originalAmount", m.total_amount AS original_amount,
              m.remaining_amount AS "remainingPayable", m.remaining_amount AS remaining_payable,
              m.status AS payment_status, f.flat_no
       FROM maintenance m
       LEFT JOIN flats f ON m.flat_id = f.id
       WHERE m.resident_id = ?
       ORDER BY m.created_at DESC`,
      [userId]
    );
    res.json(sanitizeForResident(maintenance));
  } catch (error) {
    console.error('Resident maintenance error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const getComplaints = async (req, res) => {
  try {
    const userId = req.user.id;
    const [complaints] = await promisePool.query(
      `SELECT id, title, description, status, created_at
       FROM complaints
       WHERE user_id = ?
       ORDER BY created_at DESC`,
      [userId]
    );
    res.json(complaints);
  } catch (error) {
    console.error('Resident complaints error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const getVisitors = async (req, res) => {
  try {
    const userId = req.user.id;
    const [visitors] = await promisePool.query(
      `SELECT id, name, visit_time, status, created_at
       FROM visitors
       WHERE resident_id = ?
       ORDER BY visit_time DESC
       LIMIT 20`,
      [userId]
    );
    res.json(visitors);
  } catch (error) {
    console.error('Resident visitors error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const getParcels = async (req, res) => {
  try {
    const userId = req.user.id;
    const [parcels] = await promisePool.query(
      `SELECT id, courier_name, tracking_id, status, received_date, created_at
       FROM parcels
       WHERE resident_id = ?
       ORDER BY created_at DESC
       LIMIT 20`,
      [userId]
    );
    res.json(parcels);
  } catch (error) {
    console.error('Resident parcels error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const getActivities = async (req, res) => {
  try {
    const userId = req.user.id;
    const [activities] = await promisePool.query(
      `SELECT id, type, description, created_at
       FROM activities
       WHERE resident_id = ?
       ORDER BY created_at DESC
       LIMIT 15`,
      [userId]
    );
    res.json(activities);
  } catch (error) {
    console.error('Resident activities error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const getMembers = async (req, res) => {
  try {
    const [members] = await promisePool.query(
      `SELECT u.id, u.name, u.email, u.phone, f.flat_no, f.wing, f.floor_no,
              COALESCE(
                MAX(CASE WHEN mb.payment_status != 'Paid' THEN 'pending' END),
                'paid'
              ) AS payment_status
       FROM users u
       LEFT JOIN flats f ON f.id = u.flat_id
       LEFT JOIN maintenance_bills mb ON mb.resident_id = u.id
       WHERE u.role = ? AND COALESCE(u.status, 'approved') = ?
       GROUP BY u.id, u.name, u.email, u.phone, f.flat_no, f.wing, f.floor_no
       ORDER BY f.wing, f.floor_no, f.flat_no, u.name`,
      ['resident', 'approved']
    );

    res.json(members);
  } catch (error) {
    console.error('Resident members error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const updateProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const { phone } = req.body;

    if (phone && !/^[0-9+\-\s()]{7,20}$/.test(phone)) {
      return res.status(400).json({ message: 'Enter a valid phone number' });
    }

    await promisePool.query('UPDATE users SET phone = ? WHERE id = ?', [phone || null, userId]);

    const [users] = await promisePool.query(
      'SELECT id, name, email, phone, role, status, flat_id FROM users WHERE id = ?',
      [userId]
    );

    res.json({ message: 'Profile updated successfully', user: users[0] });
  } catch (error) {
    console.error('Resident profile update error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const getReportSummary = async (req, res) => {
  try {
    const userId = req.user.id;

    const [userRows] = await promisePool.query(
      `SELECT f.flat_no, f.wing, f.floor_no
       FROM users u
       LEFT JOIN flats f ON f.id = u.flat_id
       WHERE u.id = ?`,
      [userId]
    );

    const [summaryRows] = await promisePool.query(
      `SELECT
         COUNT(*) AS total_bills,
         COALESCE(SUM(paid_amount), 0) AS total_paid_amount,
         COALESCE(SUM(remaining_amount), 0) AS total_pending_amount,
         COALESCE(SUM(penalty_amount), 0) AS total_penalty_amount
       FROM maintenance
       WHERE resident_id = ?`,
      [userId]
    );

    const [currentMonthRows] = await promisePool.query(
      `SELECT status
       FROM maintenance
       WHERE resident_id = ?
         AND EXTRACT(MONTH FROM due_date) = EXTRACT(MONTH FROM CURRENT_DATE)
         AND EXTRACT(YEAR FROM due_date) = EXTRACT(YEAR FROM CURRENT_DATE)
       ORDER BY created_at DESC
       LIMIT 1`,
      [userId]
    );

    res.json({
      flat: userRows[0] || null,
      totalBills: Number(summaryRows[0]?.total_bills || 0),
      totalPaidAmount: Number(summaryRows[0]?.total_paid_amount || 0),
      totalPendingAmount: Number(summaryRows[0]?.total_pending_amount || 0),
      totalPenaltyAmount: Number(summaryRows[0]?.total_penalty_amount || 0),
      currentMonthStatus: currentMonthRows[0]?.status || 'No Bill'
    });
  } catch (error) {
    console.error('Resident report summary error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const getReportMaintenance = async (req, res) => {
  try {
    const userId = req.user.id;
    const reportColumns = await maintenanceReportColumns();
    if (!reportColumns) return res.json([]);

    const { month, year } = req.query;
    const status = normalizeStatus(req.query.status);
    const where = ['m.resident_id = ?'];
    const params = [userId];

    addMonthYearFilters(where, params, 'm.due_date', month, year);

    if (status) {
      where.push('LOWER(m.status) = LOWER(?)');
      params.push(status);
    }

    const titleExpression = hasColumn(reportColumns.columns, 'title') ? 'm.title' : "'Maintenance Bill'";
    const monthExpression = hasColumn(reportColumns.columns, 'month') ? 'm.month' : 'EXTRACT(MONTH FROM m.due_date)';
    const yearExpression = hasColumn(reportColumns.columns, 'year') ? 'm.year' : 'EXTRACT(YEAR FROM m.due_date)';

    const [rows] = await promisePool.query(
      `SELECT m.id, ${titleExpression} AS title,
              ${monthExpression} AS month,
              ${yearExpression} AS year,
              m.amount,
              m.amount AS "maintenanceAmount", m.amount AS maintenance_amount,
              ${reportColumns.penalty === '0' ? '0' : `m.${reportColumns.penalty}`} AS "penaltyAmount", ${reportColumns.penalty === '0' ? '0' : `m.${reportColumns.penalty}`} AS penalty_amount,
              ${reportColumns.total === 'amount' ? 'm.amount' : `m.${reportColumns.total}`} AS "originalAmount", ${reportColumns.total === 'amount' ? 'm.amount' : `m.${reportColumns.total}`} AS total_amount,
              ${reportColumns.remaining.includes('CASE') ? reportColumns.remaining.replace(/\bstatus\b/g, 'm.status').replace(/\bamount\b/g, 'm.amount') : `m.${reportColumns.remaining}`} AS "remainingPayable", ${reportColumns.remaining.includes('CASE') ? reportColumns.remaining.replace(/\bstatus\b/g, 'm.status').replace(/\bamount\b/g, 'm.amount') : `m.${reportColumns.remaining}`} AS remaining_amount,
              ${reportColumns.paid.includes('CASE') ? reportColumns.paid.replace(/\bstatus\b/g, 'm.status').replace(/\bamount\b/g, 'm.amount') : `m.${reportColumns.paid}`} AS paid_amount,
              m.due_date,
              ${reportColumns.paymentDate === 'NULL' ? 'NULL' : `m.${reportColumns.paymentDate}`} AS payment_date,
              m.status, f.flat_no, f.wing, f.floor_no
       FROM maintenance m
       JOIN flats f ON f.id = m.flat_id
       WHERE ${where.join(' AND ')}
       ORDER BY year DESC, month DESC, m.due_date DESC, m.id DESC`,
      params
    );

    res.json(sanitizeForResident(rows));
  } catch (error) {
    console.error('Resident maintenance report error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const getSocietyReportSummary = async (req, res) => {
  try {
    const expenseColumns = await getTableColumns('maintenance_expenses');
    const { month, year } = req.query;
    const billWhere = ['1 = 1'];
    const billParams = [];
    addMonthYearFilters(billWhere, billParams, 'm.due_date', month, year);

    const expenseWhere = ['1 = 1'];
    const expenseParams = [];
    addMonthYearFilters(expenseWhere, expenseParams, 'expense_date', month, year);

    const [billRows] = await promisePool.query(
      `SELECT
         COUNT(*) AS total_bills,
         SUM(CASE WHEN m.status = 'Paid' THEN 1 ELSE 0 END) AS paid_bills,
         SUM(CASE WHEN m.status = 'Partial' THEN 1 ELSE 0 END) AS partial_bills,
         SUM(CASE WHEN m.status = 'Pending' OR m.status = 'Overdue' THEN 1 ELSE 0 END) AS pending_bills,
         SUM(CASE WHEN m.status = 'Overdue' OR (m.status != 'Paid' AND m.due_date < CURRENT_DATE) THEN 1 ELSE 0 END) AS overdue_bills,
         COALESCE(SUM(m.paid_amount), 0) AS total_collection,
         COALESCE(SUM(m.remaining_amount), 0) AS total_pending,
         COALESCE(SUM(m.total_amount), 0) AS total_billable
       FROM maintenance m
       JOIN users u
         ON u.id = m.resident_id
        AND u.role = 'resident'
        AND COALESCE(u.status, 'approved') = 'approved'
       WHERE ${billWhere.join(' AND ')}`,
      billParams
    );

    const [expenseRows] = expenseColumns.length ? await promisePool.query(
      `SELECT COALESCE(SUM(amount), 0) AS total_expenses
       FROM maintenance_expenses
       WHERE ${expenseWhere.join(' AND ')}`,
      expenseParams
    ) : [[{ total_expenses: 0 }]];

    const bills = billRows[0] || {};
    const totalCollection = Number(bills.total_collection || 0);
    const totalBillable = Number(bills.total_billable || 0);
    const totalExpenses = Number(expenseRows[0]?.total_expenses || 0);

    res.json({
      totalSocietyCollection: totalCollection,
      totalSocietyExpenses: totalExpenses,
      netBalance: totalCollection - totalExpenses,
      collectionRate: totalBillable > 0 ? Math.round((totalCollection / totalBillable) * 100) : 0,
      paidBillsCount: Number(bills.paid_bills || 0),
      pendingBillsCount: Number(bills.pending_bills || 0) + Number(bills.partial_bills || 0),
      overdueBillsCount: Number(bills.overdue_bills || 0)
    });
  } catch (error) {
    console.error('Resident society report error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const getReportExpenses = async (req, res) => {
  try {
    const expenseColumns = await getTableColumns('maintenance_expenses');
    if (!expenseColumns.length) return res.json([]);

    const { month, year } = req.query;
    const where = ['1 = 1'];
    const params = [];
    addMonthYearFilters(where, params, 'expense_date', month, year);

    const [rows] = await promisePool.query(
      `SELECT id, expense_number, vendor AS expense_title, category, amount,
              expense_date AS date, description
       FROM maintenance_expenses
       WHERE ${where.join(' AND ')}
       ORDER BY expense_date DESC, id DESC`,
      params
    );

    res.json(rows);
  } catch (error) {
    console.error('Resident expenses report error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const getMembersMaintenanceReport = async (req, res) => {
  try {
    const reportColumns = await maintenanceReportColumns();
    const { month, year } = req.query;
    const status = normalizeStatus(req.query.status);
    const joinFilters = [];
    const params = [];

    if (month) {
      joinFilters.push('EXTRACT(MONTH FROM m.due_date) = ?');
      params.push(Number(month));
    }

    if (year) {
      joinFilters.push('EXTRACT(YEAR FROM m.due_date) = ?');
      params.push(Number(year));
    }

    if (status) {
      joinFilters.push('LOWER(m.status) = LOWER(?)');
      params.push(status);
    }

    if (!reportColumns) {
      const [members] = await promisePool.query(
        `SELECT u.id, u.name, u.email, u.phone, f.flat_no, f.wing, f.floor_no
         FROM users u
         LEFT JOIN flats f ON f.id = u.flat_id
         WHERE u.role = ? AND COALESCE(u.status, 'approved') = ?
         ORDER BY f.wing, f.floor_no, f.flat_no, u.name`,
        ['resident', 'approved']
      );
      return res.json(members.map((row) => ({
        ...row,
        total_bills: 0,
        paid_amount: 0,
        pending_amount: 0,
        penalty_amount: 0,
        maintenance_status: 'No Bill'
      })));
    }

    const joinCondition = [
      'm.resident_id = u.id',
      ...joinFilters
    ].join(' AND ');

    const [rows] = await promisePool.query(
      `SELECT
         u.id,
         u.name,
         u.email,
         u.phone,
         f.flat_no,
         f.wing,
         f.floor_no,
         COUNT(m.id) AS total_bills,
         COALESCE(SUM(CASE WHEN m.status = 'Paid' THEN ${reportColumns.paid.includes('CASE') ? reportColumns.paid.replace(/\bstatus\b/g, 'm.status').replace(/\bamount\b/g, 'm.amount') : `m.${reportColumns.paid}`} ELSE 0 END), 0) AS paid_amount,
         COALESCE(SUM(CASE WHEN m.status != 'Paid' THEN ${reportColumns.remaining.includes('CASE') ? reportColumns.remaining.replace(/\bstatus\b/g, 'm.status').replace(/\bamount\b/g, 'm.amount') : `m.${reportColumns.remaining}`} ELSE 0 END), 0) AS pending_amount,
         COALESCE(SUM(${reportColumns.penalty === '0' ? '0' : `m.${reportColumns.penalty}`}), 0) AS penalty_amount,
         COALESCE(
           MAX(CASE WHEN m.status != 'Paid' THEN m.status END),
           MAX(m.status),
           'No Bill'
         ) AS maintenance_status
       FROM users u
       LEFT JOIN flats f ON f.id = u.flat_id
       LEFT JOIN maintenance m ON ${joinCondition}
       WHERE u.role = ? AND COALESCE(u.status, 'approved') = ?
       GROUP BY u.id, u.name, u.email, u.phone, f.flat_no, f.wing, f.floor_no
       ORDER BY f.wing, f.floor_no, f.flat_no, u.name`,
      [...params, 'resident', 'approved']
    );

    res.json(rows.map((row) => ({
      ...row,
      total_bills: Number(row.total_bills || 0),
      paid_amount: Number(row.paid_amount || 0),
      pending_amount: Number(row.pending_amount || 0),
      penalty_amount: Number(row.penalty_amount || 0),
    })));
  } catch (error) {
    console.error('Resident members maintenance report error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const getAllMaintenanceReport = async (req, res) => {
  try {
    const reportColumns = await maintenanceReportColumns();
    if (!reportColumns) return res.json([]);

    const { month, year } = req.query;
    const status = normalizeStatus(req.query.status);
    const where = ['1 = 1'];
    const params = [];

    addMonthYearFilters(where, params, 'm.due_date', month, year);

    if (status) {
      where.push('LOWER(m.status) = LOWER(?)');
      params.push(status);
    }

    const titleExpression = hasColumn(reportColumns.columns, 'title') ? 'm.title' : "'Monthly Maintenance'";
    const monthExpression = hasColumn(reportColumns.columns, 'month') ? 'm.month' : 'EXTRACT(MONTH FROM m.due_date)';
    const yearExpression = hasColumn(reportColumns.columns, 'year') ? 'm.year' : 'EXTRACT(YEAR FROM m.due_date)';
    const paidExpression = reportColumns.paid.includes('CASE')
      ? reportColumns.paid.replace(/\bstatus\b/g, 'm.status').replace(/\bamount\b/g, 'm.amount')
      : `m.${reportColumns.paid}`;
    const remainingExpression = reportColumns.remaining.includes('CASE')
      ? reportColumns.remaining.replace(/\bstatus\b/g, 'm.status').replace(/\bamount\b/g, 'm.amount')
      : `m.${reportColumns.remaining}`;

    const [rows] = await promisePool.query(
      `SELECT m.id,
              u.name AS resident_name,
              u.email AS resident_email,
              f.flat_no,
              f.wing,
              f.floor_no,
              ft.name AS flat_type_name,
              ${titleExpression} AS title,
              ${monthExpression} AS month,
              ${yearExpression} AS year,
              m.amount,
              ${reportColumns.penalty === '0' ? '0' : `m.${reportColumns.penalty}`} AS penalty_amount,
              ${reportColumns.total === 'amount' ? 'm.amount' : `m.${reportColumns.total}`} AS total_amount,
              ${paidExpression} AS paid_amount,
              ${remainingExpression} AS remaining_amount,
              m.due_date,
              ${reportColumns.paymentDate === 'NULL' ? 'NULL' : `m.${reportColumns.paymentDate}`} AS payment_date,
              m.status AS payment_status,
              m.status
       FROM maintenance m
       JOIN users u
         ON u.id = m.resident_id
        AND u.role = 'resident'
        AND COALESCE(u.status, 'approved') = 'approved'
       LEFT JOIN flats f ON f.id = m.flat_id
       LEFT JOIN flat_types ft ON m.flat_type_id = ft.id
       WHERE ${where.join(' AND ')}
       ORDER BY year DESC, month DESC, f.wing, f.floor_no, f.flat_no, u.name`,
      params
    );

    res.json(sanitizeForResident(rows));
  } catch (error) {
    console.error('Resident all maintenance report error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const getAllComplaintsReport = async (req, res) => {
  try {
    const [rows] = await promisePool.query(
      `SELECT c.id, c.title, c.description, c.status, c.reply, c.created_at,
              u.name AS user_name, u.email AS user_email,
              f.flat_no, f.wing, f.floor_no
       FROM complaints c
       JOIN users u
         ON u.id = c.user_id
        AND u.role = 'resident'
        AND COALESCE(u.status, 'approved') = 'approved'
       LEFT JOIN flats f ON f.id = u.flat_id
       ORDER BY c.created_at DESC`
    );
    res.json(rows);
  } catch (error) {
    console.error('Resident all complaints report error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const getResidentAccountReport = async (req, res) => {
  try {
    const residentId = req.user.id;
    const { financialYear } = req.query;

    const fy = financialYear || '2026-2027';
    const startYear = parseInt(fy.split('-')[0], 10) || 2026;
    const startDate = `${startYear}-04-01`;
    const endDate = `${startYear + 1}-03-31`;

    const [userRows] = await promisePool.query(
      `SELECT u.id, u.name, f.flat_no, f.wing
       FROM users u
       LEFT JOIN flats f ON u.flat_id = f.id
       WHERE u.id = ?`,
      [residentId]
    );

    const resident = userRows[0] || {};

    const [bills] = await promisePool.query(
      `SELECT m.id, m.month, m.year, m.amount AS bill_amount,
              COALESCE(m.paid_amount, 0) AS paid_amount,
              COALESCE(m.remaining_amount, m.amount, 0) AS pending_amount,
              COALESCE(m.status, 'Pending') AS status,
              m.due_date, m.created_at
       FROM maintenance m
       WHERE m.resident_id = ?
         AND m.created_at >= ?
         AND m.created_at <= ?::date + INTERVAL '1 day'
       ORDER BY m.created_at DESC`,
      [residentId, startDate, endDate]
    );

    const [payments] = await promisePool.query(
      `SELECT p.id, p.bill_id, p.amount, p.payment_method, p.payment_status, p.paid_at, p.created_at
       FROM payments p
       WHERE p.resident_id = ?
       ORDER BY p.created_at DESC`,
      [residentId]
    );

    const billsGenerated = bills.reduce((sum, b) => sum + Number(b.bill_amount || 0), 0);
    const approvedPayments = payments
      .filter((p) => ['Paid', 'Approved'].includes(p.payment_status))
      .reduce((sum, p) => sum + Number(p.amount || 0), 0);

    const totalPenalty = 0; // Penalty if tracked separately
    const openingOutstanding = 0; // Prior year carryover balance

    const closingOutstanding = bills.reduce((sum, b) => sum + Number(b.pending_amount || 0), 0);

    return res.json(sanitizeForResident({
      resident: {
        name: resident.name,
        flatNo: resident.flat_no,
        wing: resident.wing
      },
      summary: {
        openingOutstanding,
        billsGenerated,
        totalPenalty,
        approvedPayments,
        closingOutstanding,
        verificationPendingCount: payments.filter((p) => ['Pending', 'Pending Verification', 'Under Review'].includes(p.payment_status)).length,
        rejectedCount: payments.filter((p) => p.payment_status === 'Rejected').length
      },
      bills,
      payments: payments.map((p) => ({
        id: p.id,
        billId: p.bill_id,
        amount: p.amount,
        paymentMethod: p.payment_method,
        paymentStatus: p.payment_status,
        paidAt: p.paid_at || p.created_at
      }))
    }));
  } catch (error) {
    console.error('Resident account report error:', error);
    return res.status(500).json({ message: 'Server error generating resident account report' });
  }
};

const getResidentTransparencyReport = async (req, res) => {
  try {
    const { financialYear } = req.query;
    const fy = financialYear || '2026-2027';
    const startYear = parseInt(fy.split('-')[0], 10) || 2026;
    const startDate = `${startYear}-04-01`;
    const endDate = `${startYear + 1}-03-31`;

    const [obRows] = await promisePool.query(
      'SELECT bank_opening, cash_opening FROM society_opening_balances WHERE financial_year = ?',
      [fy]
    );

    const baseBankOpening = Number(obRows?.[0]?.bank_opening || 50000.00);
    const baseCashOpening = Number(obRows?.[0]?.cash_opening || 10000.00);

    const [approvedPayments] = await promisePool.query(
      `SELECT p.amount, COALESCE(p.payment_account, CASE WHEN LOWER(p.payment_method) = 'cash' THEN 'CASH' ELSE 'BANK' END) AS account
       FROM payments p
       WHERE p.payment_status IN ('Paid', 'Approved')
         AND COALESCE(p.paid_at, p.created_at) >= ?
         AND COALESCE(p.paid_at, p.created_at) <= ?::date + INTERVAL '1 day'`,
      [startDate, endDate]
    );

    const bankIncome = approvedPayments.filter((p) => p.account === 'BANK').reduce((s, p) => s + Number(p.amount || 0), 0);
    const cashIncome = approvedPayments.filter((p) => p.account === 'CASH').reduce((s, p) => s + Number(p.amount || 0), 0);

    const [approvedExpenses] = await promisePool.query(
      `SELECT e.id, e.category, e.description, e.vendor, e.amount, e.expense_date,
              COALESCE(e.payment_account, 'BANK') AS payment_account,
              COALESCE(e.status, 'Paid') AS status, 'Admin' AS approved_by
       FROM maintenance_expenses e
       WHERE COALESCE(e.status, 'Paid') = 'Paid'
         AND e.expense_date >= ?
         AND e.expense_date <= ?
       ORDER BY e.expense_date DESC`,
      [startDate, endDate]
    );

    const bankExpense = approvedExpenses.filter((e) => e.payment_account === 'BANK').reduce((s, e) => s + Number(e.amount || 0), 0);
    const cashExpense = approvedExpenses.filter((e) => e.payment_account === 'CASH').reduce((s, e) => s + Number(e.amount || 0), 0);

    const bankClosing = baseBankOpening + bankIncome - bankExpense;
    const cashClosing = baseCashOpening + cashIncome - cashExpense;

    const [sanitizedFlats] = await promisePool.query(
      `SELECT f.flat_no, f.wing, m.month, m.year, m.amount AS bill_amount,
              COALESCE(m.penalty_amount, m.penalty, 0) AS penalty_amount,
              COALESCE(m.paid_amount, 0) AS paid_amount,
              COALESCE(m.remaining_amount, m.amount, 0) AS pending_amount,
              CASE WHEN LOWER(COALESCE(m.status, '')) LIKE '%write%' OR LOWER(COALESCE(m.status, '')) LIKE '%written%' THEN 'Paid' ELSE COALESCE(m.status, 'Pending') END AS status,
              COALESCE(m.payment_date, p.paid_at, (CASE WHEN LOWER(COALESCE(m.status, '')) IN ('paid', 'partially paid', 'partially_paid') THEN m.updated_at ELSE NULL END)) AS payment_date
       FROM maintenance m
       JOIN flats f ON m.flat_id = f.id
       LEFT JOIN LATERAL (
         SELECT COALESCE(paid_at, created_at) AS paid_at FROM payments WHERE bill_id = m.id AND payment_status IN ('Approved', 'PAID', 'Paid') ORDER BY id DESC LIMIT 1
       ) p ON true
       WHERE m.created_at >= ?
         AND m.created_at <= ?::date + INTERVAL '1 day'
       ORDER BY f.wing ASC, f.flat_no ASC`,
      [startDate, endDate]
    );

    return res.json(sanitizeForResident({
      financialYear: fy,
      summary: {
        totalOpening: baseBankOpening + baseCashOpening,
        bankOpening: baseBankOpening,
        cashOpening: baseCashOpening,
        totalIncome: bankIncome + cashIncome,
        bankIncome,
        cashIncome,
        totalExpense: bankExpense + cashExpense,
        bankExpense,
        cashExpense,
        totalClosing: bankClosing + cashClosing,
        bankClosing,
        cashClosing
      },
      approvedExpenses,
      flatPayments: sanitizedFlats
    }));
  } catch (error) {
    console.error('Resident transparency report error:', error);
    return res.status(500).json({ message: 'Server error generating transparency report' });
  }
};

module.exports = {
  getDashboard,
  getMaintenance,
  getComplaints,
  getVisitors,
  getParcels,
  getActivities,
  getMembers,
  updateProfile,
  getReportSummary,
  getReportMaintenance,
  getSocietyReportSummary,
  getReportExpenses,
  getMembersMaintenanceReport,
  getAllMaintenanceReport,
  getAllComplaintsReport,
  getResidentAccountReport,
  getResidentTransparencyReport
};

