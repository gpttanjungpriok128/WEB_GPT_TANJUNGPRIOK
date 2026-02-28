const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const LiveStreamSetting = sequelize.define('LiveStreamSetting', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  youtubeUrl: {
    type: DataTypes.STRING,
    allowNull: false
  }
});

module.exports = LiveStreamSetting;
