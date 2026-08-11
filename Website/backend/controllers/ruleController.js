const { promisePool } = require('../config/database');

const VALID_PRIORITIES = new Set(['low', 'normal', 'high', 'urgent']);
const VALID_STATUSES = new Set(['draft', 'published', 'archived']);
const ACK_TEXT = 'I have read and understood this rule';

let schemaReady = false;

/**
 * Called once during server startup (with a privileged bypass connection).
 * The society_rules and society_rule_acknowledgements tables are created by
 * migrations. This function only performs lightweight data-level checks.
 */
const ensureSchema = async () => {
  if (schemaReady) return;
  // Tables are created by migrations 028 and 032. Nothing to create here.
  schemaReady = true;
};

const normalizePriority = (value) => {
  const priority = String(value || 'normal').toLowerCase();
  return VALID_PRIORITIES.has(priority) ? priority : 'normal';
};

const normalizeStatus = (value) => {
  const status = String(value || 'draft').toLowerCase();
  return VALID_STATUSES.has(status) ? status : 'draft';
};

const toNullableFilter = (value) => {
  const text = String(value || '').trim();
  if (!text || text.toLowerCase() === 'all') return null;
  return text;
};

const isAdmin = (req) => req.user?.role === 'admin' || req.user?.role === 'super_admin';

const mapRule = (row) => ({
  id: row.id,
  title: row.title,
  description: row.description,
  category: row.category,
  priority: row.priority,
  status: row.status,
  created_by: row.created_by,
  created_by_name: row.created_by_name,
  published_at: row.published_at,
  archived_at: row.archived_at,
  created_at: row.created_at,
  updated_at: row.updated_at,
  read_at: row.read_at || null,
  acknowledged_at: row.acknowledged_at || null,
  acknowledgement_text: row.acknowledgement_text || null,
  is_read: Boolean(row.read_at),
  is_acknowledged: Boolean(row.acknowledged_at),
  total_residents: Number(row.total_residents || 0),
  acknowledged_count: Number(row.acknowledged_count || 0),
  pending_count: Math.max(Number(row.total_residents || 0) - Number(row.acknowledged_count || 0), 0)
});

const buildRuleFilters = (req, params, where) => {
  const search = toNullableFilter(req.query.search || req.query.q);
  const category = toNullableFilter(req.query.category);
  const priority = toNullableFilter(req.query.priority);
  const status = toNullableFilter(req.query.status);

  if (search) {
    const searchVal = `%${search.toLowerCase()}%`;
    const idx1 = params.length + 1;
    const idx2 = params.length + 2;
    const idx3 = params.length + 3;
    params.push(searchVal, searchVal, searchVal);
    where.push(`(LOWER(r.title) LIKE $${idx1} OR LOWER(r.description) LIKE $${idx2} OR LOWER(r.category) LIKE $${idx3})`);
  }
  if (category) {
    params.push(category);
    where.push(`LOWER(r.category) = LOWER($${params.length})`);
  }
  if (priority) {
    params.push(priority.toLowerCase());
    where.push(`r.priority = $${params.length}`);
  }
  if (status && isAdmin(req)) {
    params.push(status.toLowerCase());
    where.push(`r.status = $${params.length}`);
  }
};

const getRules = async (req, res) => {
  try {
    const params = [];
    const where = [];

    if (!isAdmin(req)) {
      where.push("r.status = 'published'");
    }

    // For residents: add user id for acknowledgement join before building filters
    const residentUserId = !isAdmin(req) ? req.user.id : null;

    buildRuleFilters(req, params, where);

    let joinAcknowledgement = '';
    let readAtCol = 'NULL';
    let acknowledgedAtCol = 'NULL';
    let acknowledgedTextCol = 'NULL';

    if (!isAdmin(req)) {
      params.push(residentUserId);
      const ackParamIdx = params.length;
      joinAcknowledgement = `LEFT JOIN society_rule_acknowledgements my_ack ON my_ack.rule_id = r.id AND my_ack.resident_id = $${ackParamIdx}`;
      readAtCol = 'my_ack.read_at';
      acknowledgedAtCol = 'my_ack.acknowledged_at';
      acknowledgedTextCol = 'my_ack.acknowledgement_text';
    }

    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const [rules] = await promisePool.query(
      `SELECT r.*, u.name AS created_by_name,
              ${readAtCol} AS read_at,
              ${acknowledgedAtCol} AS acknowledged_at,
              ${acknowledgedTextCol} AS acknowledgement_text,
              (SELECT COUNT(*) FROM users residents WHERE residents.role = 'resident' AND residents.status = 'approved') AS total_residents,
              (SELECT COUNT(*) FROM society_rule_acknowledgements ack WHERE ack.rule_id = r.id AND ack.acknowledged_at IS NOT NULL) AS acknowledged_count
       FROM society_rules r
       LEFT JOIN users u ON u.id = r.created_by
       ${joinAcknowledgement}
       ${whereSql}
       ORDER BY
         CASE r.priority WHEN 'urgent' THEN 1 WHEN 'high' THEN 2 WHEN 'normal' THEN 3 ELSE 4 END,
         COALESCE(r.published_at, r.created_at) DESC`,
      params
    );

    res.json(rules.map(mapRule));
  } catch (error) {
    console.error('Get rules error:', error);
    res.status(500).json({ message: 'Server error', detail: error.message });
  }
};

