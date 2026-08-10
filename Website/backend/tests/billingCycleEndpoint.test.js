const assert = require('assert');
const jwt = require('jsonwebtoken');
const { formatBillingCycle, nextBillingCycle } = require('../utils/billingCycle');

process.env.PORT = process.env.BILLING_CYCLE_TEST_PORT || '5200';
const { startServer } = require('../Server');
const { pool } = require('../config/database');

const baseUrl = `http://127.0.0.1:${process.env.PORT}`;
const authorized = (token, options = {}) => ({
  ...options,
  headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, ...(options.headers || {}) }
});

const request = async (path, token, options = {}) => {
  const response = await fetch(`${baseUrl}${path}`, authorized(token, options));
  const body = await response.json();
  return { response, body };
};

(async () => {
  let server;
  try {
    const client = await pool.connect();
    let tenantRows;
    let cycleCountsBefore;
    let generatedPeriods;
    try {
      await client.query("SELECT set_config('app.tenant_bypass', 'on', false)");
      tenantRows = (await client.query(
        `SELECT s.id, s.code, u.id AS admin_id, u.email AS admin_email
         FROM societies s
         JOIN LATERAL (
           SELECT id, email FROM users
           WHERE society_id = s.id AND role = 'admin' AND status = 'approved'
           ORDER BY id LIMIT 1
         ) u ON TRUE
         WHERE s.code IN ('MHLX', 'VIGH')
         ORDER BY s.id`
      )).rows;
      cycleCountsBefore = (await client.query(
        `SELECT society_id, COUNT(*)::int AS count
         FROM maintenance_billing_cycles
         WHERE society_id = ANY($1::bigint[])
         GROUP BY society_id`,
        [tenantRows.map((row) => row.id)]
      )).rows;
      generatedPeriods = (await client.query(
        `SELECT society_id, billing_month, billing_year
         FROM maintenance_billing_cycles
         WHERE billing_status = 'GENERATED' AND society_id = ANY($1::bigint[])`,
        [tenantRows.map((row) => row.id)]
      )).rows;
    } finally {
      client.release();
    }

    assert.strictEqual(tenantRows.length, 2, 'Both societies need an approved admin for billing tests');
    server = await startServer();

    let validatedGeneratedSequences = 0;
    for (const tenant of tenantRows) {
      const token = jwt.sign(
        { id: tenant.admin_id, email: tenant.admin_email, role: 'admin', societyId: Number(tenant.id) },
        process.env.JWT_SECRET,
        { expiresIn: '5m' }
      );

      const nextResponse = await request('/api/maintenance/billing-cycles/next', token);
      assert.strictEqual(nextResponse.response.status, 200, `${tenant.code} next-cycle endpoint failed`);
      const nextData = nextResponse.body.data;
      assert(nextData?.nextMonth && nextData?.nextYear, `${tenant.code} did not return a next cycle`);

      if (nextData.lastGeneratedMonth && nextData.lastGeneratedYear) {
        validatedGeneratedSequences += 1;
        const duplicateLabel = formatBillingCycle(nextData.lastGeneratedMonth, nextData.lastGeneratedYear);
        const duplicate = await request('/api/maintenance/billing-cycles/generate', token, {
          method: 'POST',
          body: JSON.stringify({ month: nextData.lastGeneratedMonth, year: nextData.lastGeneratedYear })
        });
        assert.strictEqual(duplicate.response.status, 409);
        assert.strictEqual(duplicate.body.message, `Billing cycle for ${duplicateLabel} has already been generated.`);

        const generatedKeys = new Set(
          generatedPeriods
            .filter((row) => Number(row.society_id) === Number(tenant.id))
            .map((row) => `${row.billing_year}-${row.billing_month}`)
        );
        let older = nextBillingCycle(nextData.lastGeneratedMonth, nextData.lastGeneratedYear - 1);
        while (generatedKeys.has(`${older.year}-${older.month}`) && older.year > 2000) {
          older = { month: older.month, year: older.year - 1 };
        }
        const olderResponse = await request('/api/maintenance/billing-cycles/generate', token, {
          method: 'POST',
          body: JSON.stringify({ month: older.month, year: older.year })
        });
        assert.strictEqual(olderResponse.response.status, 409);
        assert.strictEqual(
          olderResponse.body.message,
          `Cannot generate ${formatBillingCycle(older.month, older.year)}. The latest generated billing cycle is ${duplicateLabel}. The next billing cycle must be ${formatBillingCycle(nextData.nextMonth, nextData.nextYear)}.`
        );

        const skipped = nextBillingCycle(nextData.nextMonth, nextData.nextYear);
        const skippedResponse = await request('/api/maintenance/billing-cycles/generate', token, {
          method: 'POST',
          body: JSON.stringify({ month: skipped.month, year: skipped.year })
        });
        assert.strictEqual(skippedResponse.response.status, 409);
        assert.strictEqual(
          skippedResponse.body.message,
          `Please generate ${formatBillingCycle(nextData.nextMonth, nextData.nextYear)} billing cycle first.`
        );
      }
    }

    const verifyClient = await pool.connect();
    try {
      await verifyClient.query("SELECT set_config('app.tenant_bypass', 'on', false)");
      const afterRows = (await verifyClient.query(
        `SELECT society_id, COUNT(*)::int AS count
         FROM maintenance_billing_cycles
         WHERE society_id = ANY($1::bigint[])
         GROUP BY society_id`,
        [tenantRows.map((row) => row.id)]
      )).rows;
      const countFor = (rows, societyId) => Number(rows.find((row) => Number(row.society_id) === Number(societyId))?.count || 0);
      for (const tenant of tenantRows) {
        assert.strictEqual(
          countFor(afterRows, tenant.id),
          countFor(cycleCountsBefore, tenant.id),
          `${tenant.code} rejection test unexpectedly mutated billing cycles`
        );
      }
    } finally {
      verifyClient.release();
    }

    console.log(`Billing cycle endpoint tests passed (${validatedGeneratedSequences} tenant(s) with generated history).`);
  } catch (error) {
    console.error(error);
    process.exitCode = 1;
  } finally {
    if (server) await new Promise((resolve) => server.close(resolve));
    await pool.end();
  }
})();
