const { promisePool } = require('../config/database');
const crypto = require('crypto');

const unwrap = (rows) => rows || [];

const sendResponse = (res, statusCode, message, data = null) => {
  const payload = { success: statusCode < 400, message };
  if (data !== null) payload.data = data;
  return res.status(statusCode).json(payload);
};

const escapeHtml = (value = '') => String(value)
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#039;');

const fullDate = (value) => value
  ? new Date(value).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })
  : '';

const shortDate = (value) => value
  ? new Date(value).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
  : '';

const createNotification = async (residentId, title, message, type, referenceId) => {
  try {
    await promisePool.query(
      `INSERT INTO notifications (resident_id, title, message, type, reference_id, is_read, created_at)
       VALUES (?, ?, ?, ?, ?, false, NOW())`,
      [residentId, title, message, type, referenceId]
    );
  } catch (error) {
    console.error('NOC notification creation failed:', error);
  }
};

const logAction = async (requestId, action, actorId, remarks = '') => {
  try {
    await promisePool.query(
      `INSERT INTO noc_audit_logs (noc_request_id, action, actor_id, remarks)
       VALUES (?, ?, ?, ?)`,
      [requestId, action, actorId || null, remarks || null]
    );
  } catch (error) {
    console.error('NOC audit log failed:', error);
  }
};

const generateRequestNumber = async () => {
  const year = new Date().getFullYear();
  const prefix = `NOC-${year}-`;
  const [rows] = await promisePool.query(
    'SELECT request_number FROM noc_requests WHERE request_number LIKE ? ORDER BY id DESC LIMIT 1',
    [`${prefix}%`]
  );
  let next = 1;
  if (rows.length && rows[0].request_number) {
    const parts = rows[0].request_number.split('-');
    const num = parseInt(parts[parts.length - 1], 10);
    if (!isNaN(num)) next = num + 1;
  }
  return `${prefix}${String(next).padStart(4, '0')}`;
};

const normalizeOrigin = (value) => {
  if (!value) return '';
  return String(value).trim().replace(/[\r\n\s]+/g, '').replace(/\/api\/?$/, '').replace(/\/$/, '');
};

const getPublicFrontendOrigin = (req) => {
  const configured = normalizeOrigin(process.env.FRONTEND_URL || process.env.PUBLIC_FRONTEND_URL);
  if (!configured) {
    const host = req?.get?.('host') || 'localhost:3000';
    return `http://${host}`;
  }
  return configured;
};

const createShortShareToken = async () => {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const token = crypto.randomBytes(18).toString('base64url');
    const [existing] = await promisePool.query(
      'SELECT id FROM noc_requests WHERE share_token = ? LIMIT 1',
      [token]
    );
    if (existing.length === 0) return token;
  }
  return crypto.randomBytes(24).toString('base64url');
};

const getResidentFlat = async (residentId) => {
  const [rows] = await promisePool.query(
    `SELECT u.id, u.name, u.email, u.phone, u.status AS resident_status, u.flat_id,
            f.id AS flat_id, f.flat_no, f.wing, f.floor_no, f.status AS flat_status
     FROM users u
     LEFT JOIN flats f ON u.flat_id = f.id
     WHERE u.id = ? AND u.role = 'resident'`,
    [residentId]
  );
  return rows[0] || null;
};

const getRequestRow = async (id) => {
  const [rows] = await promisePool.query(
    `SELECT nr.*, u.name AS resident_name, u.email AS resident_email, u.phone AS resident_phone, u.status AS resident_status,
            f.flat_no, f.wing, f.floor_no, f.status AS flat_status,
            admin.name AS approved_by_name
     FROM noc_requests nr
     JOIN users u ON nr.resident_id = u.id
     LEFT JOIN flats f ON nr.flat_id = f.id
     LEFT JOIN users admin ON nr.approved_by = admin.id
     WHERE nr.id = ?`,
    [id]
  );
  return rows[0] || null;
};

const canAccessRequest = (req, request) => {
  if (!request) return false;
  return req.user.role === 'admin' || Number(request.resident_id) === Number(req.user.id);
};

const hasMaintenanceDues = async (residentId) => {
  const [rows] = await promisePool.query(
    `SELECT COUNT(*) AS count
     FROM maintenance
     WHERE resident_id = ?
       AND status <> 'Paid'
       AND COALESCE(remaining_amount, total_amount, amount, 0) > 0`,
    [residentId]
  );
  return Number(rows[0]?.count || 0) > 0;
};

