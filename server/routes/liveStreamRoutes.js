const express = require('express');
const { getLiveStreamLink, updateLiveStreamLink } = require('../controllers/liveStreamController');
const { authenticate, authorizeRoles } = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/', getLiveStreamLink);
router.put('/', authenticate, authorizeRoles('admin', 'multimedia'), updateLiveStreamLink);

module.exports = router;
