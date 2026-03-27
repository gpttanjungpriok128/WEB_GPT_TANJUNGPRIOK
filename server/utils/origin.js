function normalizeOrigin(value = '') {
  const raw = String(value || '').trim();
  if (!raw) {
    return '';
  }

  try {
    return new URL(raw).origin.toLowerCase();
  } catch {
    return raw.replace(/\/+$/, '').toLowerCase();
  }
}

function getAllowedClientOrigins() {
  const configuredOrigins = String(process.env.CLIENT_URL || '')
    .split(',')
    .map(normalizeOrigin)
    .filter(Boolean);

  const localDevOrigins = ['http://localhost:5173', 'http://localhost:5174']
    .map(normalizeOrigin)
    .filter(Boolean);

  return [...new Set([...configuredOrigins, ...localDevOrigins])];
}

function isAllowedClientOrigin(value = '') {
  const normalizedOrigin = normalizeOrigin(value);
  if (!normalizedOrigin) {
    return false;
  }

  return getAllowedClientOrigins().includes(normalizedOrigin);
}

function getRequestOrigin(req) {
  const originHeader = normalizeOrigin(req?.headers?.origin);
  if (originHeader) {
    return originHeader;
  }

  return normalizeOrigin(req?.headers?.referer);
}

module.exports = {
  normalizeOrigin,
  getAllowedClientOrigins,
  isAllowedClientOrigin,
  getRequestOrigin
};
