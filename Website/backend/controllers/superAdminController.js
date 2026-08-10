const bcrypt = require('bcryptjs');
const { promisePool } = require('../config/database');

const normalizeSociety = (body) => ({
  name: String(body.name || '').trim(),
  code: String(body.code || '').trim().toUpperCase(),
  logoUrl: body.logoUrl ? String(body.logoUrl).trim() : null,
  address: body.address ? String(body.address).trim() : null,
  city: body.city ? String(body.city).trim() : null,
  state: body.state ? String(body.state).trim() : null,
  pincode: body.pincode ? String(body.pincode).trim() : null,
  registrationNumber: body.registrationNumber ? String(body.registrationNumber).trim() : null,
  contactPhone: body.contactPhone ? String(body.contactPhone).trim() : null,
  contactEmail: body.contactEmail ? String(body.contactEmail).trim().toLowerCase() : null
});

const validateSociety = (society) => {
  if (!society.name) return 'Society name is required';
  if (!/^[A-Z0-9_-]{2,24}$/.test(society.code)) return 'Society code must contain 2-24 letters, numbers, hyphens or underscores';
  if (society.contactEmail && !/^\S+@\S+\.\S+$/.test(society.contactEmail)) return 'Contact email is invalid';
  return null;
};

const seedFlatTypesFromTemplate = async (connection, societyId) => {
  // Mahalaxmi (the migrated original tenant) is the platform template. Copy
  // its active/inactive property profiles into every newly-created tenant.
  await connection.query(
    `INSERT INTO flat_types (society_id, name, default_maintenance_amount, description, status)
     SELECT ?, name, default_maintenance_amount, description, status
     FROM flat_types
     WHERE society_id = 1
     ON CONFLICT DO NOTHING`,
    [societyId]
  );
};

const dashboard = async (_req, res) => {
  try {
    const [rows] = await promisePool.query(
      `SELECT
         (SELECT COUNT(*)::int FROM societies) AS total_societies,
         (SELECT COUNT(*)::int FROM societies WHERE status = 'active') AS active_societies,
         (SELECT COUNT(*)::int FROM societies WHERE status <> 'active') AS inactive_societies,
         (SELECT COUNT(*)::int FROM users WHERE role = 'resident') AS total_residents,
         (SELECT COUNT(*)::int FROM flats) AS total_flats`
    );
    res.json(rows[0]);
  } catch (error) {
    console.error('Super Admin dashboard error:', error);
    res.status(500).json({ message: 'Unable to load platform dashboard' });
  }
};

const listSocieties = async (_req, res) => {
  try {
    const [rows] = await promisePool.query(
      `SELECT s.*,
              COUNT(DISTINCT u.id) FILTER (WHERE u.role = 'resident')::int AS resident_count,
              COUNT(DISTINCT f.id)::int AS flat_count,
              MAX(a.name) FILTER (WHERE a.role = 'admin') AS admin_name,
              MAX(a.email) FILTER (WHERE a.role = 'admin') AS admin_email
       FROM societies s
       LEFT JOIN users u ON u.society_id = s.id
       LEFT JOIN flats f ON f.society_id = s.id
       LEFT JOIN users a ON a.society_id = s.id AND a.role = 'admin'
       GROUP BY s.id ORDER BY s.created_at DESC`
    );
    res.json(rows);
  } catch (error) {
    console.error('List societies error:', error);
    res.status(500).json({ message: 'Unable to load societies' });
  }
};

