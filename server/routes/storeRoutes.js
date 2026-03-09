const express = require('express');
const {
  getPublicProducts,
  getPublicProductBySlug,
  createOrder,
  getMyOrders,
  trackPublicOrder,
  getAdminProducts,
  createAdminProduct,
  updateAdminProduct,
  deleteAdminProduct,
  getAdminOrders,
  updateAdminOrderStatus,
  getAdminSettings,
  updateAdminSettings,
  getAdminAnalytics
} = require('../controllers/storeController');
const { authenticate, optionalAuthenticate, authorizeRoles } = require('../middleware/authMiddleware');
const { uploadImage } = require('../middleware/uploadMiddleware');
const { validate } = require('../middleware/validationMiddleware');
const {
  createOrderValidation,
  createProductValidation,
  updateProductValidation,
  updateStoreSettingsValidation,
  updateOrderStatusValidation
} = require('../validators/storeValidator');

const router = express.Router();

router.get('/products', getPublicProducts);
router.get('/products/:slug', getPublicProductBySlug);
router.post('/orders', optionalAuthenticate, createOrderValidation, validate, createOrder);
router.get('/orders/track', trackPublicOrder);
router.get('/my-orders', authenticate, getMyOrders);

router.get('/admin/products', authenticate, authorizeRoles('admin'), getAdminProducts);
router.post('/admin/products', authenticate, authorizeRoles('admin'), uploadImage.array('images', 8), createProductValidation, validate, createAdminProduct);
router.put('/admin/products/:id', authenticate, authorizeRoles('admin'), uploadImage.array('images', 8), updateProductValidation, validate, updateAdminProduct);
router.delete('/admin/products/:id', authenticate, authorizeRoles('admin'), deleteAdminProduct);
router.get('/admin/orders', authenticate, authorizeRoles('admin'), getAdminOrders);
router.patch('/admin/orders/:id/status', authenticate, authorizeRoles('admin'), updateOrderStatusValidation, validate, updateAdminOrderStatus);
router.get('/admin/settings', authenticate, authorizeRoles('admin'), getAdminSettings);
router.patch('/admin/settings', authenticate, authorizeRoles('admin'), updateStoreSettingsValidation, validate, updateAdminSettings);
router.get('/admin/analytics', authenticate, authorizeRoles('admin'), getAdminAnalytics);

module.exports = router;
