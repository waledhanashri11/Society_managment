const { promisePool } = require('./config/database');

async function check() {
  try {
    const [rows] = await promisePool.query('SELECT * FROM flat_types');
    console.log("SEEDED FLAT TYPES IN DB:");
    console.log(rows);
    process.exit(0);
  } catch (err) {
    console.error("DB check failed:", err);
    process.exit(1);
  }
}

check();
