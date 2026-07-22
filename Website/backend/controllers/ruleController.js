const { promisePool } = require('../config/database');

const VALID_PRIORITIES = new Set(['low', 'normal', 'high', 'urgent']);
const VALID_STATUSES = new Set(['draft', 'published', 'archived']);
const ACK_TEXT = 'I have read and understood this rule';

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

const isAdmin = (req) => req.user?.role === 'admin';

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
    params.push(`%${search.toLowerCase()}%`);
    where.push('(LOWER(r.title) LIKE ? OR LOWER(r.description) LIKE ? OR LOWER(r.category) LIKE ?)');
    params.push(`%${search.toLowerCase()}%`, `%${search.toLowerCase()}%`);
  }
  if (category) {
    where.push('LOWER(r.category) = LOWER(?)');
    params.push(category);
  }
  if (priority) {
    where.push('r.priority = ?');
    params.push(priority.toLowerCase());
  }
  if (status && isAdmin(req)) {
    where.push('r.status = ?');
    params.push(status.toLowerCase());
  }
};

const getRules = async (req, res) => {
  try {
    const params = [];
    const where = [];

    if (!isAdmin(req)) {
      where.push("r.status = 'published'");
    }

    buildRuleFilters(req, params, where);

    const joinAcknowledgement = isAdmin(req)
      ? ''
      : 'LEFT JOIN society_rule_acknowledgements my_ack ON my_ack.rule_id = r.id AND my_ack.resident_id = ?';
    if (!isAdmin(req)) params.unshift(req.user.id);

    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const [rules] = await promisePool.query(
      `SELECT r.*, u.name AS created_by_name,
              ${isAdmin(req) ? 'NULL' : 'my_ack.read_at'} AS read_at,
              ${isAdmin(req) ? 'NULL' : 'my_ack.acknowledged_at'} AS acknowledged_at,
              ${isAdmin(req) ? 'NULL' : 'my_ack.acknowledgement_text'} AS acknowledgement_text,
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
    res.status(500).json({ message: 'Server error' });
  }
};

const getRuleById = async (req, res) => {
  try {
    const params = [req.params.id];
    const residentJoin = isAdmin(req)
      ? ''
      : 'LEFT JOIN society_rule_acknowledgements my_ack ON my_ack.rule_id = r.id AND my_ack.resident_id = ?';
    if (!isAdmin(req)) params.push(req.user.id);

    const [rules] = await promisePool.query(
      `SELECT r.*, u.name AS created_by_name,
              ${isAdmin(req) ? 'NULL' : 'my_ack.read_at'} AS read_at,
              ${isAdmin(req) ? 'NULL' : 'my_ack.acknowledged_at'} AS acknowledged_at,
              ${isAdmin(req) ? 'NULL' : 'my_ack.acknowledgement_text'} AS acknowledgement_text,
              (SELECT COUNT(*) FROM users residents WHERE residents.role = 'resident' AND residents.status = 'approved') AS total_residents,
              (SELECT COUNT(*) FROM society_rule_acknowledgements ack WHERE ack.rule_id = r.id AND ack.acknowledged_at IS NOT NULL) AS acknowledged_count
       FROM society_rules r
       LEFT JOIN users u ON u.id = r.created_by
       ${residentJoin}
       WHERE r.id = ?
       ${isAdmin(req) ? '' : "AND r.status = 'published'"}`,
      params.reverse()
    );

    if (!rules.length) return res.status(404).json({ message: 'Rule not found' });
    res.json(mapRule(rules[0]));
  } catch (error) {
    console.error('Get rule error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const getRuleCategories = async (req, res) => {
  try {
    const [rows] = await promisePool.query(
      `SELECT DISTINCT category
       FROM society_rules
       WHERE category IS NOT NULL AND category <> ''
         ${isAdmin(req) ? '' : "AND status = 'published'"}
       ORDER BY category ASC`
    );
    res.json(rows.map((row) => row.category));
  } catch (error) {
    console.error('Get rule categories error:', error);
    res.status(500).json({ message: 'Server error' });
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
    const [result] = await promisePool.query(
      `INSERT INTO society_rules (title, description, category, priority, status, created_by, published_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        String(title).trim(),
        String(description).trim(),
        String(category || 'General').trim() || 'General',
        normalizePriority(req.body.priority),
        status,
        req.user.id,
        publishedAt
      ]
    );

    const ruleId = result.insertId;
    if (status === 'published') {
      await notifyResidents(ruleId, title, 'New society rule published');
    }

    res.status(201).json({ id: ruleId, message: 'Rule created successfully' });
  } catch (error) {
    console.error('Create rule error:', error);
    res.status(500).json({ message: 'Server error' });
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
       SET title = ?, description = ?, category = ?, priority = ?
       WHERE id = ? AND status <> 'archived'`,
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
    res.status(500).json({ message: 'Server error' });
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
      `UPDATE society_rules SET ${fields} WHERE id = ?`,
      [req.params.id]
    );

    if (result.affectedRows === 0) return res.status(404).json({ message: 'Rule not found' });

    if (status === 'published') {
      const [rules] = await promisePool.query('SELECT title FROM society_rules WHERE id = ?', [req.params.id]);
      await notifyResidents(req.params.id, rules[0]?.title || 'Society rule', 'New society rule published');
    }

    res.json({ message: `Rule ${status === 'draft' ? 'unpublished' : status} successfully` });
  } catch (error) {
    console.error('Set rule status error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const markRuleRead = async (req, res) => {
  try {
    const ruleId = req.params.id;
    const [rules] = await promisePool.query("SELECT id FROM society_rules WHERE id = ? AND status = 'published'", [ruleId]);
    if (!rules.length) return res.status(404).json({ message: 'Rule not found' });

    await promisePool.query(
      `INSERT INTO society_rule_acknowledgements (rule_id, resident_id, read_at)
       VALUES (?, ?, NOW())
       ON CONFLICT (rule_id, resident_id)
       DO UPDATE SET read_at = COALESCE(society_rule_acknowledgements.read_at, EXCLUDED.read_at)`,
      [ruleId, req.user.id]
    );

    res.json({ message: 'Rule marked as read' });
  } catch (error) {
    console.error('Mark rule read error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const acknowledgeRule = async (req, res) => {
  try {
    const ruleId = req.params.id;
    const [rules] = await promisePool.query("SELECT id FROM society_rules WHERE id = ? AND status = 'published'", [ruleId]);
    if (!rules.length) return res.status(404).json({ message: 'Rule not found' });

    const [existing] = await promisePool.query(
      'SELECT acknowledged_at FROM society_rule_acknowledgements WHERE rule_id = ? AND resident_id = ?',
      [ruleId, req.user.id]
    );
    if (existing[0]?.acknowledged_at) {
      return res.status(409).json({ message: 'Rule already acknowledged' });
    }

    await promisePool.query(
      `INSERT INTO society_rule_acknowledgements (rule_id, resident_id, read_at, acknowledged_at, acknowledgement_text)
       VALUES (?, ?, NOW(), NOW(), ?)
       ON CONFLICT (rule_id, resident_id)
       DO UPDATE SET
         read_at = COALESCE(society_rule_acknowledgements.read_at, NOW()),
         acknowledged_at = COALESCE(society_rule_acknowledgements.acknowledged_at, NOW()),
         acknowledgement_text = COALESCE(society_rule_acknowledgements.acknowledgement_text, EXCLUDED.acknowledgement_text)`,
      [ruleId, req.user.id, ACK_TEXT]
    );

    res.json({ message: 'Rule acknowledged successfully' });
  } catch (error) {
    console.error('Acknowledge rule error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const getAcknowledgementReport = async (req, res) => {
  try {
    const ruleId = req.params.id;
    const [rules] = await promisePool.query('SELECT id, title FROM society_rules WHERE id = ?', [ruleId]);
    if (!rules.length) return res.status(404).json({ message: 'Rule not found' });

    const [rows] = await promisePool.query(
      `SELECT u.id AS resident_id, u.name AS resident_name, u.email, u.phone,
              f.flat_no, f.wing,
              ack.read_at, ack.acknowledged_at, ack.acknowledgement_text
       FROM users u
       LEFT JOIN flats f ON f.id = u.flat_id
       LEFT JOIN society_rule_acknowledgements ack
         ON ack.rule_id = ? AND ack.resident_id = u.id
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
    res.status(500).json({ message: 'Server error' });
  }
};

