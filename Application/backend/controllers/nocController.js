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
    'SELECT request_number FROM noc_requests WHERE request_number LIKE ? ORDER BY request_number DESC LIMIT 1',
    [`${prefix}%`]
  );
  const next = rows.length
    ? Number(String(rows[0].request_number).replace(prefix, '')) + 1
    : 1;
  return `${prefix}${String(next).padStart(4, '0')}`;
};

const normalizeOrigin = (value) => {
  if (!value) return '';
  return String(value).trim().replace(/[\r\n\s]+/g, '').replace(/\/api\/?$/, '').replace(/\/$/, '');
};

const getPublicFrontendOrigin = (req) => {
  const configured = normalizeOrigin(process.env.FRONTEND_URL || process.env.PUBLIC_FRONTEND_URL);
  if (!configured) {
    const host = req?.get?.('host') || 'unknown-host';
    console.error(`NOC share link generation blocked. FRONTEND_URL is missing. Request host was: ${host}`);
    throw new Error('FRONTEND_URL is required to generate NOC share links');
  }
  const unsafeHostPattern = new RegExp(['local' + 'host', '127\\.0\\.0\\.1', 'loca' + '\\.lt', 'ng' + 'rok'].join('|'), 'i');
  if (unsafeHostPattern.test(configured)) {
    console.error(`NOC share link generation blocked. FRONTEND_URL is not a production URL: ${configured}`);
    throw new Error('FRONTEND_URL must be your deployed frontend domain');
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
    `SELECT u.id, u.name, u.email, u.status AS resident_status, u.flat_id,
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

const hasLegalDispute = async (residentId, flatId) => {
  try {
    const [rows] = await promisePool.query(
      `SELECT COUNT(*) AS count
       FROM legal_disputes
       WHERE (resident_id = ? OR flat_id = ?) AND status IN ('Open', 'Pending', 'Under Review')`,
      [residentId, flatId || null]
    );
    return Number(rows[0]?.count || 0) > 0;
  } catch (error) {
    if (error.code === '42P01') return false;
    throw error;
  }
};

const normalizeDocuments = (documents) => {
  if (!documents) return null;
  if (Array.isArray(documents)) return JSON.stringify(documents);
  if (typeof documents === 'string') return documents;
  return JSON.stringify([documents]);
};

const createRequest = async (req, res) => {
  try {
    if (req.user.role !== 'resident') {
      return sendResponse(res, 403, 'Only residents can submit NOC requests');
    }

    const { noc_type: nocType, purpose, remarks, documents } = req.body;
    if (!nocType || !purpose) {
      return sendResponse(res, 400, 'NOC type and purpose are required');
    }

    const resident = await getResidentFlat(req.user.id);
    if (!resident || resident.resident_status !== 'approved') {
      return sendResponse(res, 400, 'Resident account is not active');
    }
    if (!resident.flat_id) {
      return sendResponse(res, 400, 'No active flat assigned to this resident');
    }

    const requestNumber = await generateRequestNumber();
    const verificationNumber = `VERIFY-${requestNumber}-${Date.now().toString().slice(-5)}`;
    const [result] = await promisePool.query(
      `INSERT INTO noc_requests
       (request_number, resident_id, flat_id, noc_type, purpose, remarks, documents, status, verification_number)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'Pending', ?)`,
      [
        requestNumber,
        req.user.id,
        resident.flat_id,
        nocType,
        purpose,
        remarks || null,
        normalizeDocuments(documents),
        verificationNumber
      ]
    );

    await logAction(result.insertId, 'Submitted', req.user.id, remarks || '');
    await createNotification(
      req.user.id,
      'NOC request submitted',
      `${nocType} request ${requestNumber} has been submitted.`,
      'noc',
      result.insertId
    );

    return sendResponse(res, 201, 'NOC request submitted successfully', { id: result.insertId, request_number: requestNumber });
  } catch (error) {
    console.error('Create NOC request error:', error);
    return sendResponse(res, 500, 'Server error');
  }
};

const getRequests = async (req, res) => {
  try {
    const { status, search } = req.query;
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
         SUM(CASE WHEN status = 'Pending' THEN 1 ELSE 0 END) AS pending,
         SUM(CASE WHEN status = 'Under Review' THEN 1 ELSE 0 END) AS under_review,
         SUM(CASE WHEN status = 'Approved' THEN 1 ELSE 0 END) AS approved,
         SUM(CASE WHEN status = 'Rejected' THEN 1 ELSE 0 END) AS rejected
       FROM noc_requests
       ${where.length ? `WHERE ${where.join(' AND ')}` : ''}`,
      values
    );
    return res.json(rows[0] || { total: 0, pending: 0, under_review: 0, approved: 0, rejected: 0 });
  } catch (error) {
    console.error('Get NOC summary error:', error);
    return sendResponse(res, 500, 'Server error');
  }
};

