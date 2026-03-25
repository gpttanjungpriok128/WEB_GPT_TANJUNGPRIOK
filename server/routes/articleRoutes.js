const express = require('express');
const {
  getArticles,
  getManageArticles,
  getArticleById,
  createArticle,
  updateArticle,
  reviewArticle,
  deleteArticle
} = require('../controllers/articleController');
const { authenticate, optionalAuthenticate, authorizeRoles } = require('../middleware/authMiddleware');
const { cacheResponse } = require('../middleware/cacheMiddleware');
const { requirePersistentUploadStorage, uploadImage } = require('../middleware/uploadMiddleware');
const { validate } = require('../middleware/validationMiddleware');
const { articleValidation } = require('../validators/articleValidator');

const router = express.Router();

router.get('/', cacheResponse({ ttlMs: 60 * 1000 }), getArticles);
router.get('/manage', authenticate, authorizeRoles('admin', 'multimedia'), getManageArticles);
router.get('/:id', cacheResponse({ ttlMs: 60 * 1000 }), optionalAuthenticate, getArticleById);
router.post('/', authenticate, authorizeRoles('admin', 'multimedia'), requirePersistentUploadStorage, uploadImage.single('image'), articleValidation, validate, createArticle);
router.put('/:id', authenticate, authorizeRoles('admin', 'multimedia'), requirePersistentUploadStorage, uploadImage.single('image'), updateArticle);
router.patch('/:id/review', authenticate, authorizeRoles('admin'), reviewArticle);
router.delete('/:id', authenticate, authorizeRoles('admin', 'multimedia'), deleteArticle);

module.exports = router;
