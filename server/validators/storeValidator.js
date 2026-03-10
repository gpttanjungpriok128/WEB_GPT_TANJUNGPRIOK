const { body } = require('express-validator');

const PROMO_TYPES = ['none', 'percentage', 'fixed'];
const ORDER_STATUSES = ['new', 'confirmed', 'packed', 'completed', 'cancelled'];

const createOrderValidation = [
  body('name').trim().notEmpty().withMessage('Nama pemesan wajib diisi'),
  body('phone').trim().notEmpty().withMessage('Nomor WhatsApp wajib diisi'),
  body('address').trim().notEmpty().withMessage('Alamat pengiriman wajib diisi'),
  body('shippingMethod').optional().trim().isLength({ min: 2 }).withMessage('Metode pengiriman tidak valid'),
  body('paymentMethod').optional().trim().isLength({ min: 2 }).withMessage('Metode pembayaran tidak valid'),
  body('notes').optional().isString().withMessage('Catatan tidak valid'),
  body('items').isArray({ min: 1 }).withMessage('Items pesanan minimal 1 produk'),
  body('items.*.productId').isInt({ min: 1 }).withMessage('productId item tidak valid'),
  body('items.*.size').trim().notEmpty().withMessage('Ukuran item wajib diisi'),
  body('items.*.quantity').isInt({ min: 1, max: 99 }).withMessage('Jumlah item harus 1 - 99')
];

const createProductValidation = [
  body('name').trim().notEmpty().withMessage('Nama produk wajib diisi'),
  body('slug').optional().trim().isLength({ min: 3 }).withMessage('Slug produk minimal 3 karakter'),
  body('description').optional().isString().withMessage('Deskripsi tidak valid'),
  body('verse').optional().isString().withMessage('Ayat tidak valid'),
  body('color').optional().isString().withMessage('Warna tidak valid'),
  body('imageUrl').optional().isString().withMessage('URL gambar tidak valid'),
  body('basePrice').isInt({ min: 0 }).withMessage('Harga produk harus angka >= 0'),
  body('stock').optional().isInt({ min: 0 }).withMessage('Stok harus angka >= 0'),
  body('promoType')
    .optional()
    .isIn(PROMO_TYPES)
    .withMessage('Jenis promo tidak valid'),
  body('promoValue').optional().isInt({ min: 0 }).withMessage('Nilai promo tidak valid'),
  body('promoStartAt').optional({ nullable: true, checkFalsy: true }).isISO8601().withMessage('Tanggal mulai promo tidak valid'),
  body('promoEndAt').optional({ nullable: true, checkFalsy: true }).isISO8601().withMessage('Tanggal akhir promo tidak valid'),
  body('sizes')
    .optional()
    .custom((value) => {
      if (Array.isArray(value)) return true;
      if (typeof value === 'string') return true;
      throw new Error('Ukuran produk harus array atau teks dipisah koma');
    }),
  body('stockBySize')
    .optional()
    .custom((value) => {
      if (value === null || value === undefined || value === '') return true;
      if (typeof value === 'string') {
        try {
          const parsed = JSON.parse(value);
          if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) return true;
        } catch {
          throw new Error('Stok per ukuran harus format JSON object');
        }
      }
      if (value && typeof value === 'object' && !Array.isArray(value)) return true;
      throw new Error('Stok per ukuran tidak valid');
    }),
  body('isActive').optional().custom((value) => {
    if (typeof value === 'boolean') return true;
    if (['true', 'false', '1', '0'].includes(String(value).toLowerCase())) return true;
    throw new Error('Status aktif tidak valid');
  })
];

const updateProductValidation = [
  body('name').optional().trim().notEmpty().withMessage('Nama produk tidak boleh kosong'),
  body('slug').optional().trim().isLength({ min: 3 }).withMessage('Slug produk minimal 3 karakter'),
  body('description').optional().isString().withMessage('Deskripsi tidak valid'),
  body('verse').optional().isString().withMessage('Ayat tidak valid'),
  body('color').optional().isString().withMessage('Warna tidak valid'),
  body('imageUrl').optional().isString().withMessage('URL gambar tidak valid'),
  body('basePrice').optional().isInt({ min: 0 }).withMessage('Harga produk harus angka >= 0'),
  body('stock').optional().isInt({ min: 0 }).withMessage('Stok harus angka >= 0'),
  body('promoType')
    .optional()
    .isIn(PROMO_TYPES)
    .withMessage('Jenis promo tidak valid'),
  body('promoValue').optional().isInt({ min: 0 }).withMessage('Nilai promo tidak valid'),
  body('promoStartAt').optional({ nullable: true, checkFalsy: true }).isISO8601().withMessage('Tanggal mulai promo tidak valid'),
  body('promoEndAt').optional({ nullable: true, checkFalsy: true }).isISO8601().withMessage('Tanggal akhir promo tidak valid'),
  body('sizes')
    .optional()
    .custom((value) => {
      if (Array.isArray(value)) return true;
      if (typeof value === 'string') return true;
      throw new Error('Ukuran produk harus array atau teks dipisah koma');
    }),
  body('stockBySize')
    .optional()
    .custom((value) => {
      if (value === null || value === undefined || value === '') return true;
      if (typeof value === 'string') {
        try {
          const parsed = JSON.parse(value);
          if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) return true;
        } catch {
          throw new Error('Stok per ukuran harus format JSON object');
        }
      }
      if (value && typeof value === 'object' && !Array.isArray(value)) return true;
      throw new Error('Stok per ukuran tidak valid');
    }),
  body('isActive').optional().custom((value) => {
    if (typeof value === 'boolean') return true;
    if (['true', 'false', '1', '0'].includes(String(value).toLowerCase())) return true;
    throw new Error('Status aktif tidak valid');
  })
];

const updateOrderStatusValidation = [
  body('status')
    .trim()
    .isIn(ORDER_STATUSES)
    .withMessage('Status order tidak valid')
];

const updateReviewStatusValidation = [
  body('isApproved')
    .optional()
    .custom((value) => {
      if (typeof value === 'boolean') return true;
      if (['true', 'false', '1', '0'].includes(String(value).toLowerCase())) return true;
      throw new Error('Status ulasan tidak valid');
    })
];

const updateStoreSettingsValidation = [
  body('shippingCost')
    .isInt({ min: 0 })
    .withMessage('Ongkir harus angka >= 0')
];

const createReviewValidation = [
  body('orderCode').trim().notEmpty().withMessage('Kode pesanan wajib diisi'),
  body('phone').trim().notEmpty().withMessage('Nomor WhatsApp wajib diisi'),
  body('rating').isInt({ min: 1, max: 5 }).withMessage('Rating harus 1 - 5'),
  body('reviewText')
    .optional({ nullable: true, checkFalsy: true })
    .isLength({ max: 500 })
    .withMessage('Ulasan maksimal 500 karakter')
];

module.exports = {
  createOrderValidation,
  createProductValidation,
  updateProductValidation,
  updateStoreSettingsValidation,
  updateOrderStatusValidation,
  updateReviewStatusValidation,
  createReviewValidation
};
