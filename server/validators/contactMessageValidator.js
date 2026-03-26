const { body } = require('express-validator');

const createContactMessageValidation = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Nama lengkap wajib diisi')
    .isLength({ min: 2, max: 80 })
    .withMessage('Nama lengkap harus 2 - 80 karakter'),
  body('email')
    .trim()
    .normalizeEmail()
    .isEmail()
    .withMessage('Email tidak valid'),
  body('subject')
    .trim()
    .notEmpty()
    .withMessage('Subjek wajib diisi')
    .isLength({ min: 3, max: 120 })
    .withMessage('Subjek harus 3 - 120 karakter'),
  body('message')
    .trim()
    .notEmpty()
    .withMessage('Pesan wajib diisi')
    .isLength({ min: 10, max: 2000 })
    .withMessage('Pesan harus 10 - 2000 karakter')
];

module.exports = { createContactMessageValidation };
