const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const StoreOrder = sequelize.define('StoreOrder', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  orderCode: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  },
  userId: {
    type: DataTypes.INTEGER
  },
  customerName: {
    type: DataTypes.STRING,
    allowNull: false
  },
  customerPhone: {
    type: DataTypes.STRING,
    allowNull: false
  },
  customerAddress: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  shippingMethod: {
    type: DataTypes.STRING,
    allowNull: false
  },
  paymentMethod: {
    type: DataTypes.STRING,
    allowNull: false
  },
  notes: {
    type: DataTypes.TEXT
  },
  subtotal: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0
  },
  shippingCost: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0
  },
  totalAmount: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0
  },
  status: {
    type: DataTypes.ENUM('new', 'confirmed', 'packed', 'completed', 'cancelled'),
    allowNull: false,
    defaultValue: 'new'
  },
  channel: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: 'whatsapp'
  },
  stockDeductedAt: {
    type: DataTypes.DATE
  },
  whatsappMessage: {
    type: DataTypes.TEXT
  }
});

module.exports = StoreOrder;
