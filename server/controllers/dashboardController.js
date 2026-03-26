const { Op } = require('sequelize');
const {
  User,
  Article,
  Gallery,
  PrayerRequest,
  ContactMessage,
  Schedule,
  CongregationMember,
  StoreProduct,
  StoreOrder
} = require('../models');
const {
  LOW_STOCK_THRESHOLD,
  buildLowStockProducts,
  buildExcerpt
} = require('../utils/dashboard');

async function getDashboardStats(req, res, next) {
  try {
    const recentWindowStart = new Date();
    recentWindowStart.setDate(recentWindowStart.getDate() - 7);

    const [
      users,
      publishedArticles,
      pendingArticles,
      draftArticles,
      galleries,
      unreadPrayerRequests,
      unreadContactMessages,
      contactMessages,
      schedules,
      congregationMembers,
      newCongregationMembers,
      activeStoreProducts,
      storeOrders,
      newStoreOrders,
      completedStoreOrders,
      storeRevenueRow,
      recentOrders,
      pendingArticleList,
      prayerInbox,
      contactInbox,
      recentMembers,
      activeProducts
    ] = await Promise.all([
      User.count(),
      Article.count({ where: { status: 'published' } }),
      Article.count({ where: { status: 'pending' } }),
      Article.count({ where: { status: 'draft' } }),
      Gallery.count(),
      PrayerRequest.count({ where: { isRead: false } }),
      ContactMessage.count({ where: { isRead: false } }),
      ContactMessage.count(),
      Schedule.count(),
      CongregationMember.count(),
      CongregationMember.count({ where: { createdAt: { [Op.gte]: recentWindowStart } } }),
      StoreProduct.count({ where: { isActive: true } }),
      StoreOrder.count(),
      StoreOrder.count({ where: { status: 'new' } }),
      StoreOrder.count({ where: { status: 'completed' } }),
      StoreOrder.sum('totalAmount', { where: { status: { [Op.ne]: 'cancelled' } } }),
      StoreOrder.findAll({
        attributes: ['id', 'orderCode', 'customerName', 'totalAmount', 'status', 'shippingMethod', 'createdAt'],
        order: [['createdAt', 'DESC']],
        limit: 5
      }),
      Article.findAll({
        attributes: ['id', 'title', 'status', 'createdAt'],
        where: { status: 'pending' },
        include: [
          {
            model: User,
            as: 'author',
            attributes: ['name']
          }
        ],
        order: [['createdAt', 'DESC']],
        limit: 5
      }),
      PrayerRequest.findAll({
        attributes: ['id', 'name', 'request', 'isRead', 'createdAt'],
        order: [
          ['isRead', 'ASC'],
          ['createdAt', 'DESC']
        ],
        limit: 5
      }),
      ContactMessage.findAll({
        attributes: ['id', 'name', 'email', 'subject', 'message', 'isRead', 'createdAt'],
        order: [
          ['isRead', 'ASC'],
          ['createdAt', 'DESC']
        ],
        limit: 5
      }),
      CongregationMember.findAll({
        attributes: ['id', 'fullName', 'category', 'phone', 'createdAt'],
        include: [
          {
            model: User,
            as: 'submitter',
            attributes: ['name'],
            required: false
          }
        ],
        order: [['createdAt', 'DESC']],
        limit: 5
      }),
      StoreProduct.findAll({
        attributes: ['id', 'name', 'slug', 'color', 'stock', 'stockBySize', 'updatedAt'],
        where: { isActive: true }
      })
    ]);

    const lowStockProducts = buildLowStockProducts(activeProducts, LOW_STOCK_THRESHOLD);

    return res.status(200).json({
      summary: {
        users,
        publishedArticles,
        pendingArticles,
        draftArticles,
        galleries,
        unreadPrayerRequests,
        unreadContactMessages,
        contactMessages,
        schedules,
        congregationMembers,
        newCongregationMembers,
        activeStoreProducts,
        storeOrders,
        newStoreOrders,
        completedStoreOrders,
        lowStockProducts: lowStockProducts.length,
        storeRevenue: Number(storeRevenueRow) || 0
      },
      recentOrders: recentOrders.map((order) => ({
        id: order.id,
        orderCode: order.orderCode,
        customerName: order.customerName,
        totalAmount: Number(order.totalAmount) || 0,
        status: order.status,
        shippingMethod: order.shippingMethod,
        createdAt: order.createdAt
      })),
      pendingArticleList: pendingArticleList.map((article) => ({
        id: article.id,
        title: article.title,
        status: article.status,
        createdAt: article.createdAt,
        authorName: article.author?.name || 'Penulis'
      })),
      prayerInbox: prayerInbox.map((item) => ({
        id: item.id,
        name: item.name,
        isRead: Boolean(item.isRead),
        createdAt: item.createdAt,
        excerpt: buildExcerpt(item.request)
      })),
      contactInbox: contactInbox.map((item) => ({
        id: item.id,
        name: item.name,
        email: item.email,
        subject: item.subject,
        isRead: Boolean(item.isRead),
        createdAt: item.createdAt,
        excerpt: buildExcerpt(item.message)
      })),
      lowStockProducts: lowStockProducts.slice(0, 5),
      recentMembers: recentMembers.map((member) => ({
        id: member.id,
        fullName: member.fullName,
        category: member.category,
        phone: member.phone,
        createdAt: member.createdAt,
        submittedBy: member.submitter?.name || 'Form Jemaat'
      })),
      thresholds: {
        lowStock: LOW_STOCK_THRESHOLD
      }
    });
  } catch (error) {
    return next(error);
  }
}

module.exports = { getDashboardStats };
