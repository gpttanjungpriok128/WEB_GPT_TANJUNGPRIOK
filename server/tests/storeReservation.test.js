const test = require('node:test');
const assert = require('node:assert/strict');

const { __testHooks } = require('../controllers/storeController');

test('reserveStockBySize deducts reserved quantities from matching sizes', () => {
  const result = __testHooks.reserveStockBySize(
    {
      name: 'GTshirt Hope',
      sizes: ['S', 'M'],
      stockBySize: { S: 2, M: 3 },
      stock: 5
    },
    { S: 1, M: 2 }
  );

  assert.deepEqual(result, {
    stockBySize: { S: 1, M: 1 },
    stock: 2
  });
});

test('reserveStockBySize throws a client error when stock is insufficient', () => {
  assert.throws(
    () => __testHooks.reserveStockBySize(
      {
        name: 'GTshirt Light',
        sizes: ['L'],
        stockBySize: { L: 1 },
        stock: 1
      },
      { L: 2 }
    ),
    (error) => {
      assert.equal(error.statusCode, 400);
      assert.match(error.message, /stok/i);
      return true;
    }
  );
});
