const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'Website', 'backend', 'controllers', 'maintenanceController.js');
let content = fs.readFileSync(filePath, 'utf8');

const oldFuncRegex = /const getPaymentVerifications = async \(req, res\) => \{[\s\S]*?(?=const downloadPaymentsCSV)/;

const newFunc = `const getPaymentVerifications = async (req, res) => {
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
            m.penalty_amount AS "penaltyAmount",
            m.paid_amount AS "paidAmount",
            m.remaining_amount AS "remainingAmount",
            m.status AS "billStatus",
            m.due_date AS "dueDate",
            p.id AS "submissionId",
            p.amount AS "submittedAmount",
            p.transaction_id AS "transactionReference",
            p.paid_at AS "paymentDate",
            p.payment_method AS "paymentMethod",
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
        FROM payments p
        LEFT JOIN payment_maintenance pm ON p.id = pm.payment_id
        LEFT JOIN maintenance m ON m.id = COALESCE(pm.maintenance_id, p.bill_id)
        LEFT JOIN users u ON m.resident_id = u.id
        LEFT JOIN flats f ON m.flat_id = f.id
        WHERE 1=1
      \`;
      
      // Order by Pending First, then newest payment date, then oldest
      query += \` ORDER BY CASE WHEN p.payment_status IN ('PENDING_REVIEW', 'Pending Verification', 'Pending', 'Under Review') THEN 0 ELSE 1 END ASC, p.paid_at DESC, p.created_at DESC LIMIT ? OFFSET ?\`;
      
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
        penaltyAmount: row.penaltyAmount || row.penaltyamount || 0,
        paidAmount: row.paidAmount || row.paidamount,
        remainingAmount: row.remainingAmount || row.remainingamount,
        billStatus: row.billStatus || row.billstatus,
        dueDate: row.dueDate || row.duedate,
        submissionId: row.submissionId || row.submissionid,
        submittedAmount: row.submittedAmount || row.submittedamount,
        transactionReference: row.transactionReference || row.transactionreference,
        paymentDate: row.paymentDate || row.paymentdate,
        paymentMethod: row.paymentMethod || row.paymentmethod || 'Unknown',
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
      return sendResponse(res, 500, 'Error fetching payment verifications', null, process.env.NODE_ENV === 'development' ? error.message : null);
    }
  };

`;

content = content.replace(oldFuncRegex, newFunc);
fs.writeFileSync(filePath, content);
console.log("Successfully updated getPaymentVerifications in maintenanceController.js");