const markUnderReview = async (req, res) => {
  try {
    const request = await getRequestRow(req.params.id);
    if (!request) return sendResponse(res, 404, 'NOC request not found');
    if (request.status !== 'Pending') return sendResponse(res, 400, 'Only pending requests can be marked under review');

    await promisePool.query(
      `UPDATE noc_requests SET status = 'Under Review', admin_remarks = ?, updated_at = NOW() WHERE id = ?`,
      [req.body.remarks || null, req.params.id]
    );
    await logAction(req.params.id, 'Under Review', req.user.id, req.body.remarks || '');
    await createNotification(request.resident_id, 'NOC under review', `${request.request_number} is under review.`, 'noc', request.id);
    return sendResponse(res, 200, 'NOC request marked under review');
  } catch (error) {
    console.error('Mark NOC review error:', error);
    return sendResponse(res, 500, 'Server error');
  }
};

const approveRequest = async (req, res) => {
  try {
    const request = await getRequestRow(req.params.id);
    if (!request) return sendResponse(res, 404, 'NOC request not found');
    if (request.status === 'Approved') return sendResponse(res, 400, 'NOC request is already approved');
    if (request.status === 'Rejected') return sendResponse(res, 400, 'Rejected requests cannot be approved');

    if (request.resident_status !== 'approved') {
      return sendResponse(res, 400, 'Cannot approve NOC. Resident account is not active.');
    }
    if (!request.flat_id || !request.flat_no || !['Occupied', 'Assigned'].includes(request.flat_status)) {
      return sendResponse(res, 400, 'Cannot approve NOC. Flat is not active.');
    }
    if (await hasMaintenanceDues(request.resident_id)) {
      return sendResponse(res, 400, 'Cannot approve NOC.\nOutstanding maintenance dues found.');
    }
    if (await hasLegalDispute(request.resident_id, request.flat_id)) {
      return sendResponse(res, 400, 'Cannot approve NOC. Legal dispute found.');
    }

    const shareToken = request.share_token || await createShortShareToken();
    const pdfUrl = `/share/noc/${shareToken}`;
    await promisePool.query(
      `UPDATE noc_requests
       SET status = 'Approved', approved_at = NOW(), approved_by = ?, admin_remarks = ?,
           pdf_url = ?, share_token = ?, share_token_created_at = COALESCE(share_token_created_at, NOW()),
           share_token_expires_at = COALESCE(share_token_expires_at, NOW() + INTERVAL '30 days'),
           updated_at = NOW()
       WHERE id = ?`,
      [req.user.id, req.body.remarks || null, pdfUrl, shareToken, request.id]
    );
    await logAction(request.id, 'Approved', req.user.id, req.body.remarks || '');
    await createNotification(request.resident_id, 'NOC approved', `${request.request_number} has been approved and is ready to download.`, 'noc', request.id);

    return sendResponse(res, 200, 'NOC approved successfully');
  } catch (error) {
    console.error('Approve NOC error:', error);
    return sendResponse(res, 500, 'Server error');
  }
};

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
    await logAction(request.id, 'Rejected', req.user.id, reason);
    await createNotification(request.resident_id, 'NOC rejected', `${request.request_number} was rejected. Reason: ${reason}`, 'noc', request.id);

    return sendResponse(res, 200, 'NOC rejected successfully');
  } catch (error) {
    console.error('Reject NOC error:', error);
    return sendResponse(res, 500, 'Server error');
  }
};

