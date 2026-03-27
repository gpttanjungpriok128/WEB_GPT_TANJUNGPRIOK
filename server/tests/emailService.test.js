const test = require('node:test');
const assert = require('node:assert/strict');

const {
  buildPrayerRequestNotification,
  buildContactMessageNotification
} = require('../services/emailService');

test('buildPrayerRequestNotification escapes HTML and preserves line breaks safely', () => {
  const message = buildPrayerRequestNotification({
    name: '<img src=x onerror=alert(1)>',
    request: 'Baris 1\n<a href="https://evil.test">klik</a>'
  });

  assert.match(message.html, /&lt;img src=x onerror=alert\(1\)&gt;/);
  assert.match(message.html, /Baris 1<br\/>&lt;a href=&quot;https:\/\/evil\.test&quot;&gt;klik&lt;\/a&gt;/);
  assert.doesNotMatch(message.html, /<img/i);
  assert.doesNotMatch(message.html, /<a href=/i);
});

test('buildContactMessageNotification escapes public HTML fields', () => {
  const message = buildContactMessageNotification({
    name: 'Maria <b>Admin</b>',
    email: 'maria@example.com',
    subject: '<script>alert(1)</script>',
    message: 'Halo\n<img src="https://tracker.test/pixel.png" />'
  });

  assert.match(message.html, /Maria &lt;b&gt;Admin&lt;\/b&gt;/);
  assert.match(message.html, /&lt;script&gt;alert\(1\)&lt;\/script&gt;/);
  assert.match(message.html, /Halo<br\/>&lt;img src=&quot;https:\/\/tracker\.test\/pixel\.png&quot; \/&gt;/);
  assert.doesNotMatch(message.html, /<script>/i);
  assert.doesNotMatch(message.html, /<img src=/i);
});