const normalizeDocuments = (documents) => {
  if (!documents) return null;
  if (Array.isArray(documents)) return JSON.stringify(documents);
  if (typeof documents === 'string') return documents;
  return JSON.stringify([documents]);
};

// POST /api/noc/request
const createRequest = async (req, res) => {
  try {
    if (req.user.role !== 'resident') {
      return sendResponse(res, 403, 'Only residents can submit NOC requests');
    }

    const { noc_type: nocType, purpose, remarks, required_date, contact_number, documents } = req.body;
    if (!nocType || !purpose) {
      return sendResponse(res, 400, 'NOC type and purpose are required');
    }

    const resident = await getResidentFlat(req.user.id);
    if (!resident || resident.resident_status !== 'approved') {
      return sendResponse(res, 400, 'Resident account is not active');
    }

    const requestNumber = await generateRequestNumber();
    const verificationNumber = `VERIFY-${requestNumber}-${Date.now().toString().slice(-5)}`;
    const [result] = await promisePool.query(
      `INSERT INTO noc_requests
       (request_number, resident_id, flat_id, noc_type, purpose, remarks, required_date, contact_number, documents, status, verification_number)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'Submitted', ?)`,
      [
        requestNumber,
        req.user.id,
        resident.flat_id || null,
        nocType,
        purpose,
        remarks || null,
        required_date || null,
        contact_number || resident.phone || null,
        normalizeDocuments(documents),
        verificationNumber
      ]
    );

    await logAction(result.insertId, 'Submitted', req.user.id, `Submitted request for ${nocType}`);
    await createNotification(
      req.user.id,
      'NOC Request Submitted',
      `Your ${nocType} NOC request ${requestNumber} has been submitted successfully.`,
      'noc',
      result.insertId
    );

    return sendResponse(res, 201, 'NOC request submitted successfully', { id: result.insertId, request_number: requestNumber });
  } catch (error) {
    console.error('Create NOC request error:', error);
    return sendResponse(res, 500, 'Server error');
  }
};

// GET /api/noc
const getRequests = async (req, res) => {
  try {
    const { status, search, noc_type, start_date, end_date } = req.query;
    const values = [];
    const where = [];

    if (req.user.role !== 'admin') {
      where.push('nr.resident_id = ?');
      values.push(req.user.id);
    }
    if (status && status !== 'All') {
      where.push('nr.status = ?');
      values.push(status);
    }
    if (noc_type && noc_type !== 'All') {
      where.push('nr.noc_type = ?');
      values.push(noc_type);
    }
    if (start_date) {
      where.push('nr.requested_at >= ?');
      values.push(start_date);
    }
    if (end_date) {
      where.push('nr.requested_at <= ?');
      values.push(`${end_date} 23:59:59`);
    }
    if (search) {
      where.push('(LOWER(u.name) LIKE ? OR LOWER(f.flat_no) LIKE ? OR LOWER(nr.noc_type) LIKE ? OR LOWER(nr.request_number) LIKE ?)');
      const term = `%${String(search).toLowerCase()}%`;
      values.push(term, term, term, term);
    }

    const [rows] = await promisePool.query(
      `SELECT nr.*, u.name AS resident_name, u.email AS resident_email, u.phone AS resident_phone,
              f.flat_no, f.wing, f.floor_no, f.status AS flat_status
       FROM noc_requests nr
       JOIN users u ON nr.resident_id = u.id
       LEFT JOIN flats f ON nr.flat_id = f.id
       ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
       ORDER BY nr.requested_at DESC`,
      values
    );

    return res.json(rows);
  } catch (error) {
    console.error('Get NOC requests error:', error);
    return sendResponse(res, 500, 'Server error');
  }
};

// GET /api/noc/:id
const getRequestById = async (req, res) => {
  try {
    const request = await getRequestRow(req.params.id);
    if (!canAccessRequest(req, request)) {
      return sendResponse(res, request ? 403 : 404, request ? 'Access denied' : 'NOC request not found');
    }

    const [history] = await promisePool.query(
      `SELECT l.*, u.name AS actor_name
       FROM noc_audit_logs l
       LEFT JOIN users u ON l.actor_id = u.id
       WHERE l.noc_request_id = ?
       ORDER BY l.created_at DESC`,
      [req.params.id]
    );

    return res.json({ ...request, history });
  } catch (error) {
    console.error('Get NOC request error:', error);
    return sendResponse(res, 500, 'Server error');
  }
};