const cancelRequest = async (req, res) => {
  try {
    const request = await getRequestRow(req.params.id);
    if (!request) return sendResponse(res, 404, 'NOC request not found');
    if (req.user.role !== 'admin' && Number(request.resident_id) !== Number(req.user.id)) {
      return sendResponse(res, 403, 'Access denied');
    }
    if (!['Pending', 'Under Review'].includes(request.status)) {
      return sendResponse(res, 400, 'This NOC request cannot be cancelled');
    }
    await promisePool.query(
      `UPDATE noc_requests SET status = 'Cancelled', admin_remarks = ?, updated_at = NOW() WHERE id = ?`,
      [req.body?.remarks || null, request.id]
    );
    await logAction(request.id, 'Cancelled', req.user.id, req.body?.remarks || 'Cancelled by resident');
    return sendResponse(res, 200, 'NOC request cancelled');
  } catch (error) {
    console.error('Cancel NOC request error:', error);
    return sendResponse(res, 500, 'Server error');
  }
};

const getTypes = async (req, res) => {
  try {
    const [rows] = await promisePool.query('SELECT * FROM noc_types WHERE active = true ORDER BY name');
    return res.json(rows);
  } catch (error) {
    console.error('Get NOC types error:', error);
    return sendResponse(res, 500, 'Server error');
  }
};

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

