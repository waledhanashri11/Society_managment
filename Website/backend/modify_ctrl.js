const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, 'controllers/maintenanceController.js');
let code = fs.readFileSync(file, 'utf8');

const newMethod = `
const getPaymentVerifications = async (req, res) => {
  try {
    const { page = 1, limit = 50, filter } = req.query;
    const offset = (Math.max(1, Number(page)) - 1) * Number(limit);
    
    let query = \`
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
          p.paid_at AS "paymentDate",
          CASE 
            WHEN p.payment_status IN ('PENDING_REVIEW', 'Pending Verification', 'Pending', 'Under Review') THEN 'PENDING_REVIEW'
            WHEN p.payment_status IN ('NEEDS_CLARIFICATION', 'Needs Clarification') THEN 'NEEDS_CLARIFICATION'
            WHEN p.payment_status IN ('APPROVED', 'Approved', 'Paid', 'Verified') THEN 'APPROVED'
            WHEN p.payment_status IN ('REJECTED', 'Rejected', 'Declined') THEN 'REJECTED'
            WHEN p.id IS NOT NULL THEN 'PENDING_REVIEW'
            ELSE 'NO_SUBMISSION'
          END AS "verificationStatus",
          p.remarks AS "adminNote",
          p.resident_note AS "residentNote",
          p.created_at AS "submittedAt",
          CASE WHEN p.payment_proof IS NOT NULL OR p.screenshot_url IS NOT NULL THEN 1 ELSE 0 END AS has_screenshot,
          u.id AS "residentId",
          u.name AS "residentName",
          f.flat_no AS "flatNumber"
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
      WHERE 1=1
    \`;
    
    // Additional filter conditions can be added here if backend-side filtering is required.
    // For now, returning all for the frontend to filter or we can apply it here.
    
    query += \` ORDER BY COALESCE(p.created_at, m.created_at) DESC LIMIT ? OFFSET ?\`;
    
    const [rows] = await promisePool.query(query, [Number(limit), offset]);
    
    const forwardedProto = String(req?.headers?.['x-forwarded-proto'] || '').split(',')[0].trim();
    const protocol = forwardedProto || req?.protocol || 'https';
    const host = req?.get?.('host') || req?.headers?.host;
    const baseUrl = host ? \`\${protocol}://\${host}\` : '';
    
    const items = rows.map(row => ({
      billId: row.billId || row.billid,
      title: row.title,
      billingMonth: row.billingMonth || row.billingmonth,
      billingYear: row.billingYear || row.billingyear,
      billAmount: row.billAmount || row.billamount,
      paidAmount: row.paidAmount || row.paidamount,
      remainingAmount: row.remainingAmount || row.remainingamount,
      billStatus: row.billStatus || row.billstatus,
      dueDate: row.dueDate || row.duedate,
      submissionId: row.submissionId || row.submissionid,
      submittedAmount: row.submittedAmount || row.submittedamount,
      transactionReference: row.transactionReference || row.transactionreference,
      paymentDate: row.paymentDate || row.paymentdate,
      verificationStatus: row.verificationStatus || row.verificationstatus,
      adminNote: row.adminNote || row.adminnote,
      residentNote: row.residentNote || row.residentnote,
      submittedAt: row.submittedAt || row.submittedat,
      residentId: row.residentId || row.residentid,
      residentName: row.residentName || row.residentname,
      flatNumber: row.flatNumber || row.flatnumber,
      screenshotUrl: (row.has_screenshot || row.has_screenshot === 1) ? \`\${baseUrl}/api/maintenance/payments/\${row.submissionId || row.submissionid}/screenshot\` : null,
    }));
    
    return sendResponse(res, 200, 'Payment verifications fetched', { items, page: Number(page), pageSize: Number(limit), total: rows.length });
  } catch (error) {
    console.error('Error fetching payment verifications:', error);
    return sendResponse(res, 500, 'Server error', null, [error.message]);
  }
};
`;

code = code.replace(/const getPaymentHistory = async \(req, res\) => \{/, newMethod + '\nconst getPaymentHistory = async (req, res) => {');
code = code.replace(/getPendingVerificationPayments,\n  getPaymentHistory,/, 'getPendingVerificationPayments,\n  getPaymentVerifications,\n  getPaymentHistory,');

fs.writeFileSync(file, code);
console.log('Done modifying maintenanceController.js');