// GET /api/noc/summary
const getSummary = async (req, res) => {
  try {
    const values = [];
    const where = [];
    if (req.user.role !== 'admin') {
      where.push('resident_id = ?');
      values.push(req.user.id);
    }
    const [rows] = await promisePool.query(
      `SELECT
         COUNT(*) AS total,
         SUM(CASE WHEN status IN ('Submitted', 'Pending') THEN 1 ELSE 0 END) AS pending,
         SUM(CASE WHEN status = 'Under Review' THEN 1 ELSE 0 END) AS under_review,
         SUM(CASE WHEN status = 'Additional Information Required' THEN 1 ELSE 0 END) AS additional_info_required,
         SUM(CASE WHEN status = 'Approved' THEN 1 ELSE 0 END) AS approved,
         SUM(CASE WHEN status = 'Rejected' THEN 1 ELSE 0 END) AS rejected,
         SUM(CASE WHEN status = 'Completed' THEN 1 ELSE 0 END) AS completed
       FROM noc_requests
       ${where.length ? `WHERE ${where.join(' AND ')}` : ''}`,
      values
    );
    return res.json(rows[0] || { total: 0, pending: 0, under_review: 0, additional_info_required: 0, approved: 0, rejected: 0, completed: 0 });
  } catch (error) {
    console.error('Get NOC summary error:', error);
    return sendResponse(res, 500, 'Server error');
  }
};

// PUT /api/noc/:id/review
const markUnderReview = async (req, res) => {
  try {
    const request = await getRequestRow(req.params.id);
    if (!request) return sendResponse(res, 404, 'NOC request not found');

    await promisePool.query(
      `UPDATE noc_requests SET status = 'Under Review', admin_remarks = ?, updated_at = NOW() WHERE id = ?`,
      [req.body.remarks || null, req.params.id]
    );
    await logAction(req.params.id, 'Under Review', req.user.id, req.body.remarks || 'Admin started review.');
    await createNotification(request.resident_id, 'NOC Under Review', `Your request ${request.request_number} is now under review.`, 'noc', request.id);
    return sendResponse(res, 200, 'NOC request marked under review');
  } catch (error) {
    console.error('Mark NOC review error:', error);
    return sendResponse(res, 500, 'Server error');
  }
};

// PUT /api/noc/:id/request-info
const requestMoreInfo = async (req, res) => {
  try {
    const request = await getRequestRow(req.params.id);
    if (!request) return sendResponse(res, 404, 'NOC request not found');
    const { remarks } = req.body;

    await promisePool.query(
      `UPDATE noc_requests SET status = 'Additional Information Required', admin_remarks = ?, updated_at = NOW() WHERE id = ?`,
      [remarks || 'Additional information requested by admin.', req.params.id]
    );
    await logAction(req.params.id, 'Additional Information Requested', req.user.id, remarks || 'Requested more details/documents.');
    await createNotification(request.resident_id, 'Additional Information Requested', `Admin requested additional documents/information for ${request.request_number}. Remarks: ${remarks || ''}`, 'noc', request.id);
    return sendResponse(res, 200, 'Additional information requested from resident');
  } catch (error) {
    console.error('Request info error:', error);
    return sendResponse(res, 500, 'Server error');
  }
};

// PUT /api/noc/:id/upload-info (Resident uploads requested info/docs)
const uploadAdditionalInfo = async (req, res) => {
  try {
    const request = await getRequestRow(req.params.id);
    if (!request) return sendResponse(res, 404, 'NOC request not found');
    if (!canAccessRequest(req, request)) return sendResponse(res, 403, 'Access denied');

    const { documents, remarks } = req.body;
    let existingDocs = [];
    try {
      existingDocs = JSON.parse(request.documents || '[]');
      if (!Array.isArray(existingDocs)) existingDocs = [];
    } catch (e) {
      existingDocs = [];
    }

    const newDocs = Array.isArray(documents) ? documents : [];
    const mergedDocs = [...existingDocs, ...newDocs];

    await promisePool.query(
      `UPDATE noc_requests SET documents = ?, status = 'Under Review', remarks = COALESCE(?, remarks), updated_at = NOW() WHERE id = ?`,
      [JSON.stringify(mergedDocs), remarks || null, req.params.id]
    );
    await logAction(req.params.id, 'Uploaded Additional Documents', req.user.id, remarks || 'Resident uploaded requested documents.');
    return sendResponse(res, 200, 'Additional documents uploaded successfully');
  } catch (error) {
    console.error('Upload additional info error:', error);
    return sendResponse(res, 500, 'Server error');
  }
};

