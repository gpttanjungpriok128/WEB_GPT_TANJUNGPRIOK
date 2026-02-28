const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Article = sequelize.define('Article', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  title: {
    type: DataTypes.STRING,
    allowNull: false
  },
  content: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  image: {
    type: DataTypes.STRING
  },
  status: {
    type: DataTypes.ENUM('draft', 'pending', 'published', 'rejected'),
    allowNull: false,
    defaultValue: 'pending'
  },
  approvedBy: {
    type: DataTypes.INTEGER
  },
  approvedAt: {
    type: DataTypes.DATE
  },
  authorId: {
    type: DataTypes.INTEGER,
    allowNull: false
  }
});

module.exports = Article;
