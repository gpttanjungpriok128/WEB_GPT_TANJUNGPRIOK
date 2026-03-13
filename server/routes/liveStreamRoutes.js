const express = require('express');
const { getLiveStreamLink, updateLiveStreamLink } = require('../controllers/liveStreamController');
const { authenticate, authorizeRoles } = require('../middleware/authMiddleware');
const { cacheResponse } = require('../middleware/cacheMiddleware');

const router = express.Router();

router.get('/', cacheResponse({ ttlMs: 60 * 1000 }), getLiveStreamLink);
router.put('/', authenticate, authorizeRoles('admin', 'multimedia'), updateLiveStreamLink);

module.exports = router;
