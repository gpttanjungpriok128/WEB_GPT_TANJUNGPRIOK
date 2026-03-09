const fs = require('fs');
const path = require('path');
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || 'dxxxxxxxxxxx',
  api_key: process.env.CLOUDINARY_API_KEY || 'xxxxxxxxx',
  api_secret: process.env.CLOUDINARY_API_SECRET || 'xxxxxxxxxxxxxxxxxxx'
});

// Fallback to local storage if Cloudinary is not configured
const isCloudinaryConfigured = () => {
  const { cloud_name, api_key, api_secret } = cloudinary.config();
  return cloud_name && !cloud_name.includes('dxxxxxxxxxxx') &&
    api_key && !api_key.includes('xxxxxxxxx') &&
    api_secret && !api_secret.includes('xxxxxxxxxxxxxxxxxxx');
};

// Create local upload directory as fallback
const uploadDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Determine which storage to use
const storage = isCloudinaryConfigured()
  ? new CloudinaryStorage({
      cloudinary,
      params: {
        folder: 'gpt-tanjungpriok/products',
        resource_type: 'auto',
        quality: 'auto',
        transformation: [
          { width: 1200, height: 1200, crop: 'limit', quality: 'auto' }
        ]
      }
    })
  : multer.diskStorage({
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

module.exports = { uploadImage, cloudinary };
