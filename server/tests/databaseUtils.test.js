const test = require('node:test');
const assert = require('node:assert/strict');

const { isMissingRelationError } = require('../utils/database');

test('isMissingRelationError detects postgres undefined table error code', () => {
  assert.equal(
    isMissingRelationError({ original: { code: '42P01' } }, 'ContactMessages'),
    true
  );
});

test('isMissingRelationError detects relation message text', () => {
  assert.equal(
    isMissingRelationError(new Error('relation "ContactMessages" does not exist'), 'ContactMessages'),
    true
  );
});

test('isMissingRelationError ignores unrelated errors', () => {
  assert.equal(
    isMissingRelationError(new Error('validation failed'), 'ContactMessages'),
    false
  );
});
