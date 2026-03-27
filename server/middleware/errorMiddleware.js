function notFoundHandler(req, res, next) {
  const error = new Error(`Route not found: ${req.originalUrl}`);
  error.statusCode = 404;
  next(error);
}

function getClientErrorMessage(err, statusCode) {
  const fallbackMessage = 'Terjadi kesalahan pada server. Silakan coba lagi nanti.';

  if (statusCode >= 500 && process.env.NODE_ENV === 'production') {
    return fallbackMessage;
  }

  return err.message || 'Internal server error';
}

function globalErrorHandler(err, req, res, next) {
  const statusCode = err.statusCode || 500;
  const message = getClientErrorMessage(err, statusCode);

  if (res.headersSent) {
    return next(err);
  }

  if (statusCode >= 500) {
    console.error(`[${req.method} ${req.originalUrl}]`, err.stack || err.message || err);
  }

  res.status(statusCode).json({
    message,
    ...(process.env.NODE_ENV !== 'production' ? { stack: err.stack } : {})
  });
}

module.exports = { notFoundHandler, globalErrorHandler, getClientErrorMessage };
