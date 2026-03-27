const express = require('express');
const {
  createPrayerRequest,
  getPrayerRequests,
  markPrayerRequestRead,
  completePrayerRequest,
  deletePrayerRequest
} = require('../controllers/prayerRequestController');
const { authenticate, authorizeRoles } = require('../middleware/authMiddleware');
const { validate } = require('../middleware/validationMiddleware');
const { createPrayerRequestValidation } = require('../validators/prayerRequestValidator');

const router = express.Router();

router.post('/', createPrayerRequestValidation, validate, createPrayerRequest);
router.get('/', authenticate, authorizeRoles('admin'), getPrayerRequests);
router.put('/:id/read', authenticate, authorizeRoles('admin'), markPrayerRequestRead);
router.put('/:id/complete', authenticate, authorizeRoles('admin'), completePrayerRequest);
router.delete('/:id', authenticate, authorizeRoles('admin'), deletePrayerRequest);

module.exports = router;
