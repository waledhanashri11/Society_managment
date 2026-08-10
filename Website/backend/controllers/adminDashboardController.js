const { promisePool } = require('../config/database');

const getAdminDashboard = async (req, res) => {
  try {
    const societyId = req.user.societyId;
    const userId = req.user.id;
    const [rows] = await promisePool.query(
      `WITH tenant AS (
         SELECT ?::bigint AS society_id
       ), resident_stats AS (
         SELECT COUNT(*) FILTER (WHERE role = 'resident')::int AS total_residents,
                COUNT(*) FILTER (WHERE role = 'resident' AND LOWER(COALESCE(status, 'approved')) = 'pending')::int AS pending_registrations
         FROM users u, tenant t WHERE u.society_id = t.society_id
       ), flat_stats AS (
         SELECT COUNT(*)::int AS total_flats,
                COUNT(*) FILTER (WHERE LOWER(COALESCE(status, '')) = 'occupied' OR current_resident_id IS NOT NULL)::int AS occupied_flats
         FROM flats f, tenant t WHERE f.society_id = t.society_id
       ), bill_stats AS (
         SELECT COALESCE(SUM(COALESCE(total_amount, amount, 0)), 0) AS total_billed,
                COALESCE(SUM(COALESCE(paid_amount, 0)), 0) AS collected,
                COALESCE(SUM(GREATEST(COALESCE(remaining_amount, 0), 0)), 0) AS pending,
                COUNT(*) FILTER (WHERE LOWER(COALESCE(status, '')) IN ('paid', 'approved', 'settled'))::int AS paid_bill_count,
                COUNT(*) FILTER (WHERE LOWER(COALESCE(status, '')) NOT IN ('paid', 'approved', 'settled', 'cancelled', 'canceled', 'void'))::int AS pending_bill_count,
                COUNT(*) FILTER (WHERE LOWER(COALESCE(status, '')) = 'overdue' OR (due_date < CURRENT_DATE AND LOWER(COALESCE(status, '')) NOT IN ('paid', 'approved', 'settled', 'cancelled', 'canceled', 'void')))::int AS overdue_bill_count
         FROM maintenance m, tenant t WHERE m.society_id = t.society_id
       ), complaint_stats AS (
         SELECT COUNT(*) FILTER (WHERE LOWER(status) = 'pending')::int AS open_complaints,
                COUNT(*) FILTER (WHERE LOWER(status) = 'in_progress')::int AS in_progress_complaints,
                COUNT(*) FILTER (WHERE LOWER(status) = 'resolved')::int AS resolved_complaints
         FROM complaints c, tenant t WHERE c.society_id = t.society_id
       )
       SELECT
         COALESCE((SELECT name FROM users u, tenant t WHERE u.id = ? AND u.society_id = t.society_id LIMIT 1), 'Admin') AS admin_name,
         r.total_residents, r.pending_registrations,
         f.total_flats, f.occupied_flats, GREATEST(f.total_flats - f.occupied_flats, 0)::int AS vacant_flats,
         b.total_billed::text, b.collected::text, b.pending::text,
         b.paid_bill_count, b.pending_bill_count, b.overdue_bill_count,
         c.open_complaints, c.in_progress_complaints, c.resolved_complaints,
         (SELECT COUNT(*)::int FROM notices n, tenant t WHERE n.society_id = t.society_id) AS total_notices,
         COALESCE((
           SELECT jsonb_agg(row_data) FROM (
             SELECT n.id::text AS id, n.title, n.description, n.status, n.created_at
             FROM notices n, tenant t WHERE n.society_id = t.society_id
             ORDER BY n.created_at DESC LIMIT 5
           ) row_data
         ), '[]'::jsonb) AS latest_notices,
         COALESCE((
           SELECT jsonb_agg(row_data) FROM (
             SELECT c.id::text AS id, c.title, c.description, c.status, c.reply,
                    u.name AS user_name, c.created_at
             FROM complaints c
             JOIN users u ON u.id = c.user_id AND u.society_id = c.society_id
             JOIN tenant t ON c.society_id = t.society_id
             ORDER BY c.created_at DESC LIMIT 4
           ) row_data
         ), '[]'::jsonb) AS recent_complaints,
         COALESCE((
           SELECT jsonb_agg(row_data) FROM (
             SELECT p.id::text AS id, p.amount::text AS amount, p.payment_status,
                    p.paid_at, p.created_at, p.transaction_id,
                    u.name AS resident_name, f.flat_no
             FROM payments p
             LEFT JOIN maintenance m ON m.id = p.bill_id AND m.society_id = p.society_id
             LEFT JOIN users u ON u.id = COALESCE(p.resident_id, m.resident_id) AND u.society_id = p.society_id
             LEFT JOIN flats f ON f.id = m.flat_id AND f.society_id = p.society_id
             JOIN tenant t ON p.society_id = t.society_id
             ORDER BY p.created_at DESC LIMIT 4
           ) row_data
         ), '[]'::jsonb) AS recent_payments
       FROM resident_stats r CROSS JOIN flat_stats f CROSS JOIN bill_stats b CROSS JOIN complaint_stats c`,
      [societyId, userId]
    );
    res.json(rows[0]);
  } catch (error) {
    console.error('Admin dashboard error:', error);
    res.status(500).json({ message: 'Unable to load admin dashboard' });
  }
};

module.exports = { getAdminDashboard };
