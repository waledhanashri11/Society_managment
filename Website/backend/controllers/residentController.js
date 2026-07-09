const { promisePool } = require('../config/database');

const normalizeStatus = (status) => {
  if (!status) return null;
  const normalized = String(status).trim();
  return normalized === 'all' ? null : normalized;
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
         SUM(CASE WHEN payment_status != 'Paid' THEN 1 ELSE 0 END) AS pending_bills,
         SUM(CASE WHEN payment_status = 'Paid' THEN 1 ELSE 0 END) AS paid_bills,
         SUM(CASE WHEN payment_status != 'Paid' THEN total_amount ELSE 0 END) AS pending_amount,
         SUM(CASE WHEN payment_status = 'Paid' THEN total_amount ELSE 0 END) AS paid_amount
       FROM maintenance_bills
       WHERE resident_id = ?`,
      [userId]
    );

    const billSummary = billSummaryRows[0] || {};

    const [currentBillRows] = await promisePool.query(
      `SELECT mb.*, m.title, m.month, m.year, m.due_date, f.flat_no
       FROM maintenance_bills mb
       JOIN maintenance m ON mb.maintenance_id = m.id
       LEFT JOIN flats f ON mb.flat_id = f.id
       WHERE mb.resident_id = ? AND mb.payment_status != 'Paid'
       ORDER BY mb.due_date ASC, mb.created_at DESC
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

    return res.json({
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
    });
  } catch (error) {
    console.error('Resident dashboard error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const getMaintenance = async (req, res) => {
  try {
    const userId = req.user.id;
    const [maintenance] = await promisePool.query(
      `SELECT mb.id, mb.amount, mb.late_fee, mb.total_amount, mb.payment_status, mb.payment_date, mb.due_date,
              m.title, m.month, m.year,
              f.flat_no
       FROM maintenance_bills mb
       JOIN maintenance m ON mb.maintenance_id = m.id
       LEFT JOIN flats f ON mb.flat_id = f.id
       WHERE mb.resident_id = ?
       ORDER BY mb.created_at DESC`,
      [userId]
    );
    res.json(maintenance);
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
         COALESCE(SUM(CASE WHEN status = 'Paid' THEN paid_amount ELSE 0 END), 0) AS total_paid_amount,
         COALESCE(SUM(CASE WHEN status != 'Paid' THEN remaining_amount ELSE 0 END), 0) AS total_pending_amount,
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
    const { month, year } = req.query;
    const status = normalizeStatus(req.query.status);
    const where = ['m.resident_id = ?'];
    const params = [userId];

    addMonthYearFilters(where, params, 'm.due_date', month, year);

    if (status) {
      where.push('LOWER(m.status) = LOWER(?)');
      params.push(status);
    }

    const [rows] = await promisePool.query(
      `SELECT m.id, m.title, m.month, m.year, m.amount, m.penalty_amount,
              m.total_amount, m.paid_amount, m.remaining_amount, m.due_date,
              m.payment_date, m.status, f.flat_no, f.wing, f.floor_no
       FROM maintenance m
       JOIN flats f ON f.id = m.flat_id
       WHERE ${where.join(' AND ')}
       ORDER BY m.year DESC, m.month DESC, m.due_date DESC, m.id DESC`,
      params
    );

    res.json(rows);
  } catch (error) {
    console.error('Resident maintenance report error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const getSocietyReportSummary = async (req, res) => {
  try {
    const { month, year } = req.query;
    const billWhere = ['1 = 1'];
    const billParams = [];
    addMonthYearFilters(billWhere, billParams, 'due_date', month, year);

    const expenseWhere = ['1 = 1'];
    const expenseParams = [];
    addMonthYearFilters(expenseWhere, expenseParams, 'expense_date', month, year);

    const [billRows] = await promisePool.query(
      `SELECT
         COUNT(*) AS total_bills,
         SUM(CASE WHEN status = 'Paid' THEN 1 ELSE 0 END) AS paid_bills,
         SUM(CASE WHEN status != 'Paid' THEN 1 ELSE 0 END) AS pending_bills,
         SUM(CASE WHEN status != 'Paid' AND due_date < CURRENT_DATE THEN 1 ELSE 0 END) AS overdue_bills,
         COALESCE(SUM(CASE WHEN status = 'Paid' THEN paid_amount ELSE 0 END), 0) AS total_collection,
         COALESCE(SUM(total_amount), 0) AS total_billable
       FROM maintenance
       WHERE ${billWhere.join(' AND ')}`,
      billParams
    );

    const [expenseRows] = await promisePool.query(
      `SELECT COALESCE(SUM(amount), 0) AS total_expenses
       FROM maintenance_expenses
       WHERE ${expenseWhere.join(' AND ')}`,
      expenseParams
    );

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
      pendingBillsCount: Number(bills.pending_bills || 0),
      overdueBillsCount: Number(bills.overdue_bills || 0)
    });
  } catch (error) {
    console.error('Resident society report error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const getReportExpenses = async (req, res) => {
  try {
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
};
