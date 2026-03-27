const test = require('node:test');
const assert = require('node:assert/strict');

const { PrayerRequest } = require('../models');
const emailService = require('../services/emailService');

const originalCreate = PrayerRequest.create;
const originalSendPrayerRequestNotification = emailService.sendPrayerRequestNotification;

test.afterEach(() => {
  PrayerRequest.create = originalCreate;
  emailService.sendPrayerRequestNotification = originalSendPrayerRequestNotification;
});

test('createPrayerRequest allow-lists payload fields and forces unread state', async () => {
  let createdPayload = null;

  PrayerRequest.create = async (payload) => {
    createdPayload = payload;
    return {
      id: 1,
      ...payload
    };
  };

  emailService.sendPrayerRequestNotification = async () => ({ sent: true, skipped: false });

  delete require.cache[require.resolve('../controllers/prayerRequestController')];
  const { createPrayerRequest } = require('../controllers/prayerRequestController');

  const req = {
    body: {
      name: '  Maria  ',
      request: '  Tolong doakan keluarga kami.  ',
      isRead: true
    }
  };
  const res = {
    statusCode: 200,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    }
  };

  await createPrayerRequest(req, res, (error) => {
    throw error;
  });

  assert.deepEqual(createdPayload, {
    name: 'Maria',
    request: 'Tolong doakan keluarga kami.',
    isRead: false
  });
  assert.equal(res.statusCode, 201);
  assert.equal(res.body?.data?.isRead, false);
});
