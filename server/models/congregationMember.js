const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const CongregationMember = sequelize.define('CongregationMember', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  fullName: {
    type: DataTypes.STRING,
    allowNull: false
  },
  category: {
    type: DataTypes.ENUM('kaum_pria', 'kaum_wanita', 'kaum_muda', 'sekolah_minggu'),
    allowNull: false
  },
  gender: {
    type: DataTypes.ENUM('pria', 'wanita'),
    allowNull: true
  },
  birthDate: {
    type: DataTypes.DATEONLY,
    allowNull: false
  },
  phone: {
    type: DataTypes.STRING
  },
  address: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  submittedByUserId: {
    type: DataTypes.INTEGER
  }
});

module.exports = CongregationMember;
