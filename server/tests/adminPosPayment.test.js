const test = require('node:test');
const assert = require('node:assert/strict');

const { __testHooks } = require('../controllers/storeController');

test('resolveAdminPosPayment returns change for cash transactions', () => {
  const result = __testHooks.resolveAdminPosPayment('Tunai', 150000, 200000);

  assert.deepEqual(result, {
    paymentMethod: 'Tunai',
    amountPaid: 200000,
    changeAmount: 50000,
    isCash: true
  });
});

test('resolveAdminPosPayment keeps non-cash transactions equal to total', () => {
  const result = __testHooks.resolveAdminPosPayment('QRIS', 175000, 0);

  assert.deepEqual(result, {
    paymentMethod: 'QRIS',
    amountPaid: 175000,
    changeAmount: 0,
    isCash: false
  });
});

test('resolveAdminPosPayment rejects cash payments below total', () => {
  assert.throws(
    () => __testHooks.resolveAdminPosPayment('Tunai', 100000, 90000),
    (error) => {
      assert.equal(error.statusCode, 400);
      assert.match(error.message, /nominal dibayar/i);
      return true;
    }
  );
});

test('normalizeReversalType keeps return and defaults others to void', () => {
  assert.equal(__testHooks.normalizeReversalType('return'), 'return');
  assert.equal(__testHooks.normalizeReversalType('VOID'), 'void');
  assert.equal(__testHooks.normalizeReversalType('something-else'), 'void');
});

test('isOfflineStoreChannel detects offline store channel only', () => {
  assert.equal(__testHooks.isOfflineStoreChannel('offline_store'), true);
  assert.equal(__testHooks.isOfflineStoreChannel('whatsapp'), false);
});
