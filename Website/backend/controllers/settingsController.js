const { promisePool } = require('../config/database');

const DEFAULT_SETTINGS = {
  adminName: 'Admin',
  societyName: 'Society Management System',
  address: 'Tower A, Green Avenue Society',
  email: 'admin@societyhub.com',
  phone: '+91 98765 43210',
  maintenanceAmount: '2500',
  dueDay: '31',
  lateFee: '150',
  autoReminder: true,
  paymentAlerts: true,
  complaintAlerts: true,
  visitorAlerts: false,
  paymentQrImage: '',
  paymentUpiId: '',
  paymentNote: 'Scan this QR to pay maintenance, then submit your transaction ID for admin approval.'
};

const parseSettingValue = (value) => {
  if (!value) return {};
  if (typeof value === 'object') return value;
  try {
    return JSON.parse(value);
  } catch (error) {
    return {};
  }
};

const getSettings = async (req, res) => {
  try {
    const [settingsRows] = await promisePool.query(
      'SELECT setting_value FROM app_settings WHERE setting_key = ?',
      ['admin_settings']
    );

    const [users] = await promisePool.query(
      'SELECT id, name, email, role FROM users WHERE id = ?',
      [req.user.id]
    );

    const savedSettings = parseSettingValue(settingsRows[0]?.setting_value);
    const currentUser = users[0] || {};

    res.json({
      ...DEFAULT_SETTINGS,
      ...savedSettings,
      adminName: currentUser.name || savedSettings.adminName || DEFAULT_SETTINGS.adminName,
      email: currentUser.email || savedSettings.email || DEFAULT_SETTINGS.email
    });
  } catch (error) {
    console.error('Get settings error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const updateSettings = async (req, res) => {
  const connection = await promisePool.getConnection();
  try {
    const incomingSettings = {
      ...DEFAULT_SETTINGS,
      ...req.body,
      autoReminder: Boolean(req.body.autoReminder),
      paymentAlerts: Boolean(req.body.paymentAlerts),
      complaintAlerts: Boolean(req.body.complaintAlerts),
      visitorAlerts: Boolean(req.body.visitorAlerts)
    };

    await connection.beginTransaction();

    await connection.query(
      `INSERT INTO app_settings (setting_key, setting_value, updated_by)
       VALUES (?, ?, ?)
       ON CONFLICT (setting_key)
       DO UPDATE SET setting_value = EXCLUDED.setting_value, updated_by = EXCLUDED.updated_by, updated_at = NOW()`,
      ['admin_settings', JSON.stringify(incomingSettings), req.user.id]
    );

    if (incomingSettings.adminName && incomingSettings.email) {
      await connection.query(
        'UPDATE users SET name = ?, email = ? WHERE id = ? AND role = ?',
        [incomingSettings.adminName, incomingSettings.email, req.user.id, 'admin']
      );
    }

    await connection.commit();
    res.json(incomingSettings);
  } catch (error) {
    await connection.rollback();
    console.error('Update settings error:', error);
    res.status(500).json({ message: error.code === '23505' ? 'Email already exists' : 'Server error' });
  } finally {
    connection.release();
  }
};

const getPaymentSettings = async (req, res) => {
  try {
    const [settingsRows] = await promisePool.query(
      'SELECT setting_value FROM app_settings WHERE setting_key = ?',
      ['admin_settings']
    );

    const savedSettings = parseSettingValue(settingsRows[0]?.setting_value);

    res.json({
      societyName: savedSettings.societyName || DEFAULT_SETTINGS.societyName,
      paymentQrImage: savedSettings.paymentQrImage || '',
      paymentUpiId: savedSettings.paymentUpiId || '',
      paymentNote: savedSettings.paymentNote || DEFAULT_SETTINGS.paymentNote
    });
  } catch (error) {
    console.error('Get payment settings error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = { getSettings, updateSettings, getPaymentSettings };
