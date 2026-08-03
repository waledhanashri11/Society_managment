const { promisePool } = require('./config/database');

async function test() {
  try {
    let query = `
      SELECT 
          m.id AS "billId",
          m.title,
          m.month AS "billingMonth",
          m.year AS "billingYear",
          m.total_amount AS "billAmount",
          m.paid_amount AS "paidAmount",
          m.remaining_amount AS "remainingAmount",
          m.status AS "billStatus",
          m.due_date AS "dueDate",
          p.id AS "submissionId",
          p.amount AS "submittedAmount",
          p.transaction_id AS "transactionReference",
          p.payment_method AS "paymentMethod",
          p.paid_at AS "paymentDate",
          p.remarks AS "adminNote",
          p.resident_note AS "residentNote",
          p.created_at AS "submittedAt",
          CASE WHEN p.payment_proof IS NOT NULL OR p.screenshot_url IS NOT NULL THEN 1 ELSE 0 END AS has_screenshot,
          u.id AS "residentId",
          u.name AS "residentName",
          f.flat_no AS "flatNumber"
      FROM payments p
      LEFT JOIN payment_maintenance pm ON pm.payment_id = p.id
      LEFT JOIN maintenance m ON m.id = COALESCE(pm.maintenance_id, p.bill_id)
      LEFT JOIN users u ON u.id = COALESCE(m.resident_id, p.resident_id)
      LEFT JOIN flats f ON f.id = m.flat_id
      WHERE p.id IS NOT NULL
      ORDER BY p.created_at DESC
    `;
    const [rows] = await promisePool.query(query);
    const baseUrl = 'https://societymanagment-production-e0d3.up.railway.app';
    const items = rows.map(row => ({
      submissionId: row.submissionId,
      has_screenshot: row.has_screenshot,
      screenshotUrl: (row.has_screenshot === 1) ? `${baseUrl}/api/maintenance/payments/${row.submissionId}/screenshot` : null,
    }));
    console.log('Formatted items:', JSON.stringify(items, null, 2));
  } catch (err) {
    console.error(err);
  }
  process.exit();
}
test();
