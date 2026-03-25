const express = require('express');
const {
  register,
  login,
  logout,
  me,
  loginWithGoogle,
  getGoogleClientConfig
} = require('../controllers/authController');
const { authenticate } = require('../middleware/authMiddleware');
const { validate } = require('../middleware/validationMiddleware');
const {
  registerValidation,
  loginValidation,
  googleLoginValidation
} = require('../validators/authValidator');

const router = express.Router();

router.post('/register', registerValidation, validate, register);
router.post('/login', loginValidation, validate, login);
router.post('/logout', logout);
router.post('/google', googleLoginValidation, validate, loginWithGoogle);
router.get('/google/client', getGoogleClientConfig);
router.get('/me', authenticate, me);

module.exports = router;
