const test = require('node:test');
const assert = require('node:assert/strict');
const { Op } = require('sequelize');

const { __testHooks } = require('../controllers/storeController');

test('buildRevenueReportWhere excludes cancelled orders when status is all', () => {
  const where = __testHooks.buildRevenueReportWhere({ status: 'all' });

  assert.deepEqual(where, {
    status: { [Op.ne]: 'cancelled' }
  });
});

test('buildRevenueReportWhere keeps explicit cancelled filter when requested', () => {
  const where = __testHooks.buildRevenueReportWhere({ status: 'cancelled' });

  assert.deepEqual(where, {
    status: 'cancelled'
  });
});
