const jwt = require('jsonwebtoken');
const { promisePool, runWithRequestDatabaseContext, setRequestSocietyId } = require('../config/database');

const databaseContext = (req, res, next) => {
  // Defer database role configuration until auth/public-auth chooses the
  // correct context. This avoids an unused round-trip on every request.
  runWithRequestDatabaseContext({ defer: true }, req, res, next).catch((error) => {
    console.error('Database request context error:', error);
    if (!res.headersSent) res.status(500).json({ message: 'Unable to initialize secure request context' });
  });
};

const publicAuthDatabaseContext = (req, res, next) => {
  runWithRequestDatabaseContext({ bypass: true }, req, res, next).catch((error) => {
    console.error('Public authentication context error:', error);
    if (!res.headersSent) res.status(500).json({ message: 'Unable to initialize authentication' });
  });
};

const auth = (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    if (!token) return res.status(401).json({ message: 'No token, authorization denied' });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    // The outer databaseContext already owns a clean request connection. Read
    // the server-owned user record first, then configure the final tenant role
    // once. This removes an unnecessary bypass-role round trip per API call.
    runWithRequestDatabaseContext({ defer: true }, req, res, async () => {
      try {
        const [users] = await promisePool.query(
          `SELECT id, email, role, status, society_id
           FROM users WHERE id = ? LIMIT 1`,
          [decoded.id]
        );
        const user = users[0];
        if (!user || (user.status && user.status !== 'approved')) {
          return res.status(401).json({ message: 'Account is unavailable or no longer approved' });
        }
        const isSuperAdmin = user.role === 'super_admin';
        if (isSuperAdmin && user.society_id != null) {
          return res.status(401).json({ message: 'Super Admin tenant scope is invalid' });
        }
        if (!isSuperAdmin && (user.society_id == null || Number(decoded.societyId) !== Number(user.society_id))) {
          return res.status(401).json({ message: 'Token tenant is no longer valid' });
        }
        if (!isSuperAdmin) {
          await setRequestSocietyId(user.society_id);
        } else {
          await runWithRequestDatabaseContext({ bypass: true }, req, res, () => {});
        }
        req.user = {
          ...decoded,
          id: user.id,
          email: user.email,
          role: user.role,
          societyId: isSuperAdmin ? null : Number(user.society_id),
          society_id: isSuperAdmin ? null : Number(user.society_id)
        };
        // Tenant identity is server-owned. Remove client attempts to influence it
        // before any controller sees the request.
        if (req.body && typeof req.body === 'object') {
          delete req.body.societyId;
          delete req.body.society_id;
        }
        if (req.query && typeof req.query === 'object') {
          delete req.query.societyId;
          delete req.query.society_id;
        }
        next();
      } catch (error) {
        console.error('Tenant authentication error:', error);
        if (!res.headersSent) res.status(401).json({ message: 'Token tenant could not be verified' });
      }
    }).catch((error) => {
      console.error('Authentication database context error:', error);
      if (!res.headersSent) res.status(500).json({ message: 'Unable to initialize authentication context' });
    });
  } catch (error) {
    res.status(401).json({ message: 'Token is not valid' });
  }
};

const adminAuth = (req, res, next) => {
  const authorize = () => {
    if (req.user.role !== 'admin' && req.user.role !== 'super_admin') {
      return res.status(403).json({ message: 'Access denied. Admin only.' });
    }
    next();
  };
  if (req.user) return authorize();
  auth(req, res, authorize);
};

const superAdminAuth = (req, res, next) => {
  const authorize = () => {
    if (req.user.role !== 'super_admin') {
      return res.status(403).json({ message: 'Access denied. Super Admin only.' });
    }
    next();
  };
  if (req.user) return authorize();
  auth(req, res, authorize);
};

const tenantUploadAccess = (req, res, next) => {
  const normalized = String(req.path || '').replace(/\\/g, '/');
  const match = normalized.match(/^\/societies\/(\d+)\//i);
  if (match && Number(match[1]) !== Number(req.user.societyId)) {
    return res.status(404).json({ message: 'File not found' });
  }
  // Files created before multi-tenancy belong to the migrated Mahalaxmi tenant.
  if (!match && Number(req.user.societyId) !== 1) {
    return res.status(404).json({ message: 'File not found' });
  }
  next();
};

module.exports = { auth, adminAuth, superAdminAuth, databaseContext, publicAuthDatabaseContext, tenantUploadAccess };