// PUT /api/noc/:id/approve
const approveRequest = async (req, res) => {
  try {
    const request = await getRequestRow(req.params.id);
    if (!request) return sendResponse(res, 404, 'NOC request not found');
    if (['Approved', 'Completed'].includes(request.status)) return sendResponse(res, 400, 'NOC request is already approved/completed');
    if (request.status === 'Rejected') return sendResponse(res, 400, 'Rejected requests cannot be approved');

    const { remarks, expiry_date } = req.body;
    const shareToken = request.share_token || await createShortShareToken();
    const pdfUrl = `/share/noc/${shareToken}`;

    await promisePool.query(
      `UPDATE noc_requests
       SET status = 'Approved', approved_at = NOW(), approved_by = ?, admin_remarks = ?,
           expiry_date = ?, pdf_url = ?, share_token = ?,
           share_token_created_at = COALESCE(share_token_created_at, NOW()),
           share_token_expires_at = COALESCE(share_token_expires_at, NOW() + INTERVAL '30 days'),
           updated_at = NOW()
       WHERE id = ?`,
      [req.user.id, remarks || null, expiry_date || null, pdfUrl, shareToken, request.id]
    );

    await logAction(request.id, 'Approved', req.user.id, remarks || 'NOC request approved.');
    await logAction(request.id, 'NOC Certificate Generated', req.user.id, `Certificate issued: ${request.request_number}`);
    await createNotification(request.resident_id, 'NOC Request Approved', `Your ${request.noc_type} NOC request (${request.request_number}) has been approved and your certificate is generated.`, 'noc', request.id);

    return sendResponse(res, 200, 'NOC approved and certificate generated successfully');
  } catch (error) {
    console.error('Approve NOC error:', error);
    return sendResponse(res, 500, 'Server error');
  }
};

// PUT /api/noc/:id/reject
const rejectRequest = async (req, res) => {
  try {
    const request = await getRequestRow(req.params.id);
    if (!request) return sendResponse(res, 404, 'NOC request not found');
    const reason = req.body.rejected_reason || req.body.reason;
    if (!reason) return sendResponse(res, 400, 'Rejection reason is required');

    await promisePool.query(
      `UPDATE noc_requests
       SET status = 'Rejected', rejected_reason = ?, admin_remarks = ?, updated_at = NOW()
       WHERE id = ?`,
      [reason, req.body.remarks || null, request.id]
    );
    await logAction(request.id, 'Rejected', req.user.id, `Reason: ${reason}`);
    await createNotification(request.resident_id, 'NOC Request Rejected', `Your NOC request ${request.request_number} was rejected. Reason: ${reason}`, 'noc', request.id);

    return sendResponse(res, 200, 'NOC rejected successfully');
  } catch (error) {
    console.error('Reject NOC error:', error);
    return sendResponse(res, 500, 'Server error');
  }
};

// PUT /api/noc/:id/complete
const completeRequest = async (req, res) => {
  try {
    const request = await getRequestRow(req.params.id);
    if (!request) return sendResponse(res, 404, 'NOC request not found');

    await promisePool.query(
      `UPDATE noc_requests SET status = 'Completed', updated_at = NOW() WHERE id = ?`,
      [request.id]
    );
    await logAction(request.id, 'Completed', req.user.id, 'NOC request marked completed.');
    return sendResponse(res, 200, 'NOC request marked completed');
  } catch (error) {
    console.error('Complete NOC error:', error);
    return sendResponse(res, 500, 'Server error');
  }
};

