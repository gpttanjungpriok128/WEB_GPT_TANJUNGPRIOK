const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const StoreProductReview = sequelize.define('StoreProductReview', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  productId: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  orderId: {
    type: DataTypes.INTEGER
  },
  userId: {
    type: DataTypes.INTEGER
  },
  reviewerName: {
    type: DataTypes.STRING,
    allowNull: false
  },
  reviewerPhone: {
    type: DataTypes.STRING,
    allowNull: false
  },
  rating: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  reviewText: {
    type: DataTypes.TEXT
  },
  isApproved: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true
  }
});

module.exports = StoreProductReview;
