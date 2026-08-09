const assert = require('assert');
const { pool } = require('../config/database');

(async () => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query("SELECT set_config('app.tenant_bypass', 'on', true)");
    const societies = await client.query("SELECT id, code FROM societies WHERE code IN ('MHLX','VIGH') ORDER BY id");
    assert.strictEqual(societies.rowCount, 2, 'Both initial societies must exist');

    const mahalaxmi = societies.rows.find((row) => row.code === 'MHLX');
    const vighnaharta = societies.rows.find((row) => row.code === 'VIGH');
    const existingUser = await client.query('SELECT id FROM users WHERE society_id = $1 ORDER BY id LIMIT 1', [mahalaxmi.id]);

    await client.query('SET ROLE society_tenant_app');
    await client.query("SELECT set_config('app.tenant_bypass', 'off', true)");
    await client.query("SELECT set_config('app.current_society_id', $1, true)", [String(vighnaharta.id)]);
    if (existingUser.rowCount) {
      const leaked = await client.query('SELECT id FROM users WHERE id = $1', [existingUser.rows[0].id]);
      assert.strictEqual(leaked.rowCount, 0, 'Vighnaharta context must not read a Mahalaxmi user by ID');
    }

    const visibleVighnahartaRows = await client.query('SELECT id FROM users');
    assert(visibleVighnahartaRows.rows.every((row) => row.id !== existingUser.rows[0]?.id), 'Tenant list leaked a foreign user');

    await client.query("SELECT set_config('app.current_society_id', $1, true)", [String(mahalaxmi.id)]);
    if (existingUser.rowCount) {
      const visible = await client.query('SELECT id FROM users WHERE id = $1', [existingUser.rows[0].id]);
      assert.strictEqual(visible.rowCount, 1, 'Mahalaxmi context must read its own user');
    }

    await client.query('RESET ROLE');
    await client.query('ROLLBACK');
    console.log('Tenant isolation database test passed.');
  } catch (error) {
    await client.query('RESET ROLE').catch(() => {});
    await client.query('ROLLBACK');
    console.error(error);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
})();
