const { promisePool } = require('../config/database');

const categories = [
  'General Rules',
  'Parking Rules',
  'Noise Rules',
  'Cleanliness Rules',
  'Pet Policy',
  'Security Rules',
  'Maintenance Rules',
  'Common Amenities',
  'Safety Rules',
  'Penalties'
];

const defaultRules = [
  ['Respect Other Residents', 'All residents shall maintain peace, harmony, and mutual respect within the society.', 'General Rules', true],
  ['Use Society Property Responsibly', 'Society property and common facilities must be used carefully and responsibly.', 'General Rules', false],
  ['Follow Society Decisions', 'Residents must comply with resolutions and notices issued by the Society Committee.', 'General Rules', false],
  ['Report Property Damage', 'Any damage to common property should be reported immediately to the management.', 'General Rules', false],
  ['Park in Allotted Space', 'Vehicles must be parked only in the allotted parking space.', 'Parking Rules', true],
  ['Visitor Parking', 'Visitors must use designated visitor parking areas.', 'Parking Rules', false],
  ['Do Not Block Roads', 'Do not block gates, emergency exits, driveways, or fire lanes.', 'Parking Rules', false],
  ['Quiet Hours', 'Loud music and parties are not permitted between 10:00 PM and 6:00 AM.', 'Noise Rules', true],
  ['Avoid Disturbance', 'Avoid unnecessary noise in corridors, parking areas, and common spaces.', 'Noise Rules', false],
  ['Renovation Timing', 'Construction and renovation work is allowed only during society-approved hours.', 'Noise Rules', false],
  ['Waste Segregation', 'Separate wet and dry waste before disposal.', 'Cleanliness Rules', false],
  ['No Littering', 'Do not litter or throw garbage in common areas.', 'Cleanliness Rules', false],
  ['No Balcony Throwing', 'Do not throw garbage, water, or any objects from balconies or windows.', 'Cleanliness Rules', false],
  ['Pets on Leash', 'Pets must remain on a leash in all common areas.', 'Pet Policy', false],
  ['Clean After Pets', 'Pet owners must clean up after their pets.', 'Pet Policy', false],
  ['Visitor Registration', 'All visitors must register with security before entering the society.', 'Security Rules', true],
  ['Cooperate With Security', 'Residents should cooperate with security personnel during verification.', 'Security Rules', false],
  ['Pay Maintenance On Time', 'Maintenance charges should be paid before the due date.', 'Maintenance Rules', true],
  ['Report Maintenance Issues', 'Maintenance problems should be reported through the Society Management System.', 'Maintenance Rules', false],
  ['Approval for Renovation', 'Major renovation work requires prior approval from the Society Committee.', 'Maintenance Rules', false],
  ['Use Amenities Responsibly', 'Common facilities should be used responsibly and kept clean after use.', 'Common Amenities', false],
  ['Supervise Children', 'Children should always be supervised while using common facilities.', 'Common Amenities', false],
  ['Keep Emergency Exits Clear', 'Fire exits and emergency access routes must remain unobstructed.', 'Safety Rules', false],
  ['Report Emergencies', 'Immediately report fire, gas leaks, or suspicious activities to society management.', 'Safety Rules', false],
  ['Society Rule Violations', 'Repeated violations may result in penalties as decided by the Managing Committee.', 'Penalties', false],
  ['Damage Recovery', 'Residents are responsible for the repair cost of any damage caused to society property.', 'Penalties', false]
];

let schemaReady = false;

/**
 * Seeds default rules for a society if none exist.
 * This must only be called during server startup with a bypass connection,
 * or it will fail under the restricted tenant role.
 */
const seedDefaultRulesIfEmpty = async (connection, societyId) => {
  const [countRows] = await connection.query(
    'SELECT COUNT(*) AS count FROM society_rules WHERE society_id = $1',
    [societyId]
  );
  if (Number(countRows[0]?.count || 0) > 0) {
    return;
  }

  for (let index = 0; index < defaultRules.length; index += 1) {
    const [title, description, category, isPinned] = defaultRules[index];
    await connection.query(
      `INSERT INTO society_rules (title, description, category, display_order, is_pinned, is_active, status, priority, society_id)
       VALUES ($1, $2, $3, $4, $5, TRUE, 'published', 'normal', $6)`,
      [title, description, category, index + 1, isPinned, societyId]
    );
  }
};

/**
 * Called once during server startup (with a privileged bypass connection).
 * All DDL is handled by migrations — this only seeds initial data.
 */
