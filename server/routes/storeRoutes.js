const express = require('express');
const {
  getPublicProducts,
  getPublicProductBySlug,
  getProductReviews,
  createProductReview,
  createOrder,
  getMyOrders,
  trackPublicOrder,
  getAdminProducts,
  createAdminProduct,
  updateAdminProduct,
  deleteAdminProduct,
  getAdminOrders,
  getAdminRevenueReport,
  resetAdminOrders,
  updateAdminOrderStatus,
  getAdminReviews,
  updateAdminReviewStatus,
  deleteAdminReview,
  getAdminSettings,
  updateAdminSettings,
  getAdminAnalytics
} = require('../controllers/storeController');
const { authenticate, optionalAuthenticate, authorizeRoles } = require('../middleware/authMiddleware');
const { uploadImage } = require('../middleware/uploadMiddleware');
const { validate } = require('../middleware/validationMiddleware');
const {
  createOrderValidation,
  createReviewValidation,
  createProductValidation,
  updateProductValidation,
  updateStoreSettingsValidation,
  updateOrderStatusValidation,
  updateReviewStatusValidation
} = require('../validators/storeValidator');

const router = express.Router();

router.get('/products', getPublicProducts);
router.get('/products/:slug', getPublicProductBySlug);
router.get('/products/:slug/reviews', getProductReviews);
router.post(
  '/products/:slug/reviews',
  optionalAuthenticate,
  createReviewValidation,
  validate,
  createProductReview
);
router.post('/orders', optionalAuthenticate, createOrderValidation, validate, createOrder);
router.get('/orders/track', trackPublicOrder);
router.get('/my-orders', authenticate, getMyOrders);

router.get('/admin/products', authenticate, authorizeRoles('admin'), getAdminProducts);
router.post('/admin/products', authenticate, authorizeRoles('admin'), uploadImage.array('images', 8), createProductValidation, validate, createAdminProduct);
router.put('/admin/products/:id', authenticate, authorizeRoles('admin'), uploadImage.array('images', 8), updateProductValidation, validate, updateAdminProduct);
router.delete('/admin/products/:id', authenticate, authorizeRoles('admin'), deleteAdminProduct);
router.get('/admin/orders', authenticate, authorizeRoles('admin'), getAdminOrders);
router.get('/admin/reports/revenue', authenticate, authorizeRoles('admin'), getAdminRevenueReport);
router.post('/admin/orders/reset', authenticate, authorizeRoles('admin'), resetAdminOrders);
router.patch('/admin/orders/:id/status', authenticate, authorizeRoles('admin'), updateOrderStatusValidation, validate, updateAdminOrderStatus);
router.get('/admin/reviews', authenticate, authorizeRoles('admin'), getAdminReviews);
router.patch('/admin/reviews/:id', authenticate, authorizeRoles('admin'), updateReviewStatusValidation, validate, updateAdminReviewStatus);
router.delete('/admin/reviews/:id', authenticate, authorizeRoles('admin'), deleteAdminReview);
router.get('/admin/settings', authenticate, authorizeRoles('admin'), getAdminSettings);
router.patch('/admin/settings', authenticate, authorizeRoles('admin'), updateStoreSettingsValidation, validate, updateAdminSettings);
router.get('/admin/analytics', authenticate, authorizeRoles('admin'), getAdminAnalytics);

module.exports = router;
