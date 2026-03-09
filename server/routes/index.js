const express = require('express');

const authRoutes = require('./authRoutes');
const articleRoutes = require('./articleRoutes');
const scheduleRoutes = require('./scheduleRoutes');
const galleryRoutes = require('./galleryRoutes');
const prayerRequestRoutes = require('./prayerRequestRoutes');
const userRoutes = require('./userRoutes');
const liveStreamRoutes = require('./liveStreamRoutes');
const dashboardRoutes = require('./dashboardRoutes');
const congregationMemberRoutes = require('./congregationMemberRoutes');
const storeRoutes = require('./storeRoutes');

const router = express.Router();

router.use('/auth', authRoutes);
router.use('/articles', articleRoutes);
router.use('/schedules', scheduleRoutes);
router.use('/galleries', galleryRoutes);
router.use('/prayer-requests', prayerRequestRoutes);
router.use('/users', userRoutes);
router.use('/live-stream', liveStreamRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/congregation-members', congregationMemberRoutes);
router.use('/store', storeRoutes);

module.exports = router;
