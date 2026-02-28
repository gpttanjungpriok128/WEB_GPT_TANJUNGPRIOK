const fs = require('fs');
const path = require('path');
const { Gallery } = require('../models');

const uploadsDir = path.join(__dirname, '..', 'uploads');

function getUploadedFiles(req) {
  const files = [];

  if (req.file) {
    files.push(req.file);
  }

  if (Array.isArray(req.files)) {
    files.push(...req.files);
  } else if (req.files && typeof req.files === 'object') {
    Object.values(req.files).forEach((value) => {
      if (Array.isArray(value)) {
        files.push(...value);
      }
    });
  }

  return files;
}

function toPublicImagePath(file) {
  return `/uploads/${file.filename}`;
}

async function removeImageFile(publicPath) {
  if (!publicPath) {
    return;
  }

  const fileName = path.basename(publicPath);
  if (!fileName) {
    return;
  }

  const filePath = path.join(uploadsDir, fileName);

  try {
    await fs.promises.unlink(filePath);
  } catch (error) {
    if (error.code !== 'ENOENT') {
      throw error;
    }
  }
}

async function getGalleries(req, res, next) {
  try {
    const galleries = await Gallery.findAll({ order: [['createdAt', 'DESC']] });
    return res.status(200).json(galleries);
  } catch (error) {
    return next(error);
  }
}

async function createGallery(req, res, next) {
  try {
    const title = String(req.body?.title || '').trim();
    if (!title) {
      return res.status(400).json({ message: 'Title is required' });
    }

    const files = getUploadedFiles(req);
    if (!files.length) {
      return res.status(400).json({ message: 'At least one image is required' });
    }

    const payload = files.map((file) => ({
      title,
      image: toPublicImagePath(file)
    }));

    const galleries = await Gallery.bulkCreate(payload, { returning: true });

    return res.status(201).json({
      message: `${galleries.length} photo(s) uploaded`,
      data: galleries
    });
  } catch (error) {
    return next(error);
  }
}

async function updateGallery(req, res, next) {
  try {
    const gallery = await Gallery.findByPk(req.params.id);
    if (!gallery) {
      return res.status(404).json({ message: 'Gallery not found' });
    }

    const titleFromBody = req.body?.title;
    if (titleFromBody !== undefined) {
      const nextTitle = String(titleFromBody).trim();
      if (!nextTitle) {
        return res.status(400).json({ message: 'Title cannot be empty' });
      }
      gallery.title = nextTitle;
    }

    const files = getUploadedFiles(req);
    if (files.length) {
      const oldImage = gallery.image;
      gallery.image = toPublicImagePath(files[0]);
      await gallery.save();
      await removeImageFile(oldImage);
      return res.status(200).json(gallery);
    }

    await gallery.save();
    return res.status(200).json(gallery);
  } catch (error) {
    return next(error);
  }
}

async function deleteGallery(req, res, next) {
  try {
    const gallery = await Gallery.findByPk(req.params.id);
    if (!gallery) {
      return res.status(404).json({ message: 'Gallery not found' });
    }

    const imagePath = gallery.image;
    await gallery.destroy();
    await removeImageFile(imagePath);
    return res.status(200).json({ message: 'Gallery deleted' });
  } catch (error) {
    return next(error);
  }
}

module.exports = { getGalleries, createGallery, updateGallery, deleteGallery };
