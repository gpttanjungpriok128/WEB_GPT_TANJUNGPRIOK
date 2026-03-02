const { PrayerRequest } = require('../models');
const { sendPrayerRequestNotification } = require('../services/emailService');

async function createPrayerRequest(req, res, next) {
  try {
    const prayerRequest = await PrayerRequest.create(req.body);
    await sendPrayerRequestNotification(prayerRequest);
    return res.status(201).json({ message: 'Prayer request submitted', data: prayerRequest });
  } catch (error) {
    return next(error);
  }
}

async function getPrayerRequests(req, res, next) {
  try {
    const data = await PrayerRequest.findAll({ order: [['createdAt', 'DESC']] });
    return res.status(200).json(data);
  } catch (error) {
    return next(error);
  }
}

async function markPrayerRequestRead(req, res, next) {
  try {
    const prayerRequest = await PrayerRequest.findByPk(req.params.id);
    if (!prayerRequest) {
      return res.status(404).json({ message: 'Prayer request not found' });
    }

    prayerRequest.isRead = true;
    await prayerRequest.save();
    return res.status(200).json(prayerRequest);
  } catch (error) {
    return next(error);
  }
}

async function completePrayerRequest(req, res, next) {
  try {
    const prayerRequest = await PrayerRequest.findByPk(req.params.id);
    if (!prayerRequest) {
      return res.status(404).json({ message: 'Prayer request not found' });
    }

    prayerRequest.isRead = true;
    await prayerRequest.save();
    return res.status(200).json({
      message: 'Prayer request marked as completed',
      data: prayerRequest
    });
  } catch (error) {
    return next(error);
  }
}

async function deletePrayerRequest(req, res, next) {
  try {
    const prayerRequest = await PrayerRequest.findByPk(req.params.id);
    if (!prayerRequest) {
      return res.status(404).json({ message: 'Prayer request not found' });
    }

    if (!prayerRequest.isRead) {
      return res.status(409).json({ message: 'Only completed prayer requests can be deleted' });
    }

    await prayerRequest.destroy();
    return res.status(200).json({ message: 'Prayer request deleted' });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  createPrayerRequest,
  getPrayerRequests,
  markPrayerRequestRead,
  completePrayerRequest,
  deletePrayerRequest
};