const generateNocHtml = (request, societyName) => {
  const verificationNumber = request.verification_number || `VERIFY-${request.request_number}`;
  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(request.request_number)}</title>
  <style>
    body{font-family:Arial,sans-serif;background:#f5f7fb;margin:0;padding:28px;color:#102033}
    .certificate{max-width:820px;margin:auto;background:#fff;border:2px solid #0b3b68;padding:36px;box-shadow:0 16px 38px rgba(15,23,42,.12)}
    .head{display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid #d8e1ef;padding-bottom:18px}
    .logo{width:64px;height:64px;border-radius:16px;background:#0b3b68;color:#fff;display:grid;place-items:center;font-size:26px;font-weight:800}
    h1{font-size:24px;margin:24px 0 4px;text-align:center;text-transform:uppercase;letter-spacing:1px}
    .sub{text-align:center;color:#64748b;margin-bottom:28px}.row{display:grid;grid-template-columns:180px 1fr;gap:10px;margin:10px 0}
    .label{font-weight:700;color:#334155}.statement{line-height:1.8;margin:28px 0;font-size:16px;text-align:justify}
    .signatures{display:grid;grid-template-columns:1fr 1fr;gap:50px;margin-top:60px}.sign{border-top:1px solid #0f172a;text-align:center;padding-top:10px;font-weight:700}
    .verify{margin-top:26px;border:1px dashed #94a3b8;padding:14px;border-radius:10px;background:#f8fafc}
    .print{position:fixed;right:20px;top:20px;border:0;background:#0b63ce;color:white;padding:10px 16px;border-radius:8px;font-weight:700;cursor:pointer}
    @media print{body{background:white;padding:0}.certificate{box-shadow:none;border:2px solid #0b3b68}.print{display:none}}
  </style>
</head>
<body>
  <button class="print" onclick="window.print()">Download / Print PDF</button>
  <section class="certificate">
    <div class="head">
      <div class="logo">SH</div>
      <div>
        <strong>${escapeHtml(societyName)}</strong><br/>
        <span>No Objection Certificate</span>
      </div>
    </div>
    <h1>No Objection Certificate</h1>
    <div class="sub">${escapeHtml(request.noc_type)}</div>
    <div class="row"><div class="label">NOC Number</div><div>${escapeHtml(request.request_number)}</div></div>
    <div class="row"><div class="label">Issue Date</div><div>${fullDate(request.approved_at)}</div></div>
    <div class="row"><div class="label">Resident Name</div><div>${escapeHtml(request.resident_name)}</div></div>
    <div class="row"><div class="label">Flat Number</div><div>${escapeHtml(request.flat_no || '')}, Wing ${escapeHtml(request.wing || '')}, Floor ${escapeHtml(request.floor_no || '')}</div></div>
    <div class="row"><div class="label">Purpose</div><div>${escapeHtml(request.purpose)}</div></div>
    <p class="statement">
      This is to certify that ${escapeHtml(request.resident_name)} is a resident/member of flat
      ${escapeHtml(request.flat_no || '')}. The society has no objection to issuing this certificate
      for the purpose stated above, subject to society rules, by-laws, and applicable law.
    </p>
    <div class="signatures">
      <div class="sign">Secretary Signature</div>
      <div class="sign">Chairman Signature</div>
    </div>
    <div class="verify">
      <strong>Digital Verification Number:</strong> ${escapeHtml(verificationNumber)}<br/>
      <small>Generated digitally from the Society Management System.</small>
    </div>
  </section>
</body>
</html>`;
};

const getPdf = async (req, res) => {
  try {
    const request = await getRequestRow(req.params.id);
    if (!canAccessRequest(req, request)) {
      return sendResponse(res, request ? 403 : 404, request ? 'Access denied' : 'NOC request not found');
    }
    if (request.status !== 'Approved') {
      return sendResponse(res, 400, 'NOC PDF is available only after approval');
    }

    const societyName = process.env.SOCIETY_NAME || 'Society Management System';
    const html = generateNocHtml(request, societyName);

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${request.request_number}.html"`);
    return res.send(html);
  } catch (error) {
    console.error('Get NOC PDF error:', error);
    return sendResponse(res, 500, 'Server error');
  }
};

const generateShareToken = async (req, res) => {
  try {
    const request = await getRequestRow(req.params.id);
    if (!request) return sendResponse(res, 404, 'NOC request not found');
    if (request.status !== 'Approved') {
      return sendResponse(res, 400, 'NOC is not approved yet');
    }

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
    const shareUrl = `${frontendOrigin}/share/noc/${token}`.trim().replace(/[\r\n\s]+/g, '');

    return sendResponse(res, 200, 'Share link generated', { shareUrl });
  } catch (error) {
    console.error('Generate share token error:', error);
    return sendResponse(res, 500, 'Server error');
  }
};

const getSharedPdf = async (req, res) => {
  try {
    const { token } = req.params;
    const [rows] = await promisePool.query(
      `SELECT id
       FROM noc_requests
       WHERE share_token = ?
         AND status = 'Approved'
         AND (share_token_expires_at IS NULL OR share_token_expires_at > NOW())
       LIMIT 1`,
      [token]
    );

    const request = rows.length ? await getRequestRow(rows[0].id) : null;
    if (!request || request.status !== 'Approved') {
      return res.status(404).json({ message: 'NOC request not found or not approved' });
    }

    const societyName = process.env.SOCIETY_NAME || 'Society Management System';
    const html = generateNocHtml(request, societyName);

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${request.request_number}.html"`);
    return res.send(html);
  } catch (error) {
    console.error('Get shared PDF error:', error);
    return res.status(403).send('<h1>Access Denied</h1><p>This share link has expired or is invalid.</p>');
  }
};

const getPublicCertificate = async (req, res) => {
  try {
    const { token } = req.params;
    if (!token || token.length < 16) {
      return res.status(404).json({ message: 'Certificate Not Found or Expired' });
    }

    const [rows] = await promisePool.query(
      `SELECT id
       FROM noc_requests
       WHERE share_token = ?
         AND status = 'Approved'
         AND (share_token_expires_at IS NULL OR share_token_expires_at > NOW())
       LIMIT 1`,
      [token]
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: 'Certificate Not Found or Expired' });
    }

    const request = await getRequestRow(rows[0].id);
    if (!request || request.status !== 'Approved') {
      return res.status(404).json({ message: 'Certificate Not Found or Expired' });
    }

    return res.json({
      society: {
        name: process.env.SOCIETY_NAME || 'Society Management System'
      },
      certificate: {
        request_number: request.request_number,
        noc_type: request.noc_type,
        purpose: request.purpose,
        issue_date: request.approved_at,
        verification_number: request.verification_number || `VERIFY-${request.request_number}`,
        resident_name: request.resident_name,
        flat_no: request.flat_no,
        wing: request.wing,
        floor_no: request.floor_no
      }
    });
  } catch (error) {
    console.error('Get public NOC certificate error:', error);
    return res.status(500).json({ message: 'Unable to load certificate right now' });
  }
};

module.exports = {
  createRequest,
  getRequests,
  getRequestById,
  getSummary,
  markUnderReview,
  approveRequest,
  rejectRequest,
  cancelRequest,
  getTypes,
  createType,
  getPdf,
  generateShareToken,
  getSharedPdf,
  getPublicCertificate
};