const ensureRulesSchema = async () => {
  if (schemaReady) return;

  // Ensure a rules_version setting exists for each society
  await promisePool.query(`
    INSERT INTO app_settings (setting_key, setting_value, society_id)
    SELECT 'rules_version', '1', id FROM societies
    ON CONFLICT (society_id, setting_key) DO NOTHING
  `);

  // Seed default rules for each society that has none
  const [societies] = await promisePool.query('SELECT id FROM societies WHERE status = $1', ['active']);
  for (const society of societies) {
    const connection = await promisePool.getConnection();
    try {
      await connection.beginTransaction();
      await seedDefaultRulesIfEmpty(connection, society.id);
      await connection.commit();
    } catch (error) {
      await connection.rollback();
      console.error(`Failed to seed rules for society ${society.id}:`, error.message);
    } finally {
      connection.release();
    }
  }

  schemaReady = true;
};

const normalizeRule = (rule) => ({
  ...rule,
  priority: rule.priority || 'normal',
  status: rule.status || 'published',
  displayOrder: Number(rule.display_order || 0),
  isPinned: Boolean(rule.is_pinned),
  isActive: Boolean(rule.is_active !== false),
  createdAt: rule.created_at,
  updatedAt: rule.updated_at,
  updatedBy: rule.updated_by,
  updatedByName: rule.updated_by_name
});

const getRulesVersion = async (societyId) => {
  if (societyId) {
    // Ensure a per-society row exists
    await promisePool.query(
      `INSERT INTO app_settings (setting_key, setting_value, society_id)
       VALUES ('rules_version', '1', $1)
       ON CONFLICT (society_id, setting_key) DO NOTHING`,
      [societyId]
    );
    const [rows] = await promisePool.query(
      'SELECT setting_value FROM app_settings WHERE setting_key = $1 AND society_id = $2',
      ['rules_version', societyId]
    );
    return Number(rows[0]?.setting_value || 1);
  }
  const [rows] = await promisePool.query(
    'SELECT setting_value FROM app_settings WHERE setting_key = $1 ORDER BY id DESC LIMIT 1',
    ['rules_version']
  );
  return Number(rows[0]?.setting_value || 1);
};

const bumpRulesVersion = async (connection, userId, societyId) => {
  const currentVersion = await getRulesVersion(societyId);
  const nextVersion = currentVersion + 1;
  if (societyId) {
    await connection.query(
      `INSERT INTO app_settings (setting_key, setting_value, society_id, updated_by)
       VALUES ('rules_version', $1, $2, $3)
       ON CONFLICT (society_id, setting_key)
       DO UPDATE SET setting_value = EXCLUDED.setting_value, updated_by = EXCLUDED.updated_by, updated_at = NOW()`,
      [String(nextVersion), societyId, userId]
    );
  } else {
    await connection.query(
      `INSERT INTO app_settings (setting_key, setting_value, updated_by)
       VALUES ('rules_version', $1, $2)
       ON CONFLICT (setting_key)
       DO UPDATE SET setting_value = EXCLUDED.setting_value, updated_by = EXCLUDED.updated_by, updated_at = NOW()`,
      [String(nextVersion), userId]
    );
  }
  return nextVersion;
};

const getRulesMeta = async (req, res) => {
  try {
    const societyId = req.user?.society_id || null;
    const version = await getRulesVersion(societyId);
    const [latest] = await promisePool.query('SELECT MAX(updated_at) AS last_updated FROM society_rules');
    const [userRows] = req.user?.id
      ? await promisePool.query(
        'SELECT rules_accepted, rules_accepted_at, accepted_rules_version FROM users WHERE id = $1',
        [req.user.id]
      )
      : [[]];
    const user = userRows[0] || {};
    res.json({
      version,
      lastUpdated: latest[0]?.last_updated || null,
      categories,
      acceptance: {
        rulesAccepted: Boolean(user.rules_accepted),
        rulesAcceptedAt: user.rules_accepted_at || null,
        acceptedRulesVersion: Number(user.accepted_rules_version || 0),
        needsAcceptance: req.user?.role === 'resident' && (!user.rules_accepted || Number(user.accepted_rules_version || 0) < version)
      }
    });
  } catch (error) {
    console.error('Get rules meta error:', error);
    res.status(500).json({ message: 'Server error', detail: error.message });
  }
};

