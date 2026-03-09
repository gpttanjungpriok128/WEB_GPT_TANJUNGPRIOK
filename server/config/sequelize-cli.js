require('dotenv').config();

function isTrue(value) {
  return ['true', '1', 'yes', 'on'].includes(String(value || '').toLowerCase());
}

function normalizeDbHost(value) {
  return String(value || '').trim().toLowerCase() === 'localhost'
    ? '127.0.0.1'
    : value;
}

function buildDbConfig() {
  const config = {
    username: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    host: normalizeDbHost(process.env.DB_HOST),
    port: Number(process.env.DB_PORT),
    dialect: 'postgres'
  };

  if (isTrue(process.env.DB_SSL)) {
    const rejectUnauthorized = !['false', '0', 'no', 'off'].includes(
      String(process.env.DB_SSL_REJECT_UNAUTHORIZED || '').toLowerCase()
    );

    config.dialectOptions = {
      ssl: {
        require: true,
        rejectUnauthorized
      }
    };
  }

  return config;
}

module.exports = {
  development: buildDbConfig(),
  test: buildDbConfig(),
  production: buildDbConfig()
};
