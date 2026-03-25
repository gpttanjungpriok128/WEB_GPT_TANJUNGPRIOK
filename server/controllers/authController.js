const bcrypt = require('bcrypt');
const crypto = require('crypto');
const { User } = require('../models');
const { generateToken } = require('../utils/jwt');
const { clearAuthCookie, setAuthCookie } = require('../utils/authCookie');

function serializeUser(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role
  };
}

function respondWithAuthenticatedUser(req, res, { statusCode, message, user }) {
  const token = generateToken({ id: user.id, role: user.role });
  setAuthCookie(req, res, token);

  return res.status(statusCode).json({
    message,
    user: serializeUser(user)
  });
}

async function register(req, res, next) {
  try {
    const name = req.body.name?.trim();
    const email = req.body.email?.trim().toLowerCase();
    const { password } = req.body;

    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      return res.status(409).json({ message: 'Email sudah terdaftar' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await User.create({ name, email, password: hashedPassword, role: 'jemaat' });

    return respondWithAuthenticatedUser(req, res, {
      statusCode: 201,
      message: 'Register berhasil',
      user
    });
  } catch (error) {
    if (error.name === 'SequelizeUniqueConstraintError') {
      return res.status(409).json({ message: 'Email sudah terdaftar' });
    }
    return next(error);
  }
}

async function login(req, res, next) {
  try {
    const email = req.body.email?.trim().toLowerCase();
    const { password } = req.body;
    const user = await User.findOne({ where: { email } });

    if (!user) {
      return res.status(401).json({ message: 'Email atau password salah' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Email atau password salah' });
    }

    return respondWithAuthenticatedUser(req, res, {
      statusCode: 200,
      message: 'Login berhasil',
      user
    });
  } catch (error) {
    return next(error);
  }
}

async function me(req, res) {
  return res.status(200).json({ user: req.user });
}

function getGoogleClientConfig(req, res) {
  return res.status(200).json({ clientId: process.env.GOOGLE_CLIENT_ID || null });
}

function normalizeGoogleName(googleName, email) {
  if (googleName && googleName.trim()) {
    return googleName.trim();
  }

  if (!email) {
    return 'Pengguna Google';
  }

  const localPart = email.split('@')[0] || 'pengguna';
  return localPart.replace(/[._-]+/g, ' ').trim() || 'Pengguna Google';
}

async function verifyGoogleCredential(credential) {
  const googleClientId = process.env.GOOGLE_CLIENT_ID;
  if (!googleClientId) {
    const configError = new Error('Google login belum dikonfigurasi di server');
    configError.statusCode = 503;
    throw configError;
  }

  const response = await fetch(
    `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(credential)}`
  );

  if (!response.ok) {
    const invalidTokenError = new Error('Token Google tidak valid');
    invalidTokenError.statusCode = 401;
    throw invalidTokenError;
  }

  const payload = await response.json();

  if (payload.aud !== googleClientId) {
    const invalidAudienceError = new Error('Google Client ID tidak cocok');
    invalidAudienceError.statusCode = 401;
    throw invalidAudienceError;
  }

  if (payload.email_verified !== 'true') {
    const unverifiedEmailError = new Error('Email Google belum terverifikasi');
    unverifiedEmailError.statusCode = 401;
    throw unverifiedEmailError;
  }

  const email = payload.email?.trim().toLowerCase();
  if (!email) {
    const invalidPayloadError = new Error('Email Google tidak ditemukan');
    invalidPayloadError.statusCode = 400;
    throw invalidPayloadError;
  }

  return {
    email,
    name: normalizeGoogleName(payload.name, email)
  };
}

async function loginWithGoogle(req, res, next) {
  try {
    const credential = req.body.credential?.trim();
    if (!credential) {
      return res.status(400).json({ message: 'Google credential wajib diisi' });
    }

    const profile = await verifyGoogleCredential(credential);

    let user = await User.findOne({ where: { email: profile.email } });

    if (!user) {
      const generatedPassword = crypto.randomBytes(24).toString('hex');
      const hashedPassword = await bcrypt.hash(generatedPassword, 10);
      user = await User.create({
        name: profile.name,
        email: profile.email,
        password: hashedPassword,
        role: 'jemaat'
      });
    }

    return respondWithAuthenticatedUser(req, res, {
      statusCode: 200,
      message: 'Login Google berhasil',
      user
    });
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({ message: error.message });
    }

    if (error.name === 'SequelizeUniqueConstraintError') {
      return res.status(409).json({ message: 'Email sudah terdaftar' });
    }

    return next(error);
  }
}

function logout(req, res) {
  clearAuthCookie(req, res);
  return res.status(200).json({ message: 'Logout berhasil' });
}

module.exports = { register, login, logout, me, loginWithGoogle, getGoogleClientConfig };
