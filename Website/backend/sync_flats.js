require('dotenv').config();
const { promisePool } = require('./config/database');

async function syncFlats() {
  try {
    console.log('Cleaning orphan flat assignments...');
    const [result] = await promisePool.query(`
      UPDATE flats
      SET current_resident_id = NULL, status = 'Available'
      WHERE current_resident_id IS NOT NULL
        AND current_resident_id NOT IN (SELECT id FROM users)
    `);
    console.log(`Orphan flats cleaned: ${result.affectedRows}`);

    const [flats] = await promisePool.query(`
      SELECT f.id, f.flat_no, f.wing, f.status, f.current_resident_id, u.name as resident_name, u.role
      FROM flats f
      LEFT JOIN users u ON f.current_resident_id = u.id
      ORDER BY f.id
    `);
    console.log('FLATS STATUS:', JSON.stringify(flats, null, 2));
  } catch (err) {
    console.error('Error syncing flats:', err);
  }
  process.exit(0);
}

syncFlats();
