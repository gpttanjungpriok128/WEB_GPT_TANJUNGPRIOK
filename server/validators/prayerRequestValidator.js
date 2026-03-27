const { body, validationResult } = require('express-validator');

const createPrayerRequestValidation = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Nama Anda wajib diisi')
    .isLength({ min: 2, max: 80 })
    .withMessage('Nama harus 2 - 80 karakter'),
  body('request')
    .trim()
    .notEmpty()
    .withMessage('Permohonan doa wajib diisi')
    .isLength({ min: 10, max: 2000 })
    .withMessage('Permohonan doa harus 10 - 2000 karakter')
];

module.exports = { createPrayerRequestValidation };
