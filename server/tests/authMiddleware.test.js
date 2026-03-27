const test = require('node:test');
const assert = require('node:assert/strict');

const originalEnv = {
  CLIENT_URL: process.env.CLIENT_URL
};

test.afterEach(() => {
  process.env.CLIENT_URL = originalEnv.CLIENT_URL;
});

test('cookie-authenticated POST requests from untrusted origins are blocked', () => {
  process.env.CLIENT_URL = 'https://app.example.com';

  delete require.cache[require.resolve('../middleware/authMiddleware')];
  const { getTrustedMutationError } = require('../middleware/authMiddleware');

  const error = getTrustedMutationError(
    {
      method: 'POST',
      headers: {
        origin: 'https://evil.example.com'
      }
    },
    'cookie'
  );

  assert.equal(error?.statusCode, 403);
  assert.match(error?.message || '', /cross-site/i);
});

test('cookie-authenticated POST requests from the configured frontend origin are allowed', () => {
  process.env.CLIENT_URL = 'https://app.example.com';

  delete require.cache[require.resolve('../middleware/authMiddleware')];
  const { getTrustedMutationError } = require('../middleware/authMiddleware');

  const error = getTrustedMutationError(
    {
      method: 'POST',
      headers: {
        origin: 'https://app.example.com'
      }
    },
    'cookie'
  );

  assert.equal(error, null);
});

test('cookie-authenticated POST requests with the trusted ajax header are allowed', () => {
  process.env.CLIENT_URL = '';

  delete require.cache[require.resolve('../middleware/authMiddleware')];
  const { getTrustedMutationError } = require('../middleware/authMiddleware');

  const error = getTrustedMutationError(
    {
      method: 'PATCH',
      headers: {
        'x-requested-with': 'XMLHttpRequest'
      }
    },
    'cookie'
  );

  assert.equal(error, null);
});
