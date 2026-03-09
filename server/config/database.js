const { Sequelize } = require('sequelize');
require('dotenv').config();

function isTrue(value) {
  return ['true', '1', 'yes', 'on'].includes(String(value || '').toLowerCase());
}

function normalizeDbHost(value) {
  return String(value || '').trim().toLowerCase() === 'localhost'
    ? '127.0.0.1'
    : value;
}

const dbSslEnabled = isTrue(process.env.DB_SSL);
const rejectUnauthorized = !['false', '0', 'no', 'off'].includes(
  String(process.env.DB_SSL_REJECT_UNAUTHORIZED || '').toLowerCase()
);

const sequelizeOptions = {
  host: normalizeDbHost(process.env.DB_HOST),
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
