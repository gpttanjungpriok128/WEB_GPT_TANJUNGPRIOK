require('dotenv').config();
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const helmet = require('helmet');
const path = require('path');

const routes = require('./routes');
const { notFoundHandler, globalErrorHandler } = require('./middleware/errorMiddleware');

const app = express();
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
app.use(morgan('dev'));
app.use('/uploads', express.static(path.join(__dirname, 'uploads'), {
  setHeaders(res) {
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  }
}));

app.get('/api/health', (req, res) => {
  res.status(200).json({ message: 'API is healthy' });
});

app.use('/api', routes);
app.use(notFoundHandler);
app.use(globalErrorHandler);

module.exports = app;