const getRules = async (req, res) => {
  try {
    const societyId = req.user?.society_id || null;
    const search = String(req.query.search || '').trim().toLowerCase();
    const status = String(req.query.status || '').trim().toLowerCase();
    const includeInactive = req.user?.role === 'admin' || req.user?.role === 'super_admin';
    const whereConditions = [];
    const params = [];

    if (!includeInactive) {
      whereConditions.push(`(r.is_active = TRUE AND (r.status IS NULL OR r.status = 'published'))`);
    } else if (status && ['draft', 'published', 'archived'].includes(status)) {
      params.push(status);
      whereConditions.push(`r.status = $${params.length}`);
    }

    const whereSql = whereConditions.length ? `WHERE ${whereConditions.join(' AND ')}` : '';
    const [rows] = await promisePool.query(
      `SELECT r.*, u.name AS updated_by_name
       FROM society_rules r
       LEFT JOIN users u ON u.id = r.updated_by
       ${whereSql}
       ORDER BY r.is_pinned DESC, r.display_order ASC, r.id ASC`,
      params
    );
    const rules = rows.map(normalizeRule).filter((rule) => {
      if (!search) return true;
      return `${rule.title} ${rule.description} ${rule.category}`.toLowerCase().includes(search);
    });
    const version = await getRulesVersion(societyId);
    const [latest] = await promisePool.query('SELECT MAX(updated_at) AS last_updated FROM society_rules');
    res.json({ rules, version, lastUpdated: latest[0]?.last_updated || null, categories });
  } catch (error) {
    console.error('Get rules error:', error);
    res.status(500).json({ message: 'Server error', detail: error.message });
  }
};

const validateRule = ({ title, description, category }) => {
  if (!title || !description) return 'Rule title and description are required';
  if (category && !categories.includes(category)) return 'Invalid rule category';
  return null;
};

const createRule = async (req, res) => {
  const connection = await promisePool.getConnection();
  try {
    const error = validateRule(req.body);
    if (error) return res.status(400).json({ message: error });
    const societyId = req.user?.society_id || null;
    const [orderRows] = await connection.query(
      'SELECT COALESCE(MAX(display_order), 0) + 1 AS next_order FROM society_rules',
      []
    );
    await connection.beginTransaction();
    const [result] = await connection.query(
      `INSERT INTO society_rules (title, description, category, display_order, is_pinned, is_active, status, priority, updated_by, society_id)
       VALUES ($1, $2, $3, $4, $5, $6, 'published', 'normal', $7, $8)`,
      [
        req.body.title.trim(),
        req.body.description.trim(),
        req.body.category || 'General Rules',
        Number(req.body.displayOrder || orderRows[0]?.next_order || 1),
        Boolean(req.body.isPinned),
        req.body.isActive !== false,
        req.user.id,
        societyId
      ]
    );
    const version = await bumpRulesVersion(connection, req.user.id, societyId);
    await connection.commit();
    res.status(201).json({ id: result.insertId, version, message: 'Rule added successfully' });
  } catch (error) {
    await connection.rollback();
    console.error('Create rule error:', error);
    res.status(500).json({ message: 'Server error', detail: error.message });
  } finally {
    connection.release();
  }
};

const updateRule = async (req, res) => {
  const connection = await promisePool.getConnection();
  try {
    const error = validateRule(req.body);
    if (error) return res.status(400).json({ message: error });
    const societyId = req.user?.society_id || null;
    await connection.beginTransaction();
    const [updated] = await connection.query(
      `UPDATE society_rules
       SET title = $1, description = $2, category = $3, is_pinned = $4, is_active = $5, updated_by = $6, updated_at = NOW()
       WHERE id = $7`,
      [
        req.body.title.trim(),
        req.body.description.trim(),
        req.body.category || 'General Rules',
        Boolean(req.body.isPinned),
        req.body.isActive !== false,
        req.user.id,
        req.params.id
      ]
    );
    if (!updated.affectedRows) {
      await connection.rollback();
      return res.status(404).json({ message: 'Rule not found' });
    }
    const version = await bumpRulesVersion(connection, req.user.id, societyId);
    await connection.commit();
    res.json({ version, message: 'Rule updated successfully' });
  } catch (error) {
    await connection.rollback();
    console.error('Update rule error:', error);
    res.status(500).json({ message: 'Server error', detail: error.message });
  } finally {
    connection.release();
  }
};

