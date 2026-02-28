const { LiveStreamSetting } = require('../models');

async function getLiveStreamLink(req, res, next) {
  try {
    const setting = await LiveStreamSetting.findByPk(1);
    return res.status(200).json(setting);
  } catch (error) {
    return next(error);
  }
}

async function updateLiveStreamLink(req, res, next) {
  try {
    const youtubeUrl = String(req.body?.youtubeUrl || '').trim();

    if (!youtubeUrl) {
      return res.status(400).json({ message: 'youtubeUrl is required' });
    }

    let parsedUrl;
    try {
      parsedUrl = new URL(youtubeUrl);
    } catch {
      return res.status(400).json({ message: 'Invalid URL format' });
    }

    const host = parsedUrl.hostname.replace('www.', '');
    const allowedHosts = ['youtube.com', 'm.youtube.com', 'youtu.be'];
    if (!allowedHosts.some((allowedHost) => host === allowedHost || host.endsWith(`.${allowedHost}`))) {
      return res.status(400).json({ message: 'URL must be a valid YouTube link' });
    }

    const setting = await LiveStreamSetting.findByPk(1);
    if (!setting) {
      return res.status(404).json({ message: 'Live stream setting not found' });
    }

    setting.youtubeUrl = youtubeUrl;
    await setting.save();
    return res.status(200).json({ message: 'Live stream link updated', data: setting });
  } catch (error) {
    return next(error);
  }
}

module.exports = { getLiveStreamLink, updateLiveStreamLink };
