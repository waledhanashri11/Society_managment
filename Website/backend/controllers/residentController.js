const { promisePool } = require('../config/database');

const getDashboard = async (req, res) => {
  try {
    const userId = req.user.id;
    const societyName = process.env.SOCIETY_NAME || 'Green Valley Society';

    const [userRows] = await promisePool.query(
      `SELECT u.id, u.name, u.email, f.flat_no, f.floor_no
       FROM users u
       LEFT JOIN flats f ON f.owner_id = u.id
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
         SUM(CASE WHEN visit_time::date = CURRENT_DATE THEN 1 ELSE 0 END) AS today_visitors,
         SUM(CASE WHEN visit_time > NOW() THEN 1 ELSE 0 END) AS upcoming_visitors,
         SUM(CASE WHEN status = 'approved' AND visit_time::date = CURRENT_DATE THEN 1 ELSE 0 END) AS approved_visitors
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
        flat_no: user.flat_no || 'N/A',
        floor_no: user.floor_no || null,
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

module.exports = {
  getDashboard,
  getMaintenance,
  getComplaints,
  getVisitors,
  getParcels,
  getActivities,
};
