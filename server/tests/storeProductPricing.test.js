const test = require('node:test');
const assert = require('node:assert/strict');

const { __testHooks } = require('../controllers/storeController');

test('normalizePriceBySize fills missing sizes with base price fallback', () => {
  const result = __testHooks.normalizePriceBySize(
    { 's anak': 85000, L: 120000 },
    ['S Anak', 'M Anak', 'L'],
    110000
  );

  assert.deepEqual(result, {
    'S ANAK': 85000,
    'M ANAK': 110000,
    L: 120000
  });
});

test('compactPriceBySize keeps only prices that differ from base price', () => {
  const result = __testHooks.compactPriceBySize(
    { S: 110000, M: 110000, L: 125000 },
    ['S', 'M', 'L'],
    110000
  );

  assert.deepEqual(result, { L: 125000 });
});

test('calculateProductPricing uses size-specific price before percentage promo', () => {
  const pricing = __testHooks.calculateProductPricing(
    {
      basePrice: 120000,
      priceBySize: { 'S ANAK': 90000, L: 120000 },
      sizes: ['S Anak', 'L'],
      promoType: 'percentage',
      promoValue: 10,
      promoStartAt: '2026-04-01T00:00:00.000Z',
      promoEndAt: '2026-04-30T23:59:59.999Z'
    },
    {
      size: 'S Anak',
      now: new Date('2026-04-05T10:00:00.000Z')
    }
  );

  assert.deepEqual(pricing, {
    basePrice: 90000,
    finalPrice: 81000,
    discountAmount: 9000,
    promoIsActive: true,
    promoLabel: '10% OFF'
  });
});

test('getProductPriceInfo exposes min and max final prices across sizes', () => {
  const result = __testHooks.getProductPriceInfo(
    {
      basePrice: 120000,
      priceBySize: { 'S ANAK': 90000, L: 120000, XL: 135000 },
      sizes: ['S Anak', 'L', 'XL'],
      promoType: 'fixed',
      promoValue: 10000,
      promoStartAt: '2026-04-01T00:00:00.000Z',
      promoEndAt: '2026-04-30T23:59:59.999Z'
    },
    new Date('2026-04-05T10:00:00.000Z')
  );

  assert.deepEqual(result.priceBySize, {
    'S ANAK': 90000,
    L: 120000,
    XL: 135000
  });
  assert.deepEqual(result.finalPriceBySize, {
    'S ANAK': 80000,
    L: 110000,
    XL: 125000
  });
  assert.equal(result.minBasePrice, 90000);
  assert.equal(result.maxBasePrice, 135000);
  assert.equal(result.minFinalPrice, 80000);
  assert.equal(result.maxFinalPrice, 125000);
  assert.equal(result.hasPriceBySizeVariation, true);
});
