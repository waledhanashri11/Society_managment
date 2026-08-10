const bcrypt = require('bcryptjs');
const { pool } = require('../config/database');

const value = (name, required = true) => {
  const result = String(process.env[name] || '').trim();
  if (required && !result) throw new Error(`${name} is required`);
  return result;
};

(async () => {
  const email = value('SUPER_ADMIN_EMAIL').toLowerCase();
  const password = value('SUPER_ADMIN_PASSWORD');
  const name = value('SUPER_ADMIN_NAME', false) || 'SocietyHub Super Admin';
  if (!/^\S+@\S+\.\S+$/.test(email)) throw new Error('SUPER_ADMIN_EMAIL must be a valid email address');
  if (password.length < 12) throw new Error('SUPER_ADMIN_PASSWORD must contain at least 12 characters');

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query("SELECT set_config('app.tenant_bypass', 'on', true)");
    const passwordHash = await bcrypt.hash(password, 12);
    const existing = await client.query("SELECT id FROM users WHERE role = 'super_admin' OR LOWER(email) = LOWER($1) FOR UPDATE", [email]);
    if (existing.rowCount > 1) throw new Error('Conflicting Super Admin/email accounts require manual review');
    if (existing.rowCount === 1) {
      await client.query(
        `UPDATE users SET name = $1, email = $2, password = $3, role = 'super_admin', status = 'approved', society_id = NULL
         WHERE id = $4`,
        [name, email, passwordHash, existing.rows[0].id]
      );
    } else {
      await client.query(
        `INSERT INTO users (name, email, password, role, status, society_id)
         VALUES ($1, $2, $3, 'super_admin', 'approved', NULL)`,
        [name, email, passwordHash]
      );
    }
    await client.query('COMMIT');
    console.log(`Super Admin provisioned securely for ${email}`);
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
})().catch((error) => {
  console.error(`Super Admin provisioning failed: ${error.message}`);
  process.exitCode = 1;
});
