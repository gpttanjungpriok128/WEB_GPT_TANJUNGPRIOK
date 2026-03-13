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

function toNumber(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

const sequelizeOptions = {
  host: normalizeDbHost(process.env.DB_HOST),
  port: Number(process.env.DB_PORT),
  dialect: 'postgres',
  logging: false,
  pool: {
    max: Math.max(1, toNumber(process.env.DB_POOL_MAX, 10)),
    min: Math.max(0, toNumber(process.env.DB_POOL_MIN, 0)),
    idle: Math.max(1000, toNumber(process.env.DB_POOL_IDLE, 10000)),
    acquire: Math.max(1000, toNumber(process.env.DB_POOL_ACQUIRE, 20000)),
    evict: Math.max(1000, toNumber(process.env.DB_POOL_EVICT, 10000))
  }
};

const dialectOptions = { keepAlive: true };
if (dbSslEnabled) {
  dialectOptions.ssl = {
    require: true,
    rejectUnauthorized
  };
}
sequelizeOptions.dialectOptions = dialectOptions;

const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASSWORD,
  sequelizeOptions
);

module.exports = sequelize;
