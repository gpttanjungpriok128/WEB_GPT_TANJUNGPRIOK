const { User, Article, Gallery, PrayerRequest, Schedule, CongregationMember } = require('../models');

async function getDashboardStats(req, res, next) {
  try {
    const [
      users,
      articles,
      pendingArticles,
      galleries,
      prayerRequests,
      unreadPrayerRequests,
      schedules,
      congregationMembers
    ] = await Promise.all([
      User.count(),
      Article.count(),
      Article.count({ where: { status: 'pending' } }),
      Gallery.count(),
      PrayerRequest.count(),
      PrayerRequest.count({ where: { isRead: false } }),
      Schedule.count(),
      CongregationMember.count()
    ]);

    return res.status(200).json({
      users,
      articles,
      pendingArticles,
      galleries,
      prayerRequests,
      unreadPrayerRequests,
      schedules,
      congregationMembers
    });
  } catch (error) {
    return next(error);
  }
}

module.exports = { getDashboardStats };
