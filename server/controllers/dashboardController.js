const { Op } = require('sequelize');
const {
  User,
  Article,
  Gallery,
  PrayerRequest,
  Schedule,
  CongregationMember,
  StoreProduct,
  StoreOrder
} = require('../models');

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
      congregationMembers,
      storeProducts,
      activeStoreProducts,
      storeOrders,
      newStoreOrders,
      storeRevenueRow
    ] = await Promise.all([
      User.count(),
      Article.count(),
      Article.count({ where: { status: 'pending' } }),
      Gallery.count(),
      PrayerRequest.count(),
      PrayerRequest.count({ where: { isRead: false } }),
      Schedule.count(),
      CongregationMember.count(),
      StoreProduct.count(),
      StoreProduct.count({ where: { isActive: true } }),
      StoreOrder.count(),
      StoreOrder.count({ where: { status: 'new' } }),
      StoreOrder.sum('totalAmount', { where: { status: { [Op.ne]: 'cancelled' } } })
    ]);

    return res.status(200).json({
      users,
      articles,
      pendingArticles,
      galleries,
      prayerRequests,
      unreadPrayerRequests,
      schedules,
      congregationMembers,
      storeProducts,
      activeStoreProducts,
      storeOrders,
      newStoreOrders,
      storeRevenue: Number(storeRevenueRow) || 0
    });
  } catch (error) {
    return next(error);
  }
}

module.exports = { getDashboardStats };
