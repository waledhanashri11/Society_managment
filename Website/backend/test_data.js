const { promisePool } = require('./config/database');

async function test() {
  try {
    const [dbInfo] = await promisePool.query("SELECT current_database(), current_user");
    console.log('DB Info:', dbInfo);
    
    const [count] = await promisePool.query("SELECT COUNT(*) FROM payments");
    console.log('Total payments count:', count);
    
    const [rows] = await promisePool.query("SELECT id, payment_status FROM payments WHERE id = 5");
    console.log('Payment 5 details:', rows);
  } catch (err) {
    console.error(err);
  }
  process.exit();
}
test();
