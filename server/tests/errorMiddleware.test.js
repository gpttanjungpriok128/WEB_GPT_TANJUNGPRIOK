const test = require('node:test');
const assert = require('node:assert/strict');

const { globalErrorHandler } = require('../middleware/errorMiddleware');

const originalNodeEnv = process.env.NODE_ENV;
const originalConsoleError = console.error;

function createResponseRecorder() {
  return {
    statusCode: 200,
    body: null,
    headersSent: false,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    }
  };
}

test.afterEach(() => {
  process.env.NODE_ENV = originalNodeEnv;
  console.error = originalConsoleError;
});

test('globalErrorHandler hides raw 500 errors in production', () => {
  process.env.NODE_ENV = 'production';
  console.error = () => {};

  const res = createResponseRecorder();
  const error = new Error('Sequelize connection failed: password authentication failed for user postgres');

  globalErrorHandler(error, { method: 'GET', originalUrl: '/api/store/products' }, res, () => {});

  assert.equal(res.statusCode, 500);
  assert.deepEqual(res.body, {
    message: 'Terjadi kesalahan pada server. Silakan coba lagi nanti.'
  });
});

test('globalErrorHandler keeps explicit 4xx messages in production', () => {
  process.env.NODE_ENV = 'production';
  console.error = () => {};

  const res = createResponseRecorder();
  const error = new Error('Article not found');
  error.statusCode = 404;

  globalErrorHandler(error, { method: 'GET', originalUrl: '/api/articles/999' }, res, () => {});

  assert.equal(res.statusCode, 404);
  assert.deepEqual(res.body, {
    message: 'Article not found'
  });
});
