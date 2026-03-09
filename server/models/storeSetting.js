const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const StoreSetting = sequelize.define('StoreSetting', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: false,
    primaryKey: true
  },
  shippingCost: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 15000
  }
});

module.exports = StoreSetting;
