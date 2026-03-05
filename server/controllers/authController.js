const bcrypt = require('bcrypt');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { User } = require('../models');
const { generateToken } = require('../utils/jwt');

const uploadsDir = path.join(__dirname, '..', 'uploads');

function serializeUser(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    profileImage: user.profileImage || null
  };
}

function isLocalUploadPath(imagePath) {
  return typeof imagePath === 'string' && imagePath.startsWith('/uploads/');
}

async function removeLocalProfileImage(imagePath) {
  if (!isLocalUploadPath(imagePath)) {
    return;
  }

  const fileName = path.basename(imagePath);
  if (!fileName) {
    return;
  }

  const filePath = path.join(uploadsDir, fileName);
  try {
    await fs.promises.unlink(filePath);
  } catch (error) {
    if (error.code !== 'ENOENT') {
      throw error;
    }
  }
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

    const token = generateToken({ id: user.id, role: user.role });
    return res.status(201).json({
      message: 'Register berhasil',
      token,
      user: serializeUser(user)
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

    const token = generateToken({ id: user.id, role: user.role });
    return res.status(200).json({
      message: 'Login berhasil',
      token,
      user: serializeUser(user)
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

    const token = generateToken({ id: user.id, role: user.role });
    return res.status(200).json({
      message: 'Login Google berhasil',
      token,
      user: serializeUser(user)
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

async function updateProfilePhoto(req, res, next) {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    if (!req.file) {
      return res.status(400).json({ message: 'Foto profil wajib diunggah' });
    }

    const user = await User.findByPk(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User tidak ditemukan' });
    }

    const oldImage = user.profileImage;
    user.profileImage = `/uploads/${req.file.filename}`;
    await user.save();

    if (oldImage && oldImage !== user.profileImage) {
      await removeLocalProfileImage(oldImage);
    }

    return res.status(200).json({
      message: 'Foto profil berhasil diperbarui',
      user: serializeUser(user)
    });
  } catch (error) {
    return next(error);
  }
}

module.exports = { register, login, me, loginWithGoogle, getGoogleClientConfig, updateProfilePhoto };
