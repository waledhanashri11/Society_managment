const { promisePool } = require('../config/database');

const toIso = (value) => {
  if (!value) return new Date(0).toISOString();
  return new Date(value).toISOString();
};

const getAdminNotifications = async (req, res) => {
  try {
    const adminId = req.user.id;
    const [rows] = await promisePool.query(
      'SELECT id, resident_id, title, message, type, reference_id, is_read, created_at FROM notifications WHERE resident_id = ? AND is_read = false ORDER BY created_at DESC',
      [adminId]
    );

    const notifications = rows.map((item) => {
      let path = '/admin/dashboard';
      if (item.type === 'complaints') path = '/admin/complaints';
      else if (item.type === 'maintenance') path = '/admin/maintenance';
      else if (item.type === 'notice' || item.type === 'notices') path = '/admin/notices';
      else if (item.type === 'rule' || item.type === 'rule_reminder') path = '/admin/rules';
      else if (item.type === 'meetings' || item.type === 'meeting') path = '/admin/meetings';
      else if (item.type === 'noc') path = '/admin/noc-management';

      return {
        id: item.id,
        title: item.title,
        message: item.message,
        type: item.type,
        path,
        is_read: item.is_read,
        created_at: item.created_at
      };
    });

    res.json({ notifications, unreadCount: notifications.length });
  } catch (error) {
    console.error('Get notifications error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const markAdminNotificationsRead = async (req, res) => {
  try {
    await promisePool.query(
      'UPDATE notifications SET is_read = true WHERE resident_id = ? AND is_read = false',
      [req.user.id]
    );

    res.json({ message: 'Notifications marked as read', unreadCount: 0 });
  } catch (error) {
    console.error('Mark notifications read error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const getResidentNotifications = async (req, res) => {
  try {
    const residentId = req.user.id;
    const [notifications] = await promisePool.query(
      `SELECT id, resident_id, title, message, type, reference_id, is_read, created_at
       FROM notifications
       WHERE resident_id = ? AND is_read = false
       ORDER BY created_at DESC
       LIMIT 20`,
      [residentId]
    );
    const mapped = notifications.map((item) => {
      let path = '/resident/dashboard';
      if (item.type === 'noc') path = '/resident/noc-requests';
      else if (item.type === 'complaints') path = '/resident/complaints';
      else if (item.type === 'notice') path = '/resident/notices';
      else if (item.type === 'rule' || item.type === 'rule_reminder') path = '/resident/rules';
      else if (item.type === 'meetings' || item.type === 'meeting') path = '/resident/meetings';
      else if (item.type === 'maintenance' || item.type === 'payment') path = '/resident/maintenance';
      return { ...item, path };
    });
    const unreadCount = mapped.filter((item) => !item.is_read).length;
    res.json({ notifications: mapped, unreadCount });
  } catch (error) {
    console.error('Get resident notifications error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const markResidentNotificationRead = async (req, res) => {
  try {
    const { id } = req.params;
    const residentId = req.user.id;

    const [result] = await promisePool.query(
      'UPDATE notifications SET is_read = true WHERE id = ? AND resident_id = ?',
      [id, residentId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Notification not found' });
    }

    res.json({ message: 'Notification marked as read' });
  } catch (error) {
    console.error('Mark notification read error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const markResidentNotificationsRead = async (req, res) => {
  try {
    const residentId = req.user.id;

    await promisePool.query(
      'UPDATE notifications SET is_read = true WHERE resident_id = ?',
      [residentId]
    );

    res.json({ message: 'Notifications marked as read', unreadCount: 0 });
  } catch (error) {
    console.error('Mark resident notifications read error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  getAdminNotifications,
  markAdminNotificationsRead,
  getResidentNotifications,
  markResidentNotificationsRead,
  markResidentNotificationRead
};
