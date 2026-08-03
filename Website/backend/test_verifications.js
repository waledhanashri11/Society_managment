const { promisePool } = require('./database/client');

async function run() {
  try {
    const [rows] = await promisePool.query(`
      SELECT 
          m.id AS billId, m.title, m.month AS billingMonth, m.year AS billingYear, m.total_amount AS billAmount, m.paid_amount AS paidAmount, m.remaining_amount AS remainingAmount, m.status AS billStatus, m.due_date AS dueDate,
          p.id AS submissionId, p.amount AS submittedAmount, p.transaction_id AS transactionReference, p.paid_at AS paymentDate,
          CASE 
            WHEN p.payment_status IN ('PENDING_REVIEW', 'Pending Verification', 'Pending', 'Under Review') THEN 'PENDING_REVIEW'
            WHEN p.payment_status IN ('NEEDS_CLARIFICATION', 'Needs Clarification') THEN 'NEEDS_CLARIFICATION'
            WHEN p.payment_status IN ('APPROVED', 'Approved', 'Paid', 'Verified') THEN 'APPROVED'
            WHEN p.payment_status IN ('REJECTED', 'Rejected', 'Declined') THEN 'REJECTED'
            WHEN p.id IS NOT NULL THEN 'PENDING_REVIEW'
            ELSE 'NO_SUBMISSION'
          END AS verificationStatus,
          p.remarks AS adminNote, p.created_at AS submittedAt,
          CASE WHEN p.payment_proof IS NOT NULL OR p.screenshot_url IS NOT NULL THEN 1 ELSE 0 END AS has_screenshot,
          u.id AS residentId, u.name AS residentName, f.flat_no AS flatNumber
      FROM maintenance m
      LEFT JOIN (
          SELECT p.*, COALESCE(pm.maintenance_id, p.bill_id) AS linked_bill_id
          FROM payments p
          LEFT JOIN payment_maintenance pm ON p.id = pm.payment_id
          WHERE p.id IN (
              SELECT MAX(p2.id)
              FROM payments p2
              LEFT JOIN payment_maintenance pm2 ON p2.id = pm2.payment_id
              GROUP BY COALESCE(pm2.maintenance_id, p2.bill_id)
          )
      ) p ON p.linked_bill_id = m.id
      LEFT JOIN users u ON m.resident_id = u.id
      LEFT JOIN flats f ON m.flat_id = f.id
      ORDER BY COALESCE(p.created_at, m.created_at) DESC
      LIMIT 5 OFFSET 0
    `);
    console.log(JSON.stringify(rows, null, 2));
  } catch (error) {
    console.error(error);
  }
  process.exit();
}

run();
