const test = require('node:test');
const assert = require('node:assert/strict');

const originalEnv = {
  NODE_ENV: process.env.NODE_ENV,
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN
};

test.afterEach(() => {
  process.env.NODE_ENV = originalEnv.NODE_ENV;
  process.env.JWT_EXPIRES_IN = originalEnv.JWT_EXPIRES_IN;
});

test('buildAuthCookieOptions uses lax non-secure cookies in local development', () => {
  process.env.NODE_ENV = 'development';
  process.env.JWT_EXPIRES_IN = '1d';

  delete require.cache[require.resolve('../utils/authCookie')];
  const { buildAuthCookieOptions } = require('../utils/authCookie');

  const options = buildAuthCookieOptions({ secure: false, headers: {} });

  assert.equal(options.httpOnly, true);
  assert.equal(options.secure, false);
  assert.equal(options.sameSite, 'lax');
  assert.equal(options.maxAge, 24 * 60 * 60 * 1000);
});

test('buildAuthCookieOptions upgrades to secure none cookies in production', () => {
  process.env.NODE_ENV = 'production';
  process.env.JWT_EXPIRES_IN = '12h';

  delete require.cache[require.resolve('../utils/authCookie')];
  const { buildAuthCookieOptions } = require('../utils/authCookie');

  const options = buildAuthCookieOptions({ secure: false, headers: {} });

  assert.equal(options.secure, true);
  assert.equal(options.sameSite, 'none');
  assert.equal(options.maxAge, 12 * 60 * 60 * 1000);
});
