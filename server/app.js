require('dotenv').config();
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const helmet = require('helmet');
const compression = require('compression');
const path = require('path');

const routes = require('./routes');
const { notFoundHandler, globalErrorHandler } = require('./middleware/errorMiddleware');
const { apiLimiter, authLimiter, publicWriteLimiter } = require('./middleware/rateLimiters');

const app = express();
app.set('trust proxy', 1);
function normalizeOrigin(origin) {
  return String(origin || '').trim().replace(/\/+$/, '');
}

const allowedOrigins = (process.env.CLIENT_URL || '')
  .split(',')
  .map(normalizeOrigin)
  .filter(Boolean);

const localDevOrigins = ['http://localhost:5173', 'http://localhost:5174'];
for (const origin of localDevOrigins) {
  const normalized = normalizeOrigin(origin);
  if (!allowedOrigins.includes(normalized)) {
    allowedOrigins.push(normalized);
  }
}

app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  crossOriginEmbedderPolicy: false
}));
app.use(compression());
app.use(cors({
  origin(origin, callback) {
    if (!origin) {
      return callback(null, true);
    }

    const normalizedOrigin = normalizeOrigin(origin);
    if (allowedOrigins.includes(normalizedOrigin)) {
      return callback(null, true);
    }

    return callback(new Error(`CORS blocked for origin: ${normalizedOrigin}`));
  },
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
if (process.env.NODE_ENV !== 'production') {
  app.use(morgan('dev'));
}
app.use('/uploads', express.static(path.join(__dirname, 'uploads'), {
  maxAge: '30d',
  setHeaders(res) {
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    res.setHeader('Cache-Control', 'public, max-age=2592000, immutable');
  }
}));

app.get('/api/health', (req, res) => {
  res.status(200).json({ message: 'API is healthy' });
});

app.use('/api', apiLimiter);
app.use('/api/auth', authLimiter);
app.use('/api/store/orders', publicWriteLimiter);
app.use('/api/store/products/:slug/reviews', publicWriteLimiter);
app.use('/api/contact-messages', publicWriteLimiter);
app.use('/api', routes);
app.use(notFoundHandler);
app.use(globalErrorHandler);

module.exports = app;
