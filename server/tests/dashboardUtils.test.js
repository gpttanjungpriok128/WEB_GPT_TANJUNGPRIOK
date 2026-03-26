const test = require('node:test');
const assert = require('node:assert/strict');

const {
  LOW_STOCK_THRESHOLD,
  getProductAvailableStock,
  buildLowStockProducts,
  buildExcerpt
} = require('../utils/dashboard');

test('getProductAvailableStock sums stockBySize when available', () => {
  assert.equal(
    getProductAvailableStock({
      stock: 99,
      stockBySize: { S: 1, M: 2, L: 3 }
    }),
    6
  );
});

test('buildLowStockProducts filters and sorts low stock products', () => {
  const result = buildLowStockProducts([
    { id: 1, name: 'Alpha', slug: 'alpha', stock: 10 },
    { id: 2, name: 'Bravo', slug: 'bravo', stockBySize: { M: 1, L: 1 } },
    { id: 3, name: 'Charlie', slug: 'charlie', stock: LOW_STOCK_THRESHOLD },
    { id: 4, name: 'Delta', slug: 'delta', stock: 0 }
  ]);

  assert.deepEqual(
    result.map((item) => ({ name: item.name, totalStock: item.totalStock })),
    [
      { name: 'Delta', totalStock: 0 },
      { name: 'Bravo', totalStock: 2 },
      { name: 'Charlie', totalStock: LOW_STOCK_THRESHOLD }
    ]
  );
});

test('buildExcerpt trims whitespace and truncates long values', () => {
  assert.equal(buildExcerpt('  Halo   dunia  '), 'Halo dunia');
  assert.equal(buildExcerpt('x'.repeat(120), 20), `${'x'.repeat(19)}…`);
});
