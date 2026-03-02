const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

function getCloudinaryConfig() {
  return {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME?.trim(),
    apiKey: process.env.CLOUDINARY_API_KEY?.trim(),
    apiSecret: process.env.CLOUDINARY_API_SECRET?.trim(),
    folder: process.env.CLOUDINARY_FOLDER?.trim() || 'gpt-tanjungpriok/articles'
  };
}

function isCloudinaryConfigured() {
  const { cloudName, apiKey, apiSecret } = getCloudinaryConfig();
  return Boolean(cloudName && apiKey && apiSecret);
}

function getMimeTypeFromExtension(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === '.png') return 'image/png';
  if (ext === '.webp') return 'image/webp';
  return 'image/jpeg';
}

function buildUploadSignature(params, apiSecret) {
  const serialized = Object.entries(params)
    .filter(([, value]) => value !== undefined && value !== null && String(value).length > 0)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`)
    .join('&');

  return crypto.createHash('sha1').update(`${serialized}${apiSecret}`).digest('hex');
}

async function uploadLocalImageToCloudinary(localPath, options = {}) {
  const { cloudName, apiKey, apiSecret, folder: defaultFolder } = getCloudinaryConfig();
  if (!cloudName || !apiKey || !apiSecret) {
    throw new Error('Cloudinary env is not configured');
  }

  const folder = options.folder || defaultFolder;
  const timestamp = Math.floor(Date.now() / 1000);
  const paramsToSign = { folder, timestamp };
  const signature = buildUploadSignature(paramsToSign, apiSecret);

  const fileBuffer = await fs.promises.readFile(localPath);
  const mimeType = getMimeTypeFromExtension(localPath);
  const dataUri = `data:${mimeType};base64,${fileBuffer.toString('base64')}`;

  const formData = new FormData();
  formData.append('file', dataUri);
  formData.append('api_key', apiKey);
  formData.append('timestamp', String(timestamp));
  formData.append('signature', signature);
  formData.append('folder', folder);

  const endpoint = `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`;
  const response = await fetch(endpoint, {
    method: 'POST',
    body: formData
  });

  const payload = await response.json();
  if (!response.ok) {
    const detail = payload?.error?.message || 'Unknown Cloudinary upload error';
    throw new Error(`Cloudinary upload failed: ${detail}`);
  }

  if (!payload.secure_url) {
    throw new Error('Cloudinary upload failed: missing secure_url');
  }

  return payload.secure_url;
}

module.exports = {
  isCloudinaryConfigured,
  uploadLocalImageToCloudinary
};
