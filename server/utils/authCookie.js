const AUTH_COOKIE_NAME = process.env.AUTH_COOKIE_NAME || 'gpt_auth_session';
const DEFAULT_COOKIE_MAX_AGE_MS = 24 * 60 * 60 * 1000;

function parseDurationToMs(value) {
  if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
    return value * 1000;
  }

  const raw = String(value || '').trim().toLowerCase();
  if (!raw) {
    return DEFAULT_COOKIE_MAX_AGE_MS;
  }

  if (/^\d+$/.test(raw)) {
    return Number(raw) * 1000;
  }

  const match = raw.match(/^(\d+)(ms|s|m|h|d)$/);
  if (!match) {
    return DEFAULT_COOKIE_MAX_AGE_MS;
  }

  const amount = Number(match[1]);
  const unit = match[2];
  const multiplier = {
    ms: 1,
    s: 1000,
    m: 60 * 1000,
    h: 60 * 60 * 1000,
    d: 24 * 60 * 60 * 1000
  }[unit];

  return amount * multiplier;
}

function shouldUseSecureCookie(req) {
  if (process.env.NODE_ENV === 'production') {
    return true;
  }

  const forwardedProto = String(req?.headers?.['x-forwarded-proto'] || '')
    .split(',')[0]
    .trim()
    .toLowerCase();

  return Boolean(req?.secure || forwardedProto === 'https');
}

function buildAuthCookieOptions(req) {
  const secure = shouldUseSecureCookie(req);

  return {
    httpOnly: true,
    secure,
    sameSite: secure ? 'none' : 'lax',
    path: '/',
    maxAge: parseDurationToMs(process.env.JWT_EXPIRES_IN)
  };
}

function setAuthCookie(req, res, token) {
  res.cookie(AUTH_COOKIE_NAME, token, buildAuthCookieOptions(req));
}

function clearAuthCookie(req, res) {
  const { maxAge, ...cookieOptions } = buildAuthCookieOptions(req);
  res.clearCookie(AUTH_COOKIE_NAME, cookieOptions);
}

module.exports = {
  AUTH_COOKIE_NAME,
  buildAuthCookieOptions,
  clearAuthCookie,
  setAuthCookie
};
