const rateLimit = require('express-rate-limit');

const isProduction = process.env.NODE_ENV === 'production';

function buildLimiter({ windowMs, max, message }) {
  return rateLimit({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    message: message || { message: 'Terlalu banyak permintaan. Coba lagi sebentar.' }
  });
}

const apiLimiter = buildLimiter({
  windowMs: 10 * 60 * 1000,
  max: isProduction ? 600 : 1200,
  message: { message: 'Terlalu banyak permintaan API. Coba lagi beberapa menit.' }
});

const authLimiter = buildLimiter({
  windowMs: 10 * 60 * 1000,
  max: isProduction ? 25 : 60,
  message: { message: 'Terlalu banyak percobaan login. Coba lagi sebentar.' }
});

const publicWriteLimiter = buildLimiter({
  windowMs: 10 * 60 * 1000,
  max: isProduction ? 60 : 120,
  message: { message: 'Terlalu banyak aksi. Coba lagi sebentar.' }
});

module.exports = {
  apiLimiter,
  authLimiter,
  publicWriteLimiter
};
