const bcrypt = require('bcryptjs');
const { pool } = require('../config/database');

const required = (name) => {
  const value = String(process.env[name] || '').trim();
  if (!value) throw new Error(`${name} is required`);
  return value;
};

const provision = async (client, societyCode, name, email, password) => {
  const societyResult = await client.query(
    `SELECT id, name, code FROM societies WHERE UPPER(code) = UPPER($1) AND status = 'active'`,
    [societyCode]
  );
  if (!societyResult.rowCount) throw new Error(`Active society ${societyCode} was not found`);
  const society = societyResult.rows[0];
  const passwordHash = await bcrypt.hash(password, 12);
  const existing = await client.query('SELECT id FROM users WHERE LOWER(email) = LOWER($1)', [email]);
  if (existing.rowCount) {
    await client.query(
      `UPDATE users SET name = $1, password = $2, role = 'admin', status = 'approved', society_id = $3
       WHERE id = $4`,
      [name, passwordHash, society.id, existing.rows[0].id]
    );
    console.log(`Updated ${society.code} admin: ${email}`);
  } else {
    await client.query(
      `INSERT INTO users (name, email, password, role, status, society_id)
       VALUES ($1, $2, $3, 'admin', 'approved', $4)`,
      [name, email, passwordHash, society.id]
    );
    console.log(`Created ${society.code} admin: ${email}`);
  }
};

(async () => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query("SELECT set_config('app.tenant_bypass', 'on', true)");
    await provision(
      client,
      'MHLX',
      process.env.MHLX_ADMIN_NAME || 'Mahalaxmi Admin',
      required('MHLX_ADMIN_EMAIL'),
      required('MHLX_ADMIN_PASSWORD')
    );
    await provision(
      client,
      'VIGH',
      process.env.VIGH_ADMIN_NAME || 'Vighnaharta Admin',
      required('VIGH_ADMIN_EMAIL'),
      required('VIGH_ADMIN_PASSWORD')
    );
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error(error.message);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
})();
