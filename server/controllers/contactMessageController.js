const { ContactMessage } = require('../models');
const { sendContactMessageNotification } = require('../services/emailService');

async function createContactMessage(req, res, next) {
  try {
    const payload = {
      name: String(req.body.name || '').trim(),
      email: String(req.body.email || '').trim().toLowerCase(),
      subject: String(req.body.subject || '').trim(),
      message: String(req.body.message || '').trim()
    };

    const contactMessage = await ContactMessage.create(payload);
    await sendContactMessageNotification(contactMessage);

    return res.status(201).json({
      message: 'Pesan berhasil dikirim. Tim kami akan menindaklanjuti secepatnya.',
      data: {
        id: contactMessage.id,
        createdAt: contactMessage.createdAt
      }
    });
  } catch (error) {
    return next(error);
  }
}

async function getContactMessages(req, res, next) {
  try {
    const data = await ContactMessage.findAll({
      order: [
        ['isRead', 'ASC'],
        ['createdAt', 'DESC']
      ]
    });

    return res.status(200).json(data);
  } catch (error) {
    return next(error);
  }
}

async function markContactMessageRead(req, res, next) {
  try {
    const contactMessage = await ContactMessage.findByPk(req.params.id);
    if (!contactMessage) {
      return res.status(404).json({ message: 'Pesan kontak tidak ditemukan' });
    }

    if (!contactMessage.isRead) {
      contactMessage.isRead = true;
      await contactMessage.save();
    }

    return res.status(200).json({
      message: 'Pesan kontak ditandai sudah dibaca',
      data: contactMessage
    });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  createContactMessage,
  getContactMessages,
  markContactMessageRead
};
