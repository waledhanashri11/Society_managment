const { promisePool } = require('./config/database');

async function test() {
  try {
    const [rows] = await promisePool.query('SELECT id, payment_status, payment_proof IS NOT NULL AS "hasProof", SUBSTRING(payment_proof, 1, 50) AS "proofPrefix", screenshot_url AS "screenshotUrl" FROM payments');
    console.log('Payments in database:', JSON.stringify(rows, null, 2));
  } catch (err) {
    console.error(err);
  }
  process.exit();
}
test();
