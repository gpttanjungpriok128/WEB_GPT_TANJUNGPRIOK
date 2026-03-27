const { User } = require('../models');
const { AUTH_COOKIE_NAME } = require('../utils/authCookie');
const { verifyToken } = require('../utils/jwt');
const { getRequestOrigin, isAllowedClientOrigin } = require('../utils/origin');

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

function parseCookies(headerValue = '') {
  return String(headerValue)
    .split(';')
    .map((entry) => entry.trim())
    .filter(Boolean)
    .reduce((cookies, entry) => {
      const separatorIndex = entry.indexOf('=');
      if (separatorIndex <= 0) {
        return cookies;
      }

      const key = entry.slice(0, separatorIndex).trim();
      const value = entry.slice(separatorIndex + 1).trim();
      cookies[key] = decodeURIComponent(value);
      return cookies;
    }, {});
}

function getBearerToken(req) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  return authHeader.slice('Bearer '.length).trim() || null;
}

function getTokenFromRequest(req) {
  const bearerToken = getBearerToken(req);
  if (bearerToken) {
    return { token: bearerToken, source: 'bearer' };
  }

  const cookies = parseCookies(req.headers.cookie);
  const cookieToken = cookies[AUTH_COOKIE_NAME] || null;
  return {
    token: cookieToken,
    source: cookieToken ? 'cookie' : null
  };
}

function isSafeMethod(method) {
  return SAFE_METHODS.has(String(method || '').toUpperCase());
}

function hasTrustedMutationHeader(req) {
  return String(req?.headers?.['x-requested-with'] || '').trim().toLowerCase() === 'xmlhttprequest';
}

function getTrustedMutationError(req, authSource) {
  if (authSource !== 'cookie' || isSafeMethod(req?.method)) {
    return null;
  }

  const requestOrigin = getRequestOrigin(req);
  if (requestOrigin && isAllowedClientOrigin(requestOrigin)) {
    return null;
  }

  if (hasTrustedMutationHeader(req)) {
    return null;
  }

  const error = new Error('Forbidden: cross-site state-changing request blocked');
  error.statusCode = 403;
  return error;
}

async function resolveAuthenticatedUser(req) {
  const { token, source } = getTokenFromRequest(req);
  if (!token) {
    return null;
  }

  const payload = verifyToken(token);
  const user = await User.findByPk(payload.id, { attributes: ['id', 'name', 'email', 'role'] });

  if (!user) {
    const error = new Error('Invalid token user');
    error.statusCode = 401;
    throw error;
  }

  return { user, source };
}

async function authenticate(req, res, next) {
  try {
    const auth = await resolveAuthenticatedUser(req);
    if (!auth) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const trustError = getTrustedMutationError(req, auth.source);
    if (trustError) {
      return res.status(trustError.statusCode).json({ message: trustError.message });
    }

    req.user = auth.user;
    req.authSource = auth.source;
    return next();
  } catch (error) {
    if (error.statusCode === 403) {
      return res.status(403).json({ message: error.message });
    }

    return res.status(401).json({ message: 'Invalid or expired token' });
  }
}

async function optionalAuthenticate(req, res, next) {
  try {
    const auth = await resolveAuthenticatedUser(req);

    if (auth) {
      const trustError = getTrustedMutationError(req, auth.source);
      if (trustError) {
        return res.status(trustError.statusCode).json({ message: trustError.message });
      }

      req.user = auth.user;
      req.authSource = auth.source;
    }

    return next();
  } catch (error) {
    if (error.statusCode === 403) {
      return res.status(403).json({ message: error.message });
    }

    return next();
  }
}

function authorizeRoles(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Forbidden: insufficient role' });
    }
    next();
  };
}

module.exports = {
  authenticate,
  optionalAuthenticate,
  authorizeRoles,
  getTrustedMutationError
};
