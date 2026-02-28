const express = require('express');
const {
  getGalleries,
  createGallery,
  updateGallery,
  deleteGallery
} = require('../controllers/galleryController');
const { authenticate, authorizeRoles } = require('../middleware/authMiddleware');
const { uploadImage } = require('../middleware/uploadMiddleware');

const router = express.Router();

router.get('/', getGalleries);
router.post(
  '/',
  authenticate,
  authorizeRoles('admin', 'multimedia'),
  uploadImage.fields([
    { name: 'images', maxCount: 20 },
    { name: 'image', maxCount: 1 }
  ]),
  createGallery
);
router.put('/:id', authenticate, authorizeRoles('admin'), uploadImage.single('image'), updateGallery);
router.delete('/:id', authenticate, authorizeRoles('admin'), deleteGallery);

module.exports = router;
