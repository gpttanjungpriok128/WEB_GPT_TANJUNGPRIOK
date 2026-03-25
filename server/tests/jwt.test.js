const test = require('node:test');
const assert = require('node:assert/strict');

const originalEnv = {
  JWT_SECRET: process.env.JWT_SECRET,
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN
};

test.afterEach(() => {
  process.env.JWT_SECRET = originalEnv.JWT_SECRET;
  process.env.JWT_EXPIRES_IN = originalEnv.JWT_EXPIRES_IN;
});

test('generateToken and verifyToken round-trip payload data', () => {
  process.env.JWT_SECRET = 'unit-test-secret';
  process.env.JWT_EXPIRES_IN = '1h';

  delete require.cache[require.resolve('../utils/jwt')];
  const { generateToken, verifyToken } = require('../utils/jwt');

  const token = generateToken({ id: 42, role: 'admin' });
  const payload = verifyToken(token);

  assert.equal(payload.id, 42);
  assert.equal(payload.role, 'admin');
});
