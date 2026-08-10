const assert = require('assert');
const jwt = require('jsonwebtoken');

process.env.PORT = process.env.RESIDENT_MEMBERS_TEST_PORT || '5199';
const { startServer } = require('../Server');
const { pool } = require('../config/database');

const baseUrl = `http://127.0.0.1:${process.env.PORT}`;

(async () => {
  let server;
  try {
    const client = await pool.connect();
    let societies;
    let residents;
    try {
      await client.query("SELECT set_config('app.tenant_bypass', 'on', false)");
      societies = (await client.query(
        "SELECT id, code FROM societies WHERE code IN ('MHLX', 'VIGH') ORDER BY id"
      )).rows;
      residents = (await client.query(
        `SELECT id, email, role, society_id
         FROM users
         WHERE role = 'resident' AND COALESCE(status, 'approved') = 'approved'
           AND society_id = ANY($1::bigint[])
         ORDER BY society_id, id`,
        [societies.map((society) => society.id)]
      )).rows;
    } finally {
      client.release();
    }

    assert.strictEqual(societies.length, 2, 'MHLX and VIGH societies must exist');
    server = await startServer();

    const resultIdsBySociety = new Map();
    for (const society of societies) {
      const resident = residents.find((row) => Number(row.society_id) === Number(society.id));
      if (!resident) {
        console.log(`Skipping ${society.code} endpoint call: no approved resident account exists for this society.`);
        continue;
      }

      const token = jwt.sign(
        { id: resident.id, email: resident.email, role: resident.role, societyId: Number(society.id) },
        process.env.JWT_SECRET,
        { expiresIn: '5m' }
      );
      const response = await fetch(`${baseUrl}/api/resident/members`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const body = await response.json();
      assert.strictEqual(response.status, 200, body?.message || `${society.code} members endpoint failed`);
      assert(Array.isArray(body), `${society.code} members response must be an array`);

      const allowedIds = new Set(
        residents
          .filter((row) => Number(row.society_id) === Number(society.id))
          .map((row) => String(row.id))
      );
      assert(body.every((member) => allowedIds.has(String(member.id))), `${society.code} response leaked another tenant's member`);
      resultIdsBySociety.set(society.code, new Set(body.map((member) => String(member.id))));
    }

    const mahalaxmiIds = resultIdsBySociety.get('MHLX');
    const vighnahartaIds = resultIdsBySociety.get('VIGH');
    if (mahalaxmiIds && vighnahartaIds) {
      assert(
        [...mahalaxmiIds].every((id) => !vighnahartaIds.has(id)),
        'MHLX and VIGH member responses must not overlap'
      );
    }

    assert(resultIdsBySociety.size > 0, 'At least one approved resident account is required to test the members endpoint');
    console.log('Resident members endpoint and tenant isolation tests passed.');
  } catch (error) {
    console.error(error);
    process.exitCode = 1;
  } finally {
    if (server) await new Promise((resolve) => server.close(resolve));
    await pool.end();
  }
})();
