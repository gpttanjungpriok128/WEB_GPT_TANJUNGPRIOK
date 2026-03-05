const express = require('express');
const {
  register,
  login,
  me,
  loginWithGoogle,
  getGoogleClientConfig,
  updateProfilePhoto
} = require('../controllers/authController');
const { authenticate } = require('../middleware/authMiddleware');
const { uploadImage } = require('../middleware/uploadMiddleware');
const { validate } = require('../middleware/validationMiddleware');
const {
  registerValidation,
  loginValidation,
  googleLoginValidation
} = require('../validators/authValidator');

const router = express.Router();

router.post('/register', registerValidation, validate, register);
router.post('/login', loginValidation, validate, login);
router.post('/google', googleLoginValidation, validate, loginWithGoogle);
router.get('/google/client', getGoogleClientConfig);
router.get('/me', authenticate, me);
router.put('/profile-photo', authenticate, uploadImage.single('photo'), updateProfilePhoto);

module.exports = router;
