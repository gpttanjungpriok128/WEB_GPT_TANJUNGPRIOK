const { User } = require('../models');
const { AUTH_COOKIE_NAME } = require('../utils/authCookie');
const { verifyToken } = require('../utils/jwt');

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
    return bearerToken;
  }

  const cookies = parseCookies(req.headers.cookie);
  return cookies[AUTH_COOKIE_NAME] || null;
}

async function resolveAuthenticatedUser(req) {
  const token = getTokenFromRequest(req);
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

  return user;
}

async function authenticate(req, res, next) {
  try {
    const user = await resolveAuthenticatedUser(req);
    if (!user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    req.user = user;
    return next();
  } catch (error) {
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
}

async function optionalAuthenticate(req, res, next) {
  try {
    const user = await resolveAuthenticatedUser(req);

    if (user) {
      req.user = user;
    }

    return next();
  } catch (error) {
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

module.exports = { authenticate, optionalAuthenticate, authorizeRoles };
