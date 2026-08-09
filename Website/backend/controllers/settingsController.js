const { promisePool } = require('../config/database');
const { buildPublicFileUrl } = require('../utils/fileUrl');

const DEFAULT_SETTINGS = {
  adminName: 'Admin',
  societyName: '',
  address: '',
  email: 'admin@societyhub.com',
  phone: '',
  maintenanceAmount: '',
  dueDay: '',
  lateFee: '',
  autoReminder: true,
  paymentAlerts: true,
  complaintAlerts: true,
  visitorAlerts: false,
  paymentQrImage: '',
  paymentUpiId: '',
  paymentNote: '',
  profilePicture: ''
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
      [`admin_settings_${req.user.id}`]
    );

    const [users] = await promisePool.query(
      'SELECT id, name, email, role, profile_picture FROM users WHERE id = ?',
      [req.user.id]
    );
    const [societies] = await promisePool.query(
      `SELECT id, name, code, logo_url, address, city, state, pincode,
              contact_email, contact_phone, registration_number, status
       FROM societies WHERE id = ?`,
      [req.user.societyId]
    );

    const savedSettings = parseSettingValue(settingsRows[0]?.setting_value);
    const currentUser = users[0] || {};

    res.json({
      ...DEFAULT_SETTINGS,
      ...savedSettings,
      adminName: currentUser.name || DEFAULT_SETTINGS.adminName,
      email: currentUser.email || DEFAULT_SETTINGS.email,
      profilePicture: currentUser.profile_picture || '',
      societyName: societies[0]?.name || savedSettings.societyName || '',
      society: societies[0] || null
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

    const { adminName, email, profilePicture } = incomingSettings;
    delete incomingSettings.adminName;
    delete incomingSettings.email;
    delete incomingSettings.profilePicture;

    await connection.beginTransaction();

    await connection.query(
      `INSERT INTO app_settings (setting_key, setting_value, updated_by)
       VALUES (?, ?, ?)
       ON CONFLICT (society_id, setting_key)
       DO UPDATE SET setting_value = EXCLUDED.setting_value, updated_by = EXCLUDED.updated_by, updated_at = NOW()`,
      [`admin_settings_${req.user.id}`, JSON.stringify(incomingSettings), req.user.id]
    );

    if (adminName && email) {
      await connection.query(
        'UPDATE users SET name = ?, email = ?, profile_picture = ? WHERE id = ? AND role = ?',
        [adminName, email, profilePicture || null, req.user.id, 'admin']
      );
    }
    if (incomingSettings.societyName || incomingSettings.address) {
      await connection.query(
        `UPDATE societies
         SET name = COALESCE(NULLIF(?, ''), name), address = COALESCE(NULLIF(?, ''), address), updated_at = NOW()
         WHERE id = ?`,
        [incomingSettings.societyName || null, incomingSettings.address || null, req.user.societyId]
      );
    }

    await connection.commit();
    res.json({
      ...incomingSettings,
      adminName,
      email,
      profilePicture: profilePicture || ''
    });
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
    // Query the most recently updated admin settings to dynamically fetch details
    const [settingsRows] = await promisePool.query(
      `SELECT setting_value FROM app_settings 
       WHERE setting_key LIKE 'admin_settings_%' 
       ORDER BY updated_at DESC LIMIT 1`
    );

    let savedSettings = {};
    if (settingsRows.length > 0) {
      savedSettings = parseSettingValue(settingsRows[0]?.setting_value);
    } else {
      // Fallback to legacy global settings if no per-admin settings exist
      const [fallbackRows] = await promisePool.query(
        'SELECT setting_value FROM app_settings WHERE setting_key = ?',
        ['admin_settings']
      );
      savedSettings = parseSettingValue(fallbackRows[0]?.setting_value);
    }

    const [societies] = await promisePool.query(
      'SELECT name, code, logo_url FROM societies WHERE id = ?',
      [req.user.societyId]
    );
    res.json({
      societyName: societies[0]?.name || savedSettings.societyName || DEFAULT_SETTINGS.societyName,
      societyCode: societies[0]?.code || '',
      societyLogoUrl: buildPublicFileUrl(req, societies[0]?.logo_url) || '',
      paymentQrImage: buildPublicFileUrl(req, savedSettings.paymentQrImage) || '',
      paymentUpiId: savedSettings.paymentUpiId || '',
      paymentNote: savedSettings.paymentNote || DEFAULT_SETTINGS.paymentNote
    });
  } catch (error) {
    console.error('Get payment settings error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const getSocietyProfile = async (req, res) => {
  try {
    const [rows] = await promisePool.query(
      `SELECT id, name, code, logo_url, address, city, state, pincode,
              contact_email, contact_phone, registration_number, status, created_at, updated_at
       FROM societies WHERE id = ?`,
      [req.user.societyId]
    );
    if (!rows.length) return res.status(404).json({ message: 'Society profile not found' });
    res.json(rows[0]);
  } catch (error) {
    console.error('Get society profile error:', error);
    res.status(500).json({ message: 'Unable to fetch society profile' });
  }
};

const updateSocietyProfile = async (req, res) => {
  try {
    const allowed = ['name','logo_url','address','city','state','pincode','contact_email','contact_phone','registration_number'];
    const values = allowed.map((key) => req.body[key] ?? req.body[key.replace(/_([a-z])/g, (_, c) => c.toUpperCase())] ?? null);
    const [result] = await promisePool.query(
      `UPDATE societies SET
         name = COALESCE(?, name), logo_url = COALESCE(?, logo_url), address = COALESCE(?, address),
         city = COALESCE(?, city), state = COALESCE(?, state), pincode = COALESCE(?, pincode),
         contact_email = COALESCE(?, contact_email), contact_phone = COALESCE(?, contact_phone),
         registration_number = COALESCE(?, registration_number), updated_at = NOW()
       WHERE id = ?`,
      [...values, req.user.societyId]
    );
    if (!result.affectedRows) return res.status(404).json({ message: 'Society profile not found' });
    return getSocietyProfile(req, res);
  } catch (error) {
    console.error('Update society profile error:', error);
    res.status(500).json({ message: 'Unable to update society profile' });
  }
};

module.exports = { getSettings, updateSettings, getPaymentSettings, getSocietyProfile, updateSocietyProfile };
