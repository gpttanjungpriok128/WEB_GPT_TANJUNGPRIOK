const express = require('express');
const {
  createContactMessage,
  getContactMessages,
  markContactMessageRead
} = require('../controllers/contactMessageController');
const { authenticate, authorizeRoles } = require('../middleware/authMiddleware');
const { validate } = require('../middleware/validationMiddleware');
const { createContactMessageValidation } = require('../validators/contactMessageValidator');

const router = express.Router();

router.post('/', createContactMessageValidation, validate, createContactMessage);
router.get('/', authenticate, authorizeRoles('admin'), getContactMessages);
router.put('/:id/read', authenticate, authorizeRoles('admin'), markContactMessageRead);

module.exports = router;