const getSociety = async (req, res) => {
  try {
    const [rows] = await promisePool.query(
      `SELECT s.*,
              COUNT(DISTINCT u.id) FILTER (WHERE u.role = 'resident')::int AS resident_count,
              COUNT(DISTINCT f.id)::int AS flat_count,
              MAX(a.name) FILTER (WHERE a.role = 'admin') AS admin_name,
              MAX(a.email) FILTER (WHERE a.role = 'admin') AS admin_email,
              MAX(a.phone) FILTER (WHERE a.role = 'admin') AS admin_phone
       FROM societies s
       LEFT JOIN users u ON u.society_id = s.id
       LEFT JOIN flats f ON f.society_id = s.id
       LEFT JOIN users a ON a.society_id = s.id AND a.role = 'admin'
       WHERE s.id = ? GROUP BY s.id`,
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ message: 'Society not found' });
    res.json(rows[0]);
  } catch (error) {
    console.error('Get society error:', error);
    res.status(500).json({ message: 'Unable to load society' });
  }
};

const createSociety = async (req, res) => {
  const society = normalizeSociety(req.body);
  const validation = validateSociety(society);
  const admin = req.body.admin || {};
  const adminName = String(admin.name || '').trim();
  const adminEmail = String(admin.email || '').trim().toLowerCase();
  const adminPhone = admin.phone ? String(admin.phone).trim() : null;
  const adminPassword = String(admin.password || '');
  if (validation) return res.status(400).json({ message: validation });
  if (!adminName || !/^\S+@\S+\.\S+$/.test(adminEmail) || adminPassword.length < 10) {
    return res.status(400).json({ message: 'Admin name, valid email and a password of at least 10 characters are required' });
  }
  const connection = await promisePool.getConnection();
  try {
    await connection.beginTransaction();
    const [created] = await connection.query(
      `INSERT INTO societies (name, code, logo_url, address, city, state, pincode, registration_number, contact_phone, contact_email, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active')`,
      [society.name, society.code, society.logoUrl, society.address, society.city, society.state, society.pincode, society.registrationNumber, society.contactPhone, society.contactEmail]
    );
    const societyId = created.insertId;
    await seedFlatTypesFromTemplate(connection, societyId);
    const passwordHash = await bcrypt.hash(adminPassword, 12);
    await connection.query(
      `INSERT INTO users (name, email, phone, password, role, status, society_id)
       VALUES (?, ?, ?, ?, 'admin', 'approved', ?)`,
      [adminName, adminEmail, adminPhone, passwordHash, societyId]
    );
    await connection.commit();
    res.status(201).json({ id: societyId, message: 'Society and administrator created successfully' });
  } catch (error) {
    await connection.rollback();
    console.error('Create society error:', error);
    res.status(error.code === '23505' ? 409 : 500).json({ message: error.code === '23505' ? 'Society code or administrator email already exists' : 'Unable to create society' });
  } finally {
    connection.release();
  }
};

const updateSociety = async (req, res) => {
  const society = normalizeSociety(req.body);
  const validation = validateSociety(society);
  if (validation) return res.status(400).json({ message: validation });
  try {
    const [result] = await promisePool.query(
      `UPDATE societies SET name = ?, code = ?, logo_url = ?, address = ?, city = ?, state = ?, pincode = ?,
       registration_number = ?, contact_phone = ?, contact_email = ?, updated_at = NOW() WHERE id = ?`,
      [society.name, society.code, society.logoUrl, society.address, society.city, society.state, society.pincode, society.registrationNumber, society.contactPhone, society.contactEmail, req.params.id]
    );
    if (!result.affectedRows) return res.status(404).json({ message: 'Society not found' });
    res.json({ message: 'Society updated successfully' });
  } catch (error) {
    console.error('Update society error:', error);
    res.status(error.code === '23505' ? 409 : 500).json({ message: error.code === '23505' ? 'Society code already exists' : 'Unable to update society' });
  }
};

const setSocietyStatus = async (req, res) => {
  const status = String(req.body.status || '').toLowerCase();
  if (!['active', 'inactive'].includes(status)) return res.status(400).json({ message: 'Status must be active or inactive' });
  try {
    const [result] = await promisePool.query('UPDATE societies SET status = ?, updated_at = NOW() WHERE id = ?', [status, req.params.id]);
    if (!result.affectedRows) return res.status(404).json({ message: 'Society not found' });
    res.json({ message: `Society ${status === 'active' ? 'activated' : 'deactivated'} successfully` });
  } catch (error) {
    console.error('Society status error:', error);
    res.status(500).json({ message: 'Unable to update society status' });
  }
};

