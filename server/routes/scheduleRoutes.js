const express = require('express');
const {
  getSchedules,
  createSchedule,
  updateSchedule,
  deleteSchedule
} = require('../controllers/scheduleController');
const { authenticate, authorizeRoles } = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/', getSchedules);
router.post('/', authenticate, authorizeRoles('admin'), createSchedule);
router.put('/:id', authenticate, authorizeRoles('admin'), updateSchedule);
router.delete('/:id', authenticate, authorizeRoles('admin'), deleteSchedule);

module.exports = router;
