const { body } = require('express-validator');

const allowedCategories = ['kaum_pria', 'kaum_wanita', 'kaum_muda', 'sekolah_minggu'];

const createCongregationMemberValidation = [
  body('fullName').trim().notEmpty().withMessage('Nama lengkap wajib diisi'),
  body('birthDate')
    .trim()
    .notEmpty()
    .withMessage('Tanggal lahir wajib diisi')
    .bail()
    .isISO8601()
    .withMessage('Tanggal lahir harus berformat YYYY-MM-DD'),
  body('category').isIn(allowedCategories).withMessage('Kategori jemaat tidak valid'),
  body('phone')
    .optional({ values: 'falsy' })
    .trim()
    .isLength({ max: 30 })
    .withMessage('Nomor telepon maksimal 30 karakter'),
  body('address')
    .trim()
    .notEmpty()
    .withMessage('Alamat wajib diisi')
    .bail()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Alamat maksimal 1000 karakter')
];

const updateCongregationMemberValidation = createCongregationMemberValidation;

module.exports = {
  createCongregationMemberValidation,
  updateCongregationMemberValidation
};
