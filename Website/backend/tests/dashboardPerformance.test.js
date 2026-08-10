const assert = require('assert');
const jwt = require('jsonwebtoken');

process.env.PORT = process.env.DASHBOARD_PERF_TEST_PORT || '5201';

const { pool } = require('../database/client');
const { startServer } = require('../Server');

const request = async (token, path) => {
  const startedAt = performance.now();
  const response = await fetch(`http://127.0.0.1:${process.env.PORT}${path}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  const text = await response.text();
  return {
    status: response.status,
    body: JSON.parse(text),
    bytes: Buffer.byteLength(text),
    elapsedMs: Math.round(performance.now() - startedAt),
    serverTiming: response.headers.get('server-timing')
  };
};

(async () => {
  let server;
  try {
    server = await startServer();
    const records = await pool.query(
      `SELECT DISTINCT ON (s.code, u.role)
              u.id, u.role, u.society_id, s.code, s.name AS society_name
       FROM users u JOIN societies s ON s.id = u.society_id
       WHERE u.status = 'approved'
         AND u.role IN ('admin', 'resident')
         AND s.code IN ('MHLX', 'VIGH')
       ORDER BY s.code, u.role, u.id`
    );
    assert(records.rows.length >= 2, 'Representative tenant accounts are required');

    const results = [];
    for (const user of records.rows) {
      const token = jwt.sign(
        { id: user.id, role: user.role, societyId: user.society_id },
        process.env.JWT_SECRET,
        { expiresIn: '5m' }
      );
      const path = user.role === 'admin' ? '/api/admin/dashboard' : '/api/resident/dashboard';
      const result = await request(token, path);
      assert.strictEqual(result.status, 200, `${user.code} ${user.role} dashboard failed`);
      if (user.role === 'resident') {
        assert.strictEqual(result.body.user?.society_name, user.society_name, 'Resident tenant identity leaked');
      }
      assert(result.elapsedMs < 5000, `${user.code} ${user.role} dashboard exceeded 5 seconds`);
      results.push({ code: user.code, role: user.role, ...result, body: undefined });
    }
    console.table(results);
    console.log('Dashboard performance and tenant identity test passed.');
  } finally {
    if (server) await new Promise((resolve) => server.close(resolve));
    await pool.end();
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
