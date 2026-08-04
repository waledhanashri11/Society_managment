const { pool } = require('../database/client');

(async () => {
  const bills = await pool.query(`
    SELECT m.id AS bill_id, u.id AS resident_id, u.name, f.flat_no,
           m.month, m.year, m.amount, m.original_amount, m.penalty_amount,
           m.total_amount, m.write_off_amount, m.maintenance_write_off_amount,
           m.penalty_write_off_amount, m.remaining_amount, m.status, m.write_off_status
    FROM maintenance m
    JOIN users u ON u.id = m.resident_id
    JOIN flats f ON f.id = m.flat_id
    WHERE LOWER(u.name) LIKE '%prasad%' AND f.flat_no = '103'
      AND m.month = 8 AND m.year = 2026
    ORDER BY m.id
  `);
  const billIds = bills.rows.map((row) => row.bill_id);
  const writeoffs = billIds.length === 0 ? { rows: [] } : await pool.query(`
    SELECT id, bill_id, resident_id, flat_id, admin_id, admin_name,
           writeoff_type, amount, reason, remarks, created_at
    FROM maintenance_writeoffs
    WHERE bill_id = ANY($1::int[])
    ORDER BY created_at
  `, [billIds]);
  console.log(JSON.stringify({ bills: bills.rows, writeoffs: writeoffs.rows }, null, 2));
})().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
}).finally(() => pool.end());
