require('dotenv').config();

function isTrue(value) {
  return ['true', '1', 'yes', 'on'].includes(String(value || '').toLowerCase());
}

function buildDbConfig() {
  const config = {
    username: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    host: process.env.DB_HOST,
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
        rejectUnauthorized: false // Force false for Render/production DBs
      }
    };
  } else {
    // Fallback for Render external connections which often require SSL implicitly
    config.dialectOptions = {
      ssl: {
        require: true,
        rejectUnauthorized: false
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