const sendRuleReminders = async (req, res) => {
  try {
    const ruleId = req.params.id;
    const [rules] = await promisePool.query("SELECT id, title FROM society_rules WHERE id = ? AND status = 'published'", [ruleId]);
    if (!rules.length) return res.status(404).json({ message: 'Published rule not found' });

    const [result] = await promisePool.query(
      `INSERT INTO notifications (resident_id, title, message, type, reference_id, is_read)
       SELECT u.id, ?, ?, 'rule_reminder', ?, false
       FROM users u
       LEFT JOIN society_rule_acknowledgements ack
         ON ack.rule_id = ? AND ack.resident_id = u.id
       WHERE u.role = 'resident'
         AND u.status = 'approved'
         AND ack.acknowledged_at IS NULL`,
      [
        'Rule acknowledgement reminder',
        `Please read and acknowledge: ${rules[0].title}`,
        ruleId,
        ruleId
      ]
    );

    res.json({ message: 'Reminders sent successfully', count: result.affectedRows || 0 });
  } catch (error) {
    console.error('Send rule reminders error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const notifyResidents = async (ruleId, title, message) => {
  try {
    await promisePool.query(
      `INSERT INTO notifications (resident_id, title, message, type, reference_id, is_read)
       SELECT id, ?, ?, 'rule', ?, false
       FROM users
       WHERE role = 'resident' AND status = 'approved'`,
      [String(title || 'Society rule'), message, ruleId]
    );
  } catch (error) {
    console.error('Rule notification creation failed:', ruleId, error);
  }
};

module.exports = {
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
