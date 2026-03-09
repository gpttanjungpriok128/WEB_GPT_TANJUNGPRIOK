const sequelize = require('../config/database');
const User = require('./user');
const Article = require('./article');
const Schedule = require('./schedule');
const Gallery = require('./gallery');
const PrayerRequest = require('./prayerRequest');
const LiveStreamSetting = require('./liveStreamSetting');
const CongregationMember = require('./congregationMember');
const StoreProduct = require('./storeProduct');
const StoreOrder = require('./storeOrder');
const StoreOrderItem = require('./storeOrderItem');
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

module.exports = {
  sequelize,
  User,
  Article,
  Schedule,
  Gallery,
  PrayerRequest,
  LiveStreamSetting,
  CongregationMember,
  StoreProduct,
  StoreOrder,
  StoreOrderItem,
  StoreSetting
};