const cancelRequest = async (req, res) => {
  try {
    const request = await getRequestRow(req.params.id);
    if (!request) return sendResponse(res, 404, 'NOC request not found');
    if (req.user.role !== 'admin' && String(request.resident_id) !== String(req.user.id)) {
      return sendResponse(res, 403, 'Access denied');
    }
    if (!['Pending', 'Under Review'].includes(request.status)) {
      return sendResponse(res, 400, 'Only pending or under review NOC requests can be cancelled');
    }

    const reason = req.body.reason || req.body.remarks || 'Cancelled by resident';
    await promisePool.query(
      `UPDATE noc_requests
       SET status = 'Cancelled', rejected_reason = ?, admin_remarks = ?, updated_at = NOW()
       WHERE id = ?`,
      [reason, reason, request.id]
    );
    await logAction(request.id, 'Cancelled', req.user.id, reason);

    return sendResponse(res, 200, 'NOC request cancelled successfully');
  } catch (error) {
    console.error('Cancel NOC error:', error);
    return sendResponse(res, 500, 'Server error');
  }
};

// GET /api/noc/types
const getTypes = async (req, res) => {
  try {
    const [rows] = await promisePool.query('SELECT * FROM noc_types WHERE active = true ORDER BY name');
    return res.json(rows);
  } catch (error) {
    console.error('Get NOC types error:', error);
    return sendResponse(res, 500, 'Server error');
  }
};

// POST /api/noc/types
const createType = async (req, res) => {
  try {
    const { name, description } = req.body;
    if (!name) return sendResponse(res, 400, 'NOC type name is required');
    const [result] = await promisePool.query(
      'INSERT INTO noc_types (name, description, active) VALUES (?, ?, true)',
      [name.trim(), description || null]
    );
    return sendResponse(res, 201, 'NOC type created successfully', { id: result.insertId });
  } catch (error) {
    if (error.code === '23505') return sendResponse(res, 400, 'NOC type already exists');
    console.error('Create NOC type error:', error);
    return sendResponse(res, 500, 'Server error');
  }
};

