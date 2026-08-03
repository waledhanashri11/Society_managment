const { promisePool } = require('./database/client');

async function test() {
  try {
    const [columns] = await promisePool.query('SHOW COLUMNS FROM users');
    console.log('users table columns:', columns);
  } catch (err) {
    console.error('Error:', err);
  } finally {
    process.exit(0);
  }
}

test();
