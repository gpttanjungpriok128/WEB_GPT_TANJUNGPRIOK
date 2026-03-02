const { Sequelize } = require('sequelize');
require('dotenv').config();

function isTrue(value) {
  return ['true', '1', 'yes', 'on'].includes(String(value || '').toLowerCase());
}

const dbSslEnabled = isTrue(process.env.DB_SSL);
const rejectUnauthorized = !['false', '0', 'no', 'off'].includes(
  String(process.env.DB_SSL_REJECT_UNAUTHORIZED || '').toLowerCase()
);

const sequelizeOptions = {
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  dialect: 'postgres',
  logging: false
};

if (dbSslEnabled) {
  sequelizeOptions.dialectOptions = {
    ssl: {
      require: true,
      rejectUnauthorized
    }
  };
}

const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASSWORD,
  sequelizeOptions
);

module.exports = sequelize;
