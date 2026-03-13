const express = require('express');
const {
  getSchedules,
  createSchedule,
  updateSchedule,
  deleteSchedule
} = require('../controllers/scheduleController');
const { authenticate, authorizeRoles } = require('../middleware/authMiddleware');
const { cacheResponse } = require('../middleware/cacheMiddleware');

const router = express.Router();

router.get('/', cacheResponse({ ttlMs: 5 * 60 * 1000 }), getSchedules);
router.post('/', authenticate, authorizeRoles('admin'), createSchedule);
router.put('/:id', authenticate, authorizeRoles('admin'), updateSchedule);
router.delete('/:id', authenticate, authorizeRoles('admin'), deleteSchedule);

module.exports = router;