const deleteRule = async (req, res) => {
  const connection = await promisePool.getConnection();
  try {
    const societyId = req.user?.society_id || null;
    await connection.beginTransaction();
    const [deleted] = await connection.query(
      'DELETE FROM society_rules WHERE id = $1',
      [req.params.id]
    );
    if (!deleted.affectedRows) {
      await connection.rollback();
      return res.status(404).json({ message: 'Rule not found' });
    }
    const version = await bumpRulesVersion(connection, req.user.id, societyId);
    await connection.commit();
    res.json({ version, message: 'Rule deleted successfully' });
  } catch (error) {
    await connection.rollback();
    console.error('Delete rule error:', error);
    res.status(500).json({ message: 'Server error', detail: error.message });
  } finally {
    connection.release();
  }
};

const reorderRules = async (req, res) => {
  const connection = await promisePool.getConnection();
  try {
    const ids = Array.isArray(req.body.ids) ? req.body.ids.map(Number).filter(Boolean) : [];
    if (!ids.length) return res.status(400).json({ message: 'Rule order is required' });
    const societyId = req.user?.society_id || null;
    await connection.beginTransaction();
    for (let index = 0; index < ids.length; index += 1) {
      await connection.query(
        'UPDATE society_rules SET display_order = $1, updated_by = $2, updated_at = NOW() WHERE id = $3',
        [index + 1, req.user.id, ids[index]]
      );
    }
    const version = await bumpRulesVersion(connection, req.user.id, societyId);
    await connection.commit();
    res.json({ version, message: 'Rules reordered successfully' });
  } catch (error) {
    await connection.rollback();
    console.error('Reorder rules error:', error);
    res.status(500).json({ message: 'Server error', detail: error.message });
  } finally {
    connection.release();
  }
};

const acceptRules = async (req, res) => {
  try {
    if (req.user.role !== 'resident') return res.status(403).json({ message: 'Only residents can accept society rules' });
    const societyId = req.user?.society_id || null;
    const version = await getRulesVersion(societyId);
    await promisePool.query(
      `UPDATE users
       SET rules_accepted = TRUE, rules_accepted_at = NOW(), accepted_rules_version = $1
       WHERE id = $2`,
      [version, req.user.id]
    );
    res.json({ version, rulesAccepted: true, rulesAcceptedAt: new Date().toISOString(), message: 'Rules accepted successfully' });
  } catch (error) {
    console.error('Accept rules error:', error);
    res.status(500).json({ message: 'Server error', detail: error.message });
  }
};

const getAcceptanceReport = async (req, res) => {
  try {
    const societyId = req.user?.society_id || null;
    const version = await getRulesVersion(societyId);
    const [rows] = await promisePool.query(
      `SELECT u.id, u.name AS resident_name, u.rules_accepted, u.rules_accepted_at, u.accepted_rules_version,
              f.flat_no, f.wing
       FROM users u
       LEFT JOIN flats f ON f.id = u.flat_id
       WHERE u.role = 'resident' AND COALESCE(u.status, 'approved') = 'approved'
       ORDER BY u.name ASC`
    );
    const statusFilter = req.query.status || 'all';
    const search = String(req.query.search || '').toLowerCase();
    const flat = String(req.query.flat || '').toLowerCase();
    const wing = String(req.query.wing || '').toLowerCase();
    const report = rows.filter((row) => {
      const acceptedCurrent = Boolean(row.rules_accepted) && Number(row.accepted_rules_version || 0) >= version;
      if (statusFilter === 'accepted' && !acceptedCurrent) return false;
      if (statusFilter === 'not_accepted' && acceptedCurrent) return false;
      if (search && !`${row.resident_name || ''}`.toLowerCase().includes(search)) return false;
      if (flat && !`${row.flat_no || ''}`.toLowerCase().includes(flat)) return false;
      if (wing && !`${row.wing || ''}`.toLowerCase().includes(wing)) return false;
      return true;
    }).map((row) => ({
      residentId: row.id,
      residentName: row.resident_name,
      flatNumber: row.flat_no || '-',
      wing: row.wing || '-',
      accepted: Boolean(row.rules_accepted) && Number(row.accepted_rules_version || 0) >= version,
      acceptedVersion: Number(row.accepted_rules_version || 0),
      acceptedAt: row.rules_accepted_at
    }));
    res.json({ version, report });
  } catch (error) {
    console.error('Rules acceptance report error:', error);
    res.status(500).json({ message: 'Server error', detail: error.message });
  }
};

module.exports = {
  initializeRulesSchema: ensureRulesSchema,
  getRules,
  getRulesMeta,
  createRule,
  updateRule,
  deleteRule,
  reorderRules,
  acceptRules,
  getAcceptanceReport
};
