const fs = require('fs');
const path = require('path');

const getPublicBackendOrigin = (req) => {
  const configured = process.env.BACKEND_PUBLIC_URL || process.env.PUBLIC_BACKEND_URL || process.env.API_BASE_URL;
  if (configured) return configured.replace(/\/api\/?$/, '').replace(/\/$/, '');

  const forwardedProto = String(req?.headers?.['x-forwarded-proto'] || '').split(',')[0].trim();
  const protocol = forwardedProto || req?.protocol || 'https';
  const host = req?.get?.('host') || req?.headers?.host;
  return host ? `${protocol}://${host}` : '';
};

const normalizeUploadPath = (filePath) => {
  if (!filePath) return null;
  const value = String(filePath).trim();
  if (!value) return null;
  if (/^(data:|blob:|content:)/i.test(value)) return value;
  if (/^https?:\/\//i.test(value)) {
    return value.replace(/^http:\/\/([^/]*railway\.app)/i, 'https://$1');
  }

  const normalized = value.replace(/\\/g, '/');
  const uploadsMatch = normalized.match(/\/?uploads\/.+$/i);
  if (uploadsMatch) return uploadsMatch[0].startsWith('/') ? uploadsMatch[0] : `/${uploadsMatch[0]}`;
  return normalized.startsWith('/') ? normalized : `/${normalized}`;
};

const uploadFileExists = (filePath, rootDir = path.resolve(__dirname, '..')) => {
  const normalized = normalizeUploadPath(filePath);
  if (!normalized || /^(https?:|data:|blob:|content:)/i.test(normalized)) return Boolean(normalized);
  if (!normalized.startsWith('/uploads/')) return true;
  return fs.existsSync(path.join(rootDir, normalized.replace(/^\/+/, '')));
};

const buildPublicFileUrl = (req, filePath, options = {}) => {
  const normalized = normalizeUploadPath(filePath);
  if (!normalized) return null;
  if (/^(https?:|data:|blob:|content:)/i.test(normalized)) return normalized;
  if (options.mustExist && !uploadFileExists(normalized, options.rootDir)) return null;

  const baseUrl = getPublicBackendOrigin(req);
  return baseUrl ? `${baseUrl}${normalized.startsWith('/') ? '' : '/'}${normalized}` : normalized;
};

module.exports = {
  buildPublicFileUrl,
  getPublicBackendOrigin,
  normalizeUploadPath,
  uploadFileExists
};
