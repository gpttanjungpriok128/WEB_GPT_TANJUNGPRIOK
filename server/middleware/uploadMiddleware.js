const fs = require('fs');
const path = require('path');
const multer = require('multer');
const { isCloudinaryConfigured } = require('../services/cloudinaryService');

function canPersistUploads() {
  return process.env.NODE_ENV !== 'production' || isCloudinaryConfigured();
}

const uploadDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${Date.now()}-${file.originalname.replace(/\s+/g, '-')}`;
    cb(null, uniqueName);
  }
});

const fileFilter = (req, file, cb) => {
  const allowed = ['image/jpeg', 'image/png', 'image/webp'];
  if (!allowed.includes(file.mimetype)) {
    return cb(new Error('Invalid image type. Allowed: jpeg/png/webp'), false);
  }
  cb(null, true);
};

const uploadImage = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 } // Increased to 5MB for better quality
});

function requirePersistentUploadStorage(req, res, next) {
  const contentType = String(req.headers['content-type'] || '').toLowerCase();
  const isMultipartRequest = contentType.includes('multipart/form-data');

  if (!isMultipartRequest || canPersistUploads()) {
    return next();
  }

  return res.status(503).json({
    message: 'Upload gambar belum tersedia di production. Konfigurasikan Cloudinary terlebih dahulu.'
  });
}

module.exports = {
  canPersistUploads,
  requirePersistentUploadStorage,
  uploadImage
};
