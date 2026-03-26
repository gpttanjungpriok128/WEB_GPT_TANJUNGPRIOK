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

async function sendPrayerRequestNotification(prayerRequest) {
  if (!mailEnabled) {
    return { sent: false, skipped: true };
  }

  try {
    const transporter = getTransporter();
    await transporter.sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to: process.env.ADMIN_NOTIFICATION_EMAIL,
      subject: 'Prayer Request Baru Masuk',
      text: `Nama: ${prayerRequest.name}\n\nPermohonan:\n${prayerRequest.request}`,
      html: `<p><strong>Nama:</strong> ${prayerRequest.name}</p><p><strong>Permohonan:</strong><br/>${prayerRequest.request}</p>`
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
    await transporter.sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to: process.env.ADMIN_NOTIFICATION_EMAIL,
      subject: `Pesan Kontak Baru: ${contactMessage.subject}`,
      text: `Nama: ${contactMessage.name}\nEmail: ${contactMessage.email}\nSubjek: ${contactMessage.subject}\n\nPesan:\n${contactMessage.message}`,
      html: `
        <p><strong>Nama:</strong> ${contactMessage.name}</p>
        <p><strong>Email:</strong> ${contactMessage.email}</p>
        <p><strong>Subjek:</strong> ${contactMessage.subject}</p>
        <p><strong>Pesan:</strong><br/>${String(contactMessage.message || '').replace(/\n/g, '<br/>')}</p>
      `
    });

    return { sent: true, skipped: false };
  } catch (error) {
    console.error('Email notification failed:', error.message);
    return { sent: false, skipped: true };
  }
}

module.exports = { sendPrayerRequestNotification, sendContactMessageNotification };
