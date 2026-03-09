const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const StoreOrderItem = sequelize.define('StoreOrderItem', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  orderId: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  productId: {
    type: DataTypes.INTEGER
  },
  productName: {
    type: DataTypes.STRING,
    allowNull: false
  },
  productSlug: {
    type: DataTypes.STRING,
    allowNull: false
  },
  size: {
    type: DataTypes.STRING,
    allowNull: false
  },
  color: {
    type: DataTypes.STRING
  },
  unitPrice: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0
  },
  quantity: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 1
  },
  lineTotal: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0
  },
  promoLabel: {
    type: DataTypes.STRING
  }
});

module.exports = StoreOrderItem;