const deleteSociety = async (req, res) => {
  const societyId = Number(req.params.id);
  if (!Number.isInteger(societyId) || societyId <= 0) return res.status(400).json({ message: 'A valid society id is required' });
  const connection = await promisePool.getConnection();
  try {
    await connection.beginTransaction();
    const [societies] = await connection.query('SELECT id FROM societies WHERE id = ? FOR UPDATE', [societyId]);
    if (!societies.length) { await connection.rollback(); return res.status(404).json({ message: 'Society not found' }); }
    const [usage] = await connection.query(`SELECT COUNT(*) FILTER (WHERE role = 'resident')::int AS resident_count, (SELECT COUNT(*)::int FROM flats WHERE society_id = ?) AS flat_count FROM users WHERE society_id = ?`, [societyId, societyId]);
    if (Number(usage[0].resident_count) > 0 || Number(usage[0].flat_count) > 0) { await connection.rollback(); return res.status(409).json({ message: 'A society with residents or flats cannot be deleted. Deactivate it instead.' }); }
    await connection.query('DELETE FROM password_reset_tokens WHERE society_id = ?', [societyId]);
    await connection.query('DELETE FROM users WHERE society_id = ?', [societyId]);
    await connection.query('DELETE FROM societies WHERE id = ?', [societyId]);
    await connection.commit();
    res.json({ message: 'Society deleted successfully' });
  } catch (error) {
    await connection.rollback();
    console.error('Delete society error:', error);
    if (error.code === '23503') return res.status(409).json({ message: 'This society has linked records and cannot be deleted. Deactivate it instead.' });
    res.status(500).json({ message: 'Unable to delete society' });
  } finally { connection.release(); }
};

const manageAdmin = async (req, res) => {
  const name = String(req.body.name || '').trim();
  const email = String(req.body.email || '').trim().toLowerCase();
  const phone = req.body.phone ? String(req.body.phone).trim() : null;
  const password = String(req.body.password || '');
  if (!name || !/^\S+@\S+\.\S+$/.test(email)) return res.status(400).json({ message: 'Admin name and valid email are required' });
  try {
    const [societies] = await promisePool.query('SELECT id FROM societies WHERE id = ?', [req.params.id]);
    if (!societies.length) return res.status(404).json({ message: 'Society not found' });
    const [admins] = await promisePool.query("SELECT id FROM users WHERE society_id = ? AND role = 'admin' ORDER BY id LIMIT 1", [req.params.id]);
    const hash = password ? await bcrypt.hash(password, 12) : null;
    if (!admins.length) {
      if (password.length < 10) return res.status(400).json({ message: 'A password of at least 10 characters is required for a new administrator' });
      await promisePool.query("INSERT INTO users (name, email, phone, password, role, status, society_id) VALUES (?, ?, ?, ?, 'admin', 'approved', ?)", [name, email, phone, hash, req.params.id]);
    } else if (hash) {
      await promisePool.query("UPDATE users SET name = ?, email = ?, phone = ?, password = ?, status = 'approved' WHERE id = ? AND society_id = ?", [name, email, phone, hash, admins[0].id, req.params.id]);
    } else {
      await promisePool.query("UPDATE users SET name = ?, email = ?, phone = ?, status = 'approved' WHERE id = ? AND society_id = ?", [name, email, phone, admins[0].id, req.params.id]);
    }
    res.json({ message: 'Society administrator updated successfully' });
  } catch (error) {
    console.error('Manage society admin error:', error);
    res.status(error.code === '23505' ? 409 : 500).json({ message: error.code === '23505' ? 'Administrator email already exists' : 'Unable to update society administrator' });
  }
};

module.exports = { dashboard, listSocieties, getSociety, createSociety, updateSociety, setSocietyStatus, deleteSociety, manageAdmin };
