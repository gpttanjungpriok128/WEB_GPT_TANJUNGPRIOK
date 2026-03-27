const test = require('node:test');
const assert = require('node:assert/strict');

const {
  getAllowedNextOrderStatuses,
  canTransitionOrderStatus,
  isReviewableOrderStatus,
  buildOrderStatusTransitionError
} = require('../utils/storeOrderStatus');

test('shipping orders follow the expected linear status flow', () => {
  assert.deepEqual(getAllowedNextOrderStatuses('new', 'Kurir'), ['confirmed', 'cancelled']);
  assert.deepEqual(getAllowedNextOrderStatuses('confirmed', 'Kurir'), ['packed']);
  assert.deepEqual(getAllowedNextOrderStatuses('packed', 'Kurir'), ['shipping']);
  assert.deepEqual(getAllowedNextOrderStatuses('shipping', 'Kurir'), ['completed']);
  assert.deepEqual(getAllowedNextOrderStatuses('completed', 'Kurir'), []);
});

test('pickup orders move from packed to ready_pickup to picked_up', () => {
  assert.deepEqual(getAllowedNextOrderStatuses('packed', 'Ambil di Gereja'), ['ready_pickup']);
  assert.deepEqual(getAllowedNextOrderStatuses('ready_pickup', 'Ambil di Gereja'), ['picked_up']);
  assert.equal(canTransitionOrderStatus('packed', 'shipping', 'Ambil di Gereja'), false);
  assert.equal(canTransitionOrderStatus('ready_pickup', 'picked_up', 'Ambil di Gereja'), true);
});

test('invalid jumps and regressions are rejected', () => {
  assert.equal(canTransitionOrderStatus('new', 'packed', 'Kurir'), false);
  assert.equal(canTransitionOrderStatus('shipping', 'confirmed', 'Kurir'), false);
  assert.equal(canTransitionOrderStatus('cancelled', 'new', 'Kurir'), false);
  assert.equal(canTransitionOrderStatus('confirmed', 'confirmed', 'Kurir'), true);
});

test('reviews are only allowed after the order is received', () => {
  assert.equal(isReviewableOrderStatus('completed'), true);
  assert.equal(isReviewableOrderStatus('picked_up'), true);
  assert.equal(isReviewableOrderStatus('shipping'), false);
  assert.equal(isReviewableOrderStatus('new'), false);
});

test('transition error explains the next valid statuses', () => {
  assert.equal(
    buildOrderStatusTransitionError('confirmed', 'Kurir'),
    'Status Dikonfirmasi hanya bisa diubah ke Dikemas.'
  );
  assert.equal(
    buildOrderStatusTransitionError('picked_up', 'Ambil di Gereja'),
    'Status Sudah Diambil sudah final dan tidak bisa diubah lagi.'
  );
});
