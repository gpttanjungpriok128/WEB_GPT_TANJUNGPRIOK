const fs = require('fs');
const path = require('path');
const { Op } = require('sequelize');
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
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 12));
    const offset = (page - 1) * limit;
    const search = String(req.query.search || '').trim();

    const whereSql = search ? 'WHERE title ILIKE :search' : '';
    const replacements = search
      ? { search: `%${search}%`, limit, offset }
      : { limit, offset };

    const [countRows] = await Gallery.sequelize.query(
      `SELECT COUNT(DISTINCT title) AS total FROM "Galleries" ${whereSql};`,
      { replacements }
    );

    const total = Number(countRows?.[0]?.total) || 0;

    const [rows] = await Gallery.sequelize.query(
      `SELECT * FROM (
        SELECT DISTINCT ON (title)
          id,
          title,
          image,
          "createdAt" AS "coverCreatedAt",
          COUNT(*) OVER (PARTITION BY title) AS total,
          MAX("createdAt") OVER (PARTITION BY title) AS "updatedAt"
        FROM "Galleries"
        ${whereSql}
        ORDER BY title, "createdAt" DESC
      ) AS albums
      ORDER BY "updatedAt" DESC
      LIMIT :limit OFFSET :offset;`,
      { replacements }
    );

    const data = rows.map((row) => ({
      title: row.title,
      total: Number(row.total) || 0,
      updatedAt: row.updatedAt,
      cover: {
        id: row.id,
        title: row.title,
        image: row.image,
        createdAt: row.coverCreatedAt
      }
    }));

    return res.status(200).json({
      data,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit))
      }
    });
  } catch (error) {
    return next(error);
  }
}

async function getGalleryAlbumPhotos(req, res, next) {
  try {
    const rawTitle = String(req.params.title || '').trim();
    if (!rawTitle) {
      return res.status(400).json({ message: 'Judul album wajib diisi' });
    }

    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(60, Math.max(1, Number(req.query.limit) || 24));
    const offset = (page - 1) * limit;

    const { rows, count } = await Gallery.findAndCountAll({
      where: { title: { [Op.iLike]: rawTitle } },
      order: [['createdAt', 'DESC']],
      limit,
      offset
    });

    return res.status(200).json({
      data: rows,
      meta: {
        page,
        limit,
        total: count,
        totalPages: Math.max(1, Math.ceil(count / limit))
      }
    });
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

module.exports = { getGalleries, getGalleryAlbumPhotos, createGallery, updateGallery, deleteGallery };