const getRuleById = async (req, res) => {
  try {
    const ruleId = req.params.id;
    let joinAcknowledgement = '';
    let readAtCol = 'NULL';
    let acknowledgedAtCol = 'NULL';
    let acknowledgedTextCol = 'NULL';
    const params = [ruleId];

    if (!isAdmin(req)) {
      params.push(req.user.id);
      const ackParamIdx = params.length;
      joinAcknowledgement = `LEFT JOIN society_rule_acknowledgements my_ack ON my_ack.rule_id = r.id AND my_ack.resident_id = $${ackParamIdx}`;
      readAtCol = 'my_ack.read_at';
      acknowledgedAtCol = 'my_ack.acknowledged_at';
      acknowledgedTextCol = 'my_ack.acknowledgement_text';
    }

    const statusFilter = isAdmin(req) ? '' : "AND r.status = 'published'";

    const [rules] = await promisePool.query(
      `SELECT r.*, u.name AS created_by_name,
              ${readAtCol} AS read_at,
              ${acknowledgedAtCol} AS acknowledged_at,
              ${acknowledgedTextCol} AS acknowledgement_text,
              (SELECT COUNT(*) FROM users residents WHERE residents.role = 'resident' AND residents.status = 'approved') AS total_residents,
              (SELECT COUNT(*) FROM society_rule_acknowledgements ack WHERE ack.rule_id = r.id AND ack.acknowledged_at IS NOT NULL) AS acknowledged_count
       FROM society_rules r
       LEFT JOIN users u ON u.id = r.created_by
       ${joinAcknowledgement}
       WHERE r.id = $1
       ${statusFilter}`,
      params
    );

    if (!rules.length) return res.status(404).json({ message: 'Rule not found' });
    res.json(mapRule(rules[0]));
  } catch (error) {
    console.error('Get rule error:', error);
    res.status(500).json({ message: 'Server error', detail: error.message });
  }
};

const getRuleCategories = async (req, res) => {
  try {
    const statusFilter = isAdmin(req) ? '' : "AND status = 'published'";
    const [rows] = await promisePool.query(
      `SELECT DISTINCT category
       FROM society_rules
       WHERE category IS NOT NULL AND category <> ''
         ${statusFilter}
       ORDER BY category ASC`
    );
    res.json(rows.map((row) => row.category));
  } catch (error) {
    console.error('Get rule categories error:', error);
    res.status(500).json({ message: 'Server error', detail: error.message });
  }
};

