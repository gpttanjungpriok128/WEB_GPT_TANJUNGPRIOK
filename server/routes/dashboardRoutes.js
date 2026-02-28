const express = require('express');
const { getDashboardStats } = require('../controllers/dashboardController');
const { authenticate, authorizeRoles } = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/stats', authenticate, authorizeRoles('admin'), getDashboardStats);

module.exports = router;
