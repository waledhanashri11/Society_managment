const assert = require('assert');
const jwt = require('jsonwebtoken');

process.env.PORT = process.env.SUPER_ADMIN_TEST_PORT || '5198';
const { startServer } = require('../Server');
const { pool } = require('../config/database');

const baseUrl = `http://127.0.0.1:${process.env.PORT}`;
const request = async (path, options = {}) => {
  const response = await fetch(`${baseUrl}${path}`, options);
  let body = null;
  try { body = await response.json(); } catch (_) {}
  return { response, body };
};
const authorized = (token, options = {}) => ({
  ...options,
  headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, ...(options.headers || {}) }
});

(async () => {
  let server;
  let originalVighStatus;
  let superToken;
  try {
    const email = String(process.env.SUPER_ADMIN_EMAIL || '').trim().toLowerCase();
    const password = String(process.env.SUPER_ADMIN_PASSWORD || '');
    assert(email && password, 'Super Admin environment configuration is required');

    const client = await pool.connect();
    try {
      await client.query("SELECT set_config('app.tenant_bypass', 'on', false)");
      const record = await client.query(
        'SELECT name, email, role, society_id, status, password FROM users WHERE LOWER(email) = LOWER($1)',
        [email]
      );
      assert.strictEqual(record.rowCount, 1, 'Exactly one designated Super Admin must exist');
      assert.strictEqual(record.rows[0].name, process.env.SUPER_ADMIN_NAME);
      assert.strictEqual(record.rows[0].role, 'super_admin');
      assert.strictEqual(record.rows[0].society_id, null);
      assert.strictEqual(record.rows[0].status, 'approved');
      assert(/^\$2[aby]\$/.test(record.rows[0].password), 'Password must be stored as a bcrypt hash');
    } finally {
      client.release();
    }

    server = await startServer();
    const login = await request('/api/auth/login', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password })
    });
    assert.strictEqual(login.response.status, 200, login.body?.message || 'Super Admin login failed');
    assert(login.body?.token, 'Login must return a JWT');
    assert.strictEqual(login.body.user?.role, 'super_admin');
    assert.strictEqual(login.body.user?.society_id, null);
    assert.strictEqual(login.body.society, null);
    assert.strictEqual(Object.prototype.hasOwnProperty.call(login.body.user, 'password'), false);
    superToken = login.body.token;

    const claims = jwt.verify(superToken, process.env.JWT_SECRET);
    assert.strictEqual(claims.role, 'super_admin');
    assert.strictEqual(claims.societyId, null);

    const dashboard = await request('/api/super-admin/dashboard', authorized(superToken));
    assert.strictEqual(dashboard.response.status, 200);
    for (const key of ['total_societies', 'active_societies', 'inactive_societies', 'total_residents', 'total_flats']) {
      assert(Number.isInteger(dashboard.body[key]), `Dashboard field ${key} must be a real integer`);
    }

    const list = await request('/api/super-admin/societies', authorized(superToken));
    assert.strictEqual(list.response.status, 200);
    const mahalaxmi = list.body.find((society) => society.code === 'MHLX');
    const vighnaharta = list.body.find((society) => society.code === 'VIGH');
    assert(mahalaxmi && vighnaharta, 'Both initial societies must be returned from the database');
    assert.notStrictEqual(String(mahalaxmi.id), String(vighnaharta.id), 'Initial societies must have separate IDs');

    for (const society of [mahalaxmi, vighnaharta]) {
      const details = await request(`/api/super-admin/societies/${society.id}`, authorized(superToken));
      assert.strictEqual(details.response.status, 200);
      assert.strictEqual(details.body.code, society.code);
      assert.strictEqual(String(details.body.id), String(society.id));
    }

    originalVighStatus = vighnaharta.status;
    const temporaryStatus = originalVighStatus === 'active' ? 'inactive' : 'active';
    const toggle = await request(`/api/super-admin/societies/${vighnaharta.id}/status`, authorized(superToken, {
      method: 'PATCH', body: JSON.stringify({ status: temporaryStatus })
    }));
    assert.strictEqual(toggle.response.status, 200);
    const restore = await request(`/api/super-admin/societies/${vighnaharta.id}/status`, authorized(superToken, {
      method: 'PATCH', body: JSON.stringify({ status: originalVighStatus })
    }));
    assert.strictEqual(restore.response.status, 200, 'Original society status must be restored');
    originalVighStatus = null;

    const authClient = await pool.connect();
    try {
      await authClient.query("SELECT set_config('app.tenant_bypass', 'on', false)");
      for (const role of ['admin', 'resident']) {
        const user = await authClient.query(
          'SELECT id, email, role, society_id FROM users WHERE role = $1 AND society_id IS NOT NULL ORDER BY id LIMIT 1',
          [role]
        );
        assert.strictEqual(user.rowCount, 1, `A real ${role} account is required for authorization verification`);
        const row = user.rows[0];
        const token = jwt.sign({ id: row.id, email: row.email, role: row.role, societyId: Number(row.society_id) }, process.env.JWT_SECRET, { expiresIn: '5m' });
        const denied = await request('/api/super-admin/dashboard', authorized(token));
        assert.strictEqual(denied.response.status, 403, `${role} must be denied Super Admin APIs`);
      }
    } finally {
      authClient.release();
    }

    console.log('Super Admin end-to-end backend flow passed.');
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  } finally {
    if (originalVighStatus && superToken) {
      const list = await request('/api/super-admin/societies', authorized(superToken)).catch(() => null);
      const vigh = list?.body?.find((society) => society.code === 'VIGH');
      if (vigh) await request(`/api/super-admin/societies/${vigh.id}/status`, authorized(superToken, { method: 'PATCH', body: JSON.stringify({ status: originalVighStatus }) })).catch(() => {});
    }
    if (server) await new Promise((resolve) => server.close(resolve));
    await pool.end();
  }
})();
