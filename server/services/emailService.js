const nodemailer = require('nodemailer');

const mailEnabled =
  !!process.env.SMTP_HOST &&
  !!process.env.SMTP_PORT &&
  !!process.env.SMTP_USER &&
  !!process.env.SMTP_PASS &&
  !!process.env.ADMIN_NOTIFICATION_EMAIL;

function getTransporter() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT),
    secure: String(process.env.SMTP_SECURE).toLowerCase() === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  });
}

function escapeHtml(value = '') {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function renderMultilineHtml(value = '') {
  return escapeHtml(value).replace(/\r?\n/g, '<br/>');
}

function buildPrayerRequestNotification(prayerRequest = {}) {
  return {
    subject: 'Prayer Request Baru Masuk',
    text: `Nama: ${prayerRequest.name}\n\nPermohonan:\n${prayerRequest.request}`,
    html: `<p><strong>Nama:</strong> ${escapeHtml(prayerRequest.name)}</p><p><strong>Permohonan:</strong><br/>${renderMultilineHtml(prayerRequest.request)}</p>`
  };
}

function buildContactMessageNotification(contactMessage = {}) {
  return {
    subject: `Pesan Kontak Baru: ${String(contactMessage.subject || '').trim()}`,
    text: `Nama: ${contactMessage.name}\nEmail: ${contactMessage.email}\nSubjek: ${contactMessage.subject}\n\nPesan:\n${contactMessage.message}`,
    html: `
        <p><strong>Nama:</strong> ${escapeHtml(contactMessage.name)}</p>
        <p><strong>Email:</strong> ${escapeHtml(contactMessage.email)}</p>
        <p><strong>Subjek:</strong> ${escapeHtml(contactMessage.subject)}</p>
        <p><strong>Pesan:</strong><br/>${renderMultilineHtml(contactMessage.message)}</p>
      `
  };
}

async function sendPrayerRequestNotification(prayerRequest) {
  if (!mailEnabled) {
    return { sent: false, skipped: true };
  }

  try {
    const transporter = getTransporter();
    const message = buildPrayerRequestNotification(prayerRequest);
    await transporter.sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to: process.env.ADMIN_NOTIFICATION_EMAIL,
      ...message
    });

    return { sent: true, skipped: false };
  } catch (error) {
    console.error('Email notification failed:', error.message);
    return { sent: false, skipped: true };
  }
}

async function sendContactMessageNotification(contactMessage) {
  if (!mailEnabled) {
    return { sent: false, skipped: true };
  }

  try {
    const transporter = getTransporter();
    const message = buildContactMessageNotification(contactMessage);
    await transporter.sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to: process.env.ADMIN_NOTIFICATION_EMAIL,
      ...message
    });

    return { sent: true, skipped: false };
  } catch (error) {
    console.error('Email notification failed:', error.message);
    return { sent: false, skipped: true };
  }
}

module.exports = {
  sendPrayerRequestNotification,
  sendContactMessageNotification,
  buildPrayerRequestNotification,
  buildContactMessageNotification
};
