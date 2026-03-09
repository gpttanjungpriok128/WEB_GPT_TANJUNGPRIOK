const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const StoreProduct = sequelize.define('StoreProduct', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  slug: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  },
  description: {
    type: DataTypes.TEXT
  },
  verse: {
    type: DataTypes.STRING
  },
  color: {
    type: DataTypes.STRING
  },
  imageUrl: {
    type: DataTypes.STRING
  },
  imageUrls: {
    type: DataTypes.JSONB,
    allowNull: false,
    defaultValue: []
  },
  basePrice: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0
  },
  promoType: {
    type: DataTypes.ENUM('none', 'percentage', 'fixed'),
    allowNull: false,
    defaultValue: 'none'
  },
  promoValue: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0
  },
  promoStartAt: {
    type: DataTypes.DATE
  },
  promoEndAt: {
    type: DataTypes.DATE
  },
  sizes: {
    type: DataTypes.JSONB,
    allowNull: false,
    defaultValue: ['S', 'M', 'L', 'XL', 'XXL']
  },
  stock: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true
  },
  createdBy: {
    type: DataTypes.INTEGER
  },
  updatedBy: {
    type: DataTypes.INTEGER
  }
});

module.exports = StoreProduct;