// HTML & PDF Certificate Builder
const generateNocHtml = (request, societyName) => {
  const verificationNumber = request.verification_number || `VERIFY-${request.request_number}`;
  const issueDateStr = fullDate(request.approved_at || request.requested_at);
  const expiryDateStr = request.expiry_date ? shortDate(request.expiry_date) : 'N/A (No Expiry)';

  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>NOC Certificate - ${escapeHtml(request.request_number)}</title>
  <style>
    body{font-family:'Segoe UI',Roboto,Helvetica,Arial,sans-serif;background:#f8fafc;margin:0;padding:30px;color:#1e293b}
    .certificate{max-width:820px;margin:auto;background:#fff;border:3px double #1e3a8a;padding:45px;box-shadow:0 20px 30px rgba(0,0,0,0.08);position:relative;border-radius:4px}
    .header{display:flex;align-items:center;justify-content:space-between;border-bottom:2px solid #1e3a8a;padding-bottom:20px;margin-bottom:25px}
    .society-title{font-size:24px;font-weight:800;color:#1e3a8a;text-transform:uppercase;letter-spacing:0.5px}
    .society-sub{font-size:12px;color:#64748b;font-weight:600}
    .cert-title{text-align:center;margin:30px 0 10px}
    .cert-title h1{font-size:26px;color:#1e3a8a;text-transform:uppercase;letter-spacing:1.5px;margin:0}
    .cert-title p{font-size:14px;color:#64748b;font-weight:700;margin-top:4px}
    .meta-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px;background:#f1f5f9;padding:16px;border-radius:8px;margin:20px 0;font-size:13px}
    .meta-item strong{color:#334155}
    .body-text{font-size:15px;line-height:1.8;color:#334155;text-align:justify;margin:30px 0}
    .footer-grid{display:grid;grid-template-columns:1fr 160px 1fr;gap:20px;align-items:end;margin-top:50px}
    .signature-box{text-align:center;border-top:1px solid #94a3b8;padding-top:8px;font-size:12px;font-weight:700;color:#1e293b}
    .seal-box{width:120px;height:120px;border:2px dashed #1e3a8a;border-radius:50%;display:flex;align-items:center;justify-content:center;text-align:center;font-size:10px;font-weight:800;color:#1e3a8a;margin:auto;text-transform:uppercase;letter-spacing:0.5px}
    .qr-verify{margin-top:30px;padding:14px;background:#f8fafc;border:1px solid #cbd5e1;border-radius:6px;display:flex;justify-content:space-between;align-items:center;font-size:11px;color:#475569}
    .print-btn{position:fixed;right:24px;top:24px;background:#1e3a8a;color:#fff;border:none;padding:10px 20px;border-radius:8px;font-weight:700;cursor:pointer;box-shadow:0 4px 12px rgba(30,58,138,0.3)}
    @media print{.print-btn{display:none}body{background:#fff;padding:0}.certificate{box-shadow:none;border:3px double #1e3a8a}}
  </style>
</head>
<body>
  <button class="print-btn" onclick="window.print()">🖨️ Print / Download PDF</button>
  <div class="certificate">
    <div class="header">
      <div>
        <div class="society-title">${escapeHtml(societyName)}</div>
        <div class="society-sub">Registered Housing Society · Official No Objection Certificate</div>
      </div>
      <div style={{ textAlign: 'right', fontSize: '12px', color: '#64748b' }}>
        <strong>NOC Ref:</strong> ${escapeHtml(request.request_number)}
      </div>
    </div>

    <div class="cert-title">
      <h1>NO OBJECTION CERTIFICATE</h1>
      <p>Category: ${escapeHtml(request.noc_type)}</p>
    </div>

    <div class="meta-grid">
      <div class="meta-item"><strong>Resident Name:</strong> ${escapeHtml(request.resident_name)}</div>
      <div class="meta-item"><strong>Flat Details:</strong> ${escapeHtml(request.flat_no || 'N/A')} ${request.wing ? `(Wing ${request.wing})` : ''}</div>
      <div class="meta-item"><strong>Issue Date:</strong> ${issueDateStr}</div>
      <div class="meta-item"><strong>Expiry Date:</strong> ${expiryDateStr}</div>
      <div class="meta-item"><strong>Purpose:</strong> ${escapeHtml(request.purpose)}</div>
      <div class="meta-item"><strong>Verification ID:</strong> ${escapeHtml(verificationNumber)}</div>
    </div>

    <div class="body-text">
      This is to certify that <strong>${escapeHtml(request.resident_name)}</strong> is a bona fide resident/member of 
      <strong>Flat No. ${escapeHtml(request.flat_no || '')}${request.wing ? `, Wing ${request.wing}` : ''}</strong> in ${escapeHtml(societyName)}.
      <br/><br/>
      The Managing Committee of the society hereby confirms that there are no dues pending, legal disputes, or objections regarding this flat for the purpose of <strong>${escapeHtml(request.purpose)} (${escapeHtml(request.noc_type)})</strong>.
      ${request.admin_remarks ? `<br/><br/><strong>Remarks:</strong> ${escapeHtml(request.admin_remarks)}` : ''}
    </div>

    <div class="footer-grid">
      <div class="signature-box">
        <br/><br/>
        <strong>Secretary / Admin</strong><br/>
        Authorized Signature
      </div>
      <div class="seal-box">
        Official<br/>Society<br/>Seal
      </div>
      <div class="signature-box">
        <br/><br/>
        <strong>Chairman / President</strong><br/>
        Authorized Signature
      </div>
    </div>

    <div class="qr-verify">
      <div>
        <strong>Digital Verification ID:</strong> ${escapeHtml(verificationNumber)}<br/>
        <span>Issued digitally by Society Management Portal</span>
      </div>
      <div style="font-weight:700;color:#1e3a8a">VALID CERTIFICATE</div>
    </div>
  </div>
</body>
</html>`;
};

// GET /api/noc/:id/pdf
const getPdf = async (req, res) => {
  try {
    const request = await getRequestRow(req.params.id);
    if (!canAccessRequest(req, request)) {
      return sendResponse(res, request ? 403 : 404, request ? 'Access denied' : 'NOC request not found');
    }
    if (!['Approved', 'Completed'].includes(request.status)) {
      return sendResponse(res, 400, 'NOC PDF is available only after approval');
    }

    const societyName = process.env.SOCIETY_NAME || 'Society Management System';
    const html = generateNocHtml(request, societyName);

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Content-Disposition', `inline; filename="${request.request_number}.html"`);
    return res.send(html);
  } catch (error) {
    console.error('Get NOC PDF error:', error);
    return sendResponse(res, 500, 'Server error');
  }
};

// GET /api/noc/reports
const getReportsData = async (req, res) => {
  try {
    const [statusCounts] = await promisePool.query(`
      SELECT
        COUNT(*) AS total,
        SUM(CASE WHEN status IN ('Submitted', 'Pending') THEN 1 ELSE 0 END) AS pending,
        SUM(CASE WHEN status = 'Under Review' THEN 1 ELSE 0 END) AS under_review,
        SUM(CASE WHEN status = 'Approved' THEN 1 ELSE 0 END) AS approved,
        SUM(CASE WHEN status = 'Rejected' THEN 1 ELSE 0 END) AS rejected,
        SUM(CASE WHEN status = 'Completed' THEN 1 ELSE 0 END) AS completed,
        SUM(CASE WHEN expiry_date IS NOT NULL AND expiry_date < CURRENT_DATE THEN 1 ELSE 0 END) AS expired
      FROM noc_requests
    `);

    const [typeCounts] = await promisePool.query(`
      SELECT noc_type, COUNT(*) AS count
      FROM noc_requests
      GROUP BY noc_type
      ORDER BY count DESC
    `);

    const [monthCounts] = await promisePool.query(`
      SELECT TO_CHAR(requested_at, 'Mon YYYY') AS month, COUNT(*) AS count
      FROM noc_requests
      GROUP BY TO_CHAR(requested_at, 'Mon YYYY'), DATE_TRUNC('month', requested_at)
      ORDER BY DATE_TRUNC('month', requested_at) DESC
      LIMIT 12
    `);

    return res.json({
      summary: statusCounts[0] || {},
      by_type: typeCounts || [],
      by_month: monthCounts || []
    });
  } catch (error) {
    console.error('Get NOC reports error:', error);
    return sendResponse(res, 500, 'Server error');
  }
};

// POST /api/noc/:id/share
const generateShareToken = async (req, res) => {
  try {
    const request = await getRequestRow(req.params.id);
    if (!request) return sendResponse(res, 404, 'NOC request not found');

    const token = request.share_token || await createShortShareToken();
    await promisePool.query(
      `UPDATE noc_requests
       SET share_token = ?, share_token_created_at = COALESCE(share_token_created_at, NOW()),
           share_token_expires_at = COALESCE(share_token_expires_at, NOW() + INTERVAL '30 days'),
           pdf_url = ?, updated_at = NOW()
       WHERE id = ?`,
      [token, `/share/noc/${token}`, request.id]
    );

    const frontendOrigin = getPublicFrontendOrigin(req);
    const shareUrl = `${frontendOrigin}/share/noc/${token}`.trim();
    return sendResponse(res, 200, 'Share link generated', { shareUrl });
  } catch (error) {
    console.error('Generate share token error:', error);
    return sendResponse(res, 500, 'Server error');
  }
};

// Public certificate endpoints
const getSharedPdf = async (req, res) => {
  try {
    const { token } = req.params;
    const [rows] = await promisePool.query('SELECT id FROM noc_requests WHERE share_token = ? LIMIT 1', [token]);
    const request = rows.length ? await getRequestRow(rows[0].id) : null;
    if (!request) return res.status(404).send('<h1>NOC Certificate Not Found</h1>');

    const societyName = process.env.SOCIETY_NAME || 'Society Management System';
    const html = generateNocHtml(request, societyName);
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.send(html);
  } catch (error) {
    return res.status(500).send('Server Error');
  }
};

const getPublicCertificate = async (req, res) => {
  try {
    const { token } = req.params;
    const [rows] = await promisePool.query('SELECT id FROM noc_requests WHERE share_token = ? LIMIT 1', [token]);
    if (!rows.length) return res.status(404).json({ message: 'Certificate Not Found' });

    const request = await getRequestRow(rows[0].id);
    return res.json({
      society: { name: process.env.SOCIETY_NAME || 'Society Management System' },
      certificate: {
        request_number: request.request_number,
        noc_type: request.noc_type,
        purpose: request.purpose,
        issue_date: request.approved_at,
        expiry_date: request.expiry_date,
        verification_number: request.verification_number || `VERIFY-${request.request_number}`,
        resident_name: request.resident_name,
        flat_no: request.flat_no,
        wing: request.wing
      }
    });
  } catch (error) {
    return res.status(500).json({ message: 'Unable to load certificate' });
  }
};

module.exports = {
  createRequest,
  getRequests,
  getRequestById,
  getSummary,
  markUnderReview,
  requestMoreInfo,
  uploadAdditionalInfo,
  approveRequest,
  rejectRequest,
  completeRequest,
  cancelRequest,
  getTypes,
  createType,
  getPdf,
  getReportsData,
  generateShareToken,
  getSharedPdf,
  getPublicCertificate
};
