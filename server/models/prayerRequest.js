const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const PrayerRequest = sequelize.define('PrayerRequest', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  request: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  isRead: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  }
}, {
  updatedAt: false
});

module.exports = PrayerRequest;
