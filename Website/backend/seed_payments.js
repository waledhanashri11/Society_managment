const { promisePool } = require('./config/database');

const base64Sample = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAGQAAABkCAIAAAD/gAIDAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAAExJREFUeNrs0QENAAAAwqD3T20ON6hAYcCAAQMCBgwIEDAgQMCAAAEDBgQIGBAgYECAgAEBAgYECBgQIGBAgIABAf6DAB4ECBgQIEAAAgwAHW0Cc9gY27gAAAAASUVORK5CYII='; // Red 100x100 PNG

async function seed() {
  try {
    // 1. Get flat and user
    const [users] = await promisePool.query('SELECT * FROM users LIMIT 3');
    const [flats] = await promisePool.query('SELECT * FROM flats LIMIT 3');

    if (users.length === 0 || flats.length === 0) {
      console.log('Cannot seed: need users and flats in the DB');
      process.exit();
    }

    console.log('Clearing existing maintenance and payments...');
    await promisePool.query('DELETE FROM ledger_transactions');
    await promisePool.query('DELETE FROM payment_maintenance');
    await promisePool.query('DELETE FROM payments');
    await promisePool.query('DELETE FROM maintenance');

    console.log('Seeding maintenance bills...');
    // Create maintenance bill for resident 1
    const [m1] = await promisePool.query(`
      INSERT INTO maintenance (resident_id, flat_id, title, month, year, amount, penalty, discount_amount, total_amount, paid_amount, remaining_amount, status, due_date)
      VALUES (?, ?, 'Maintenance July 2026', 7, 2026, 1200.00, 0.00, 0.00, 1200.00, 0.00, 1200.00, 'Pending', '2026-07-31')
    `, [users[0].id, flats[0].id]);
    const billId1 = m1.insertId;

    // Create maintenance bill for resident 2
    const [m2] = await promisePool.query(`
      INSERT INTO maintenance (resident_id, flat_id, title, month, year, amount, penalty, discount_amount, total_amount, paid_amount, remaining_amount, status, due_date)
      VALUES (?, ?, 'Maintenance July 2026', 7, 2026, 1500.00, 50.00, 0.00, 1550.00, 1550.00, 0.00, 'Paid', '2026-07-31')
    `, [users[1].id, flats[1].id]);
    const billId2 = m2.insertId;

    // Create maintenance bill for resident 3
    const [m3] = await promisePool.query(`
      INSERT INTO maintenance (resident_id, flat_id, title, month, year, amount, penalty, discount_amount, total_amount, paid_amount, remaining_amount, status, due_date)
      VALUES (?, ?, 'Maintenance June 2026', 6, 2026, 1000.00, 100.00, 50.00, 1050.00, 0.00, 1050.00, 'Pending', '2026-06-30')
    `, [users[2].id, flats[2].id]);
    const billId3 = m3.insertId;

    console.log('Seeding payments...');
    // Payment 1: Pending Verification
    const [p1] = await promisePool.query(`
      INSERT INTO payments (bill_id, resident_id, payment_method, transaction_id, amount, payment_status, paid_at, payment_proof, remarks, created_at)
      VALUES (?, ?, 'UPI', 'TXN1000001', 1200.00, 'Pending Verification', '2026-07-28 10:00:00', ?, 'Paid via PhonePe', '2026-07-28 10:05:00')
    `, [billId1, users[0].id, base64Sample]);
    await promisePool.query('INSERT INTO payment_maintenance (payment_id, maintenance_id) VALUES (?, ?)', [p1.insertId, billId1]);

    // Payment 2: Approved
    const [p2] = await promisePool.query(`
      INSERT INTO payments (bill_id, resident_id, payment_method, transaction_id, amount, payment_status, paid_at, payment_proof, verified_by, verified_at, remarks, created_at)
      VALUES (?, ?, 'NetBanking', 'TXN1000002', 1550.00, 'Approved', '2026-07-25 15:30:00', ?, ?, '2026-07-26 09:00:00', 'Approved by admin', '2026-07-25 15:35:00')
    `, [billId2, users[1].id, base64Sample, users[0].id]); // Verified by admin
    await promisePool.query('INSERT INTO payment_maintenance (payment_id, maintenance_id) VALUES (?, ?)', [p2.insertId, billId2]);

    // Payment 3: Rejected
    const [p3] = await promisePool.query(`
      INSERT INTO payments (bill_id, resident_id, payment_method, transaction_id, amount, payment_status, paid_at, payment_proof, rejected_by, rejected_at, remarks, rejection_reason, created_at)
      VALUES (?, ?, 'Cash', 'TXN1000003', 1050.00, 'Rejected', '2026-07-20 12:00:00', ?, ?, '2026-07-21 14:00:00', 'Admin reject', 'Incorrect amount paid', '2026-07-20 12:10:00')
    `, [billId3, users[2].id, base64Sample, users[0].id]); // Rejected by admin
    await promisePool.query('INSERT INTO payment_maintenance (payment_id, maintenance_id) VALUES (?, ?)', [p3.insertId, billId3]);

    console.log('Seeded database successfully with 3 bills and 3 payments (Pending, Approved, Rejected).');
  } catch (err) {
    console.error(err);
  }
  process.exit();
}

seed();
