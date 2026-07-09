const { promisePool } = require('../config/database');

const toIso = (value) => {
  if (!value) return new Date(0).toISOString();
  return new Date(value).toISOString();
};

const getAdminNotifications = async (req, res) => {
  try {
    const [[readRow]] = await promisePool.query(
      'SELECT last_read_at FROM admin_notification_reads WHERE user_id = ?',
      [req.user.id]
    );

    const lastReadAt = readRow?.last_read_at ? new Date(readRow.last_read_at) : new Date(0);

    const [[pendingBills]] = await promisePool.query(
      `SELECT COUNT(*) AS total, MAX(created_at) AS latest_at
       FROM maintenance_bills
       WHERE payment_status IN ('Pending', 'Under Review')`
    );

    const [[openComplaints]] = await promisePool.query(
      `SELECT COUNT(*) AS total, MAX(created_at) AS latest_at
       FROM complaints
       WHERE status IN ('pending', 'in_progress')`
    );

    const [[latestNotices]] = await promisePool.query(
      'SELECT COUNT(*) AS total, MAX(created_at) AS latest_at FROM notices'
    );

    const notifications = [
      {
        id: 'pending-payments',
        title: `${pendingBills.total || 0} pending payments`,
        message: 'Review maintenance dues',
        type: 'maintenance',
        path: '/admin/maintenance',
        created_at: toIso(pendingBills.latest_at)
      },
      {
        id: 'open-complaints',
        title: `${openComplaints.total || 0} complaints need attention`,
        message: 'Open complaint dashboard',
        type: 'complaints',
        path: '/admin/complaints',
        created_at: toIso(openComplaints.latest_at)
      },
      {
        id: 'notices',
        title: `${latestNotices.total || 0} notices published`,
        message: 'Create or review society updates',
        type: 'notices',
        path: '/admin/notices',
        created_at: toIso(latestNotices.latest_at)
      }
    ].filter((item) => !item.title.startsWith('0 ') || item.id === 'notices');

    const unreadCount = notifications.filter((item) => new Date(item.created_at) > lastReadAt).length;

    res.json({ notifications, unreadCount });
  } catch (error) {
    console.error('Get notifications error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const markAdminNotificationsRead = async (req, res) => {
  try {
    await promisePool.query(
      `INSERT INTO admin_notification_reads (user_id, last_read_at)
       VALUES (?, NOW())
       ON CONFLICT (user_id) DO UPDATE SET last_read_at = NOW()`,
      [req.user.id]
    );

    res.json({ message: 'Notifications marked as read', unreadCount: 0 });
  } catch (error) {
    console.error('Mark notifications read error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = { getAdminNotifications, markAdminNotificationsRead };
