const sequelize = require('../config/database');
const User = require('./user');
const Article = require('./article');
const Schedule = require('./schedule');
const Gallery = require('./gallery');
const PrayerRequest = require('./prayerRequest');
const LiveStreamSetting = require('./liveStreamSetting');

User.hasMany(Article, { foreignKey: 'authorId', as: 'articles' });
Article.belongsTo(User, { foreignKey: 'authorId', as: 'author' });
User.hasMany(Article, { foreignKey: 'approvedBy', as: 'approvedArticles' });
Article.belongsTo(User, { foreignKey: 'approvedBy', as: 'approver' });

module.exports = {
  sequelize,
  User,
  Article,
  Schedule,
  Gallery,
  PrayerRequest,
  LiveStreamSetting
};
