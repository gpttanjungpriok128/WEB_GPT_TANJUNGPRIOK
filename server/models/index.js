const sequelize = require('../config/database');
const User = require('./user');
const Article = require('./article');
const Schedule = require('./schedule');
const Gallery = require('./gallery');
const PrayerRequest = require('./prayerRequest');
const LiveStreamSetting = require('./liveStreamSetting');
const ContactMessage = require('./contactMessage');
const CongregationMember = require('./congregationMember');
const StoreProduct = require('./storeProduct');
const StoreOrder = require('./storeOrder');
const StoreOrderItem = require('./storeOrderItem');
const StoreProductReview = require('./storeProductReview');
const StoreSetting = require('./storeSetting');

User.hasMany(Article, { foreignKey: 'authorId', as: 'articles' });
Article.belongsTo(User, { foreignKey: 'authorId', as: 'author' });
User.hasMany(Article, { foreignKey: 'approvedBy', as: 'approvedArticles' });
Article.belongsTo(User, { foreignKey: 'approvedBy', as: 'approver' });
User.hasMany(CongregationMember, { foreignKey: 'submittedByUserId', as: 'submittedMembers' });
CongregationMember.belongsTo(User, { foreignKey: 'submittedByUserId', as: 'submitter' });
User.hasMany(StoreProduct, { foreignKey: 'createdBy', as: 'createdStoreProducts' });
User.hasMany(StoreProduct, { foreignKey: 'updatedBy', as: 'updatedStoreProducts' });
StoreProduct.belongsTo(User, { foreignKey: 'createdBy', as: 'creator' });
StoreProduct.belongsTo(User, { foreignKey: 'updatedBy', as: 'updater' });
User.hasMany(StoreOrder, { foreignKey: 'userId', as: 'storeOrders' });
StoreOrder.belongsTo(User, { foreignKey: 'userId', as: 'user' });
StoreOrder.hasMany(StoreOrderItem, { foreignKey: 'orderId', as: 'items' });
StoreOrderItem.belongsTo(StoreOrder, { foreignKey: 'orderId', as: 'order' });
StoreProduct.hasMany(StoreOrderItem, { foreignKey: 'productId', as: 'orderItems' });
StoreOrderItem.belongsTo(StoreProduct, { foreignKey: 'productId', as: 'product' });
StoreProduct.hasMany(StoreProductReview, { foreignKey: 'productId', as: 'reviews' });
StoreProductReview.belongsTo(StoreProduct, { foreignKey: 'productId', as: 'product' });
StoreOrder.hasMany(StoreProductReview, { foreignKey: 'orderId', as: 'reviews' });
StoreProductReview.belongsTo(StoreOrder, { foreignKey: 'orderId', as: 'order' });
User.hasMany(StoreProductReview, { foreignKey: 'userId', as: 'storeReviews' });
StoreProductReview.belongsTo(User, { foreignKey: 'userId', as: 'user' });

module.exports = {
  sequelize,
  User,
  Article,
  Schedule,
  Gallery,
  PrayerRequest,
  LiveStreamSetting,
  ContactMessage,
  CongregationMember,
  StoreProduct,
  StoreOrder,
  StoreOrderItem,
  StoreProductReview,
  StoreSetting
};