const createRule = async (req, res) => {
  try {
    const { title, description, category } = req.body;
    if (!String(title || '').trim() || !String(description || '').trim()) {
      return res.status(400).json({ message: 'Title and description are required' });
    }

    const status = normalizeStatus(req.body.status);
    const publishedAt = status === 'published' ? new Date() : null;
    const societyId = req.user?.society_id || null;
    const [result] = await promisePool.query(
      `INSERT INTO society_rules (title, description, category, priority, status, created_by, published_at, society_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        String(title).trim(),
        String(description).trim(),
        String(category || 'General').trim() || 'General',
        normalizePriority(req.body.priority),
        status,
        req.user.id,
        publishedAt,
        societyId
      ]
    );

    const ruleId = result.insertId;
    if (status === 'published') {
      await notifyResidents(ruleId, title, 'New society rule published');
    }

    res.status(201).json({ id: ruleId, message: 'Rule created successfully' });
  } catch (error) {
    console.error('Create rule error:', error);
    res.status(500).json({ message: 'Server error', detail: error.message });
  }
};

const updateRule = async (req, res) => {
  try {
    const { title, description, category } = req.body;
    if (!String(title || '').trim() || !String(description || '').trim()) {
      return res.status(400).json({ message: 'Title and description are required' });
    }

    const [result] = await promisePool.query(
      `UPDATE society_rules
       SET title = $1, description = $2, category = $3, priority = $4
       WHERE id = $5 AND status <> 'archived'`,
      [
        String(title).trim(),
        String(description).trim(),
        String(category || 'General').trim() || 'General',
        normalizePriority(req.body.priority),
        req.params.id
      ]
    );

    if (result.affectedRows === 0) return res.status(404).json({ message: 'Rule not found or archived' });
    res.json({ message: 'Rule updated successfully' });
  } catch (error) {
    console.error('Update rule error:', error);
    res.status(500).json({ message: 'Server error', detail: error.message });
  }
};

const setRuleStatus = (status) => async (req, res) => {
  try {
    const fields = status === 'published'
      ? "status = 'published', published_at = COALESCE(published_at, NOW()), archived_at = NULL"
      : status === 'archived'
        ? "status = 'archived', archived_at = NOW()"
        : "status = 'draft'";

    const [result] = await promisePool.query(
      `UPDATE society_rules SET ${fields} WHERE id = $1`,
      [req.params.id]
    );

    if (result.affectedRows === 0) return res.status(404).json({ message: 'Rule not found' });

    if (status === 'published') {
      const [rules] = await promisePool.query('SELECT title FROM society_rules WHERE id = $1', [req.params.id]);
      await notifyResidents(req.params.id, rules[0]?.title || 'Society rule', 'New society rule published');
    }

    res.json({ message: `Rule ${status === 'draft' ? 'unpublished' : status} successfully` });
  } catch (error) {
    console.error('Set rule status error:', error);
    res.status(500).json({ message: 'Server error', detail: error.message });
  }
};

const markRuleRead = async (req, res) => {
  try {
    const ruleId = req.params.id;
    const [rules] = await promisePool.query("SELECT id FROM society_rules WHERE id = $1 AND status = 'published'", [ruleId]);
    if (!rules.length) return res.status(404).json({ message: 'Rule not found' });

    await promisePool.query(
      `INSERT INTO society_rule_acknowledgements (rule_id, resident_id, read_at, society_id)
       VALUES ($1, $2, NOW(), $3)
       ON CONFLICT (rule_id, resident_id)
       DO UPDATE SET read_at = COALESCE(society_rule_acknowledgements.read_at, EXCLUDED.read_at)`,
      [ruleId, req.user.id, req.user.society_id]
    );

    res.json({ message: 'Rule marked as read' });
  } catch (error) {
    console.error('Mark rule read error:', error);
    res.status(500).json({ message: 'Server error', detail: error.message });
  }
};

const acknowledgeRule = async (req, res) => {
  try {
    const ruleId = req.params.id;
    const [rules] = await promisePool.query("SELECT id FROM society_rules WHERE id = $1 AND status = 'published'", [ruleId]);
    if (!rules.length) return res.status(404).json({ message: 'Rule not found' });

    const [existing] = await promisePool.query(
      'SELECT acknowledged_at FROM society_rule_acknowledgements WHERE rule_id = $1 AND resident_id = $2',
      [ruleId, req.user.id]
    );
    if (existing[0]?.acknowledged_at) {
      return res.status(409).json({ message: 'Rule already acknowledged' });
    }

    await promisePool.query(
      `INSERT INTO society_rule_acknowledgements (rule_id, resident_id, read_at, acknowledged_at, acknowledgement_text, society_id)
       VALUES ($1, $2, NOW(), NOW(), $3, $4)
       ON CONFLICT (rule_id, resident_id)
       DO UPDATE SET
         read_at = COALESCE(society_rule_acknowledgements.read_at, NOW()),
         acknowledged_at = COALESCE(society_rule_acknowledgements.acknowledged_at, NOW()),
         acknowledgement_text = COALESCE(society_rule_acknowledgements.acknowledgement_text, EXCLUDED.acknowledgement_text)`,
      [ruleId, req.user.id, ACK_TEXT, req.user.society_id]
    );

    res.json({ message: 'Rule acknowledged successfully' });
  } catch (error) {
    console.error('Acknowledge rule error:', error);
    res.status(500).json({ message: 'Server error', detail: error.message });
  }
};

const getAcknowledgementReport = async (req, res) => {
  try {
    const ruleId = req.params.id;
    const [rules] = await promisePool.query('SELECT id, title FROM society_rules WHERE id = $1', [ruleId]);
    if (!rules.length) return res.status(404).json({ message: 'Rule not found' });

    const [rows] = await promisePool.query(
      `SELECT u.id AS resident_id, u.name AS resident_name, u.email, u.phone,
              f.flat_no, f.wing,
              ack.read_at, ack.acknowledged_at, ack.acknowledgement_text
       FROM users u
       LEFT JOIN flats f ON f.id = u.flat_id
       LEFT JOIN society_rule_acknowledgements ack
         ON ack.rule_id = $1 AND ack.resident_id = u.id
       WHERE u.role = 'resident' AND u.status = 'approved'
       ORDER BY ack.acknowledged_at DESC NULLS LAST, u.name ASC`,
      [ruleId]
    );

    const acknowledged = rows.filter((row) => row.acknowledged_at).length;
    res.json({
      rule: rules[0],
      summary: {
        total_residents: rows.length,
        acknowledged_count: acknowledged,
        pending_count: rows.length - acknowledged
      },
      residents: rows.map((row) => ({
        resident_id: row.resident_id,
        resident_name: row.resident_name,
        email: row.email,
        phone: row.phone,
        flat_no: row.flat_no,
        wing: row.wing,
        read_at: row.read_at,
        acknowledged_at: row.acknowledged_at,
        acknowledgement_text: row.acknowledgement_text,
        is_read: Boolean(row.read_at),
        is_acknowledged: Boolean(row.acknowledged_at)
      }))
    });
  } catch (error) {
    console.error('Rule acknowledgement report error:', error);
    res.status(500).json({ message: 'Server error', detail: error.message });
  }
};

const sendRuleReminders = async (req, res) => {
  try {
    const ruleId = req.params.id;
    const [rules] = await promisePool.query("SELECT id, title FROM society_rules WHERE id = $1 AND status = 'published'", [ruleId]);
    if (!rules.length) return res.status(404).json({ message: 'Published rule not found' });

    const [result] = await promisePool.query(
      `INSERT INTO notifications (resident_id, title, message, type, reference_id, is_read, society_id)
       SELECT u.id, $1, $2, 'rule_reminder', $3, false, u.society_id
       FROM users u
       LEFT JOIN society_rule_acknowledgements ack
         ON ack.rule_id = $3 AND ack.resident_id = u.id
       WHERE u.role = 'resident'
         AND u.status = 'approved'
         AND ack.acknowledged_at IS NULL`,
      [
        'Rule acknowledgement reminder',
        `Please read and acknowledge: ${rules[0].title}`,
        ruleId
      ]
    );

    res.json({ message: 'Reminders sent successfully', count: result.affectedRows || 0 });
  } catch (error) {
    console.error('Send rule reminders error:', error);
    res.status(500).json({ message: 'Server error', detail: error.message });
  }
};

const notifyResidents = async (ruleId, title, message) => {
  try {
    await promisePool.query(
      `INSERT INTO notifications (resident_id, title, message, type, reference_id, is_read, society_id)
       SELECT id, $1, $2, 'rule', $3, false, society_id
       FROM users
       WHERE role = 'resident' AND status = 'approved'`,
      [String(title || 'Society rule'), message, ruleId]
    );
  } catch (error) {
    console.error('Rule notification creation failed:', ruleId, error);
  }
};

module.exports = {
  initializeRuleSchema: ensureSchema,
  getRules,
  getRuleById,
  getRuleCategories,
  createRule,
  updateRule,
  publishRule: setRuleStatus('published'),
  unpublishRule: setRuleStatus('draft'),
  archiveRule: setRuleStatus('archived'),
  markRuleRead,
  acknowledgeRule,
  getAcknowledgementReport,
  sendRuleReminders
};
