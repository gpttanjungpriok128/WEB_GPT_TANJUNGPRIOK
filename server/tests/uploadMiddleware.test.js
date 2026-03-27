const test = require('node:test');
const assert = require('node:assert/strict');

const originalEnv = {
  NODE_ENV: process.env.NODE_ENV,
  CLOUDINARY_CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME,
  CLOUDINARY_API_KEY: process.env.CLOUDINARY_API_KEY,
  CLOUDINARY_API_SECRET: process.env.CLOUDINARY_API_SECRET
};

test.afterEach(() => {
  process.env.NODE_ENV = originalEnv.NODE_ENV;
  process.env.CLOUDINARY_CLOUD_NAME = originalEnv.CLOUDINARY_CLOUD_NAME;
  process.env.CLOUDINARY_API_KEY = originalEnv.CLOUDINARY_API_KEY;
  process.env.CLOUDINARY_API_SECRET = originalEnv.CLOUDINARY_API_SECRET;
});

test('requirePersistentUploadStorage rejects multipart uploads in production without Cloudinary', async () => {
  process.env.NODE_ENV = 'production';
  process.env.CLOUDINARY_CLOUD_NAME = '';
  process.env.CLOUDINARY_API_KEY = '';
  process.env.CLOUDINARY_API_SECRET = '';

  delete require.cache[require.resolve('../services/cloudinaryService')];
  delete require.cache[require.resolve('../middleware/uploadMiddleware')];
  const { requirePersistentUploadStorage } = require('../middleware/uploadMiddleware');

  const req = {
    headers: {
      'content-type': 'multipart/form-data; boundary=----codex'
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

  let nextCalled = false;
  requirePersistentUploadStorage(req, res, () => {
    nextCalled = true;
  });

  assert.equal(nextCalled, false);
  assert.equal(res.statusCode, 503);
  assert.match(res.body.message, /Cloudinary/i);
});

test('requirePersistentUploadStorage allows multipart uploads when Cloudinary is configured', async () => {
  process.env.NODE_ENV = 'production';
  process.env.CLOUDINARY_CLOUD_NAME = 'demo';
  process.env.CLOUDINARY_API_KEY = 'key';
  process.env.CLOUDINARY_API_SECRET = 'secret';

  delete require.cache[require.resolve('../services/cloudinaryService')];
  delete require.cache[require.resolve('../middleware/uploadMiddleware')];
  const { requirePersistentUploadStorage } = require('../middleware/uploadMiddleware');

  let nextCalled = false;
  requirePersistentUploadStorage(
    { headers: { 'content-type': 'multipart/form-data; boundary=----codex' } },
    {},
    () => {
      nextCalled = true;
    }
  );

  assert.equal(nextCalled, true);
});

test('buildSafeUploadFilename ignores attacker-controlled original filenames', () => {
  delete require.cache[require.resolve('../middleware/uploadMiddleware')];
  const { buildSafeUploadFilename } = require('../middleware/uploadMiddleware');

  const filename = buildSafeUploadFilename({
    originalname: '../../etc/passwd',
    mimetype: 'image/png'
  });

  assert.match(filename, /^\d+-[a-f0-9]{32}\.png$/);
  assert.doesNotMatch(filename, /\.\./);
  assert.doesNotMatch(filename, /[\\/]/);
});
