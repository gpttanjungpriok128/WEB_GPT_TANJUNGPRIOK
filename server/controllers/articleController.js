const fs = require('fs');
const { Op } = require('sequelize');
const { Article, User } = require('../models');
const { isCloudinaryConfigured, uploadLocalImageToCloudinary } = require('../services/cloudinaryService');

const ARTICLE_STATUS = ['draft', 'pending', 'published', 'rejected'];

function canManageArticle(user, article) {
  if (!user) {
    return false;
  }

  if (user.role === 'admin') {
    return true;
  }

  if (user.role === 'multimedia' && article.authorId === user.id) {
    return true;
  }

  return false;
}

function buildSearchWhere(search) {
  if (!search) {
    return {};
  }

  return {
    [Op.or]: [
      { title: { [Op.iLike]: `%${search}%` } },
      { content: { [Op.iLike]: `%${search}%` } }
    ]
  };
}

async function removeLocalUpload(file) {
  if (!file?.path) {
    return;
  }

  try {
    await fs.promises.unlink(file.path);
  } catch (error) {
    if (error.code !== 'ENOENT') {
      throw error;
    }
  }
}

async function removePersistedArticleImage(publicPath) {
  if (!publicPath || !String(publicPath).startsWith('/uploads/')) {
    return;
  }

  const fileName = String(publicPath).split('/').pop();
  if (!fileName) {
    return;
  }

  try {
    await fs.promises.unlink(`${__dirname}/../uploads/${fileName}`);
  } catch (error) {
    if (error.code !== 'ENOENT') {
      throw error;
    }
  }
}

async function resolveArticleImage(file) {
  if (!file) {
    return null;
  }

  if (!isCloudinaryConfigured()) {
    return `/uploads/${file.filename}`;
  }

  try {
    return await uploadLocalImageToCloudinary(file.path, {
      folder: process.env.CLOUDINARY_FOLDER || 'gpt-tanjungpriok/articles'
    });
  } finally {
    await removeLocalUpload(file);
  }
}

async function getArticles(req, res, next) {
  try {
    const page = Math.max(Number(req.query.page) || 1, 1);
    const limit = Math.max(Number(req.query.limit) || 6, 1);
    const search = req.query.search || '';
    const offset = (page - 1) * limit;

    const where = {
      ...buildSearchWhere(search),
      status: 'published'
    };

    const { rows, count } = await Article.findAndCountAll({
      where,
      include: [{ model: User, as: 'author', attributes: ['id', 'name'] }],
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
        totalPages: Math.ceil(count / limit)
      }
    });
  } catch (error) {
    return next(error);
  }
}

async function getManageArticles(req, res, next) {
  try {
    const page = Math.max(Number(req.query.page) || 1, 1);
    const limit = Math.max(Number(req.query.limit) || 10, 1);
    const search = req.query.search || '';
    const status = req.query.status;
    const offset = (page - 1) * limit;

    const where = buildSearchWhere(search);

    if (status && ARTICLE_STATUS.includes(status)) {
      where.status = status;
    }

    if (req.user.role === 'multimedia') {
      where.authorId = req.user.id;
    }

    const { rows, count } = await Article.findAndCountAll({
      where,
      include: [
        { model: User, as: 'author', attributes: ['id', 'name'] },
        { model: User, as: 'approver', attributes: ['id', 'name'] }
      ],
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
        totalPages: Math.ceil(count / limit)
      }
    });
  } catch (error) {
    return next(error);
  }
}

async function getArticleById(req, res, next) {
  try {
    const article = await Article.findByPk(req.params.id, {
      include: [
        { model: User, as: 'author', attributes: ['id', 'name'] },
        { model: User, as: 'approver', attributes: ['id', 'name'] }
      ]
    });

    if (!article) {
      return res.status(404).json({ message: 'Article not found' });
    }

    if (article.status !== 'published' && !canManageArticle(req.user, article)) {
      return res.status(404).json({ message: 'Article not found' });
    }

    return res.status(200).json(article);
  } catch (error) {
    return next(error);
  }
}

async function createArticle(req, res, next) {
  let image = null;

  try {
    const { title, content } = req.body;
    const requestedStatus = req.body.status;
    image = await resolveArticleImage(req.file);

    let status = 'pending';
    let approvedBy = null;
    let approvedAt = null;

    if (req.user.role === 'admin') {
      status = ARTICLE_STATUS.includes(requestedStatus) ? requestedStatus : 'published';
      if (status === 'published' || status === 'rejected') {
        approvedBy = req.user.id;
        approvedAt = new Date();
      }
    }

    if (req.user.role === 'multimedia') {
      status = requestedStatus === 'draft' ? 'draft' : 'pending';
    }

    const article = await Article.create({
      title,
      content,
      image,
      status,
      approvedBy,
      approvedAt,
      authorId: req.user.id
    });

    return res.status(201).json(article);
  } catch (error) {
    await removePersistedArticleImage(image);
    return next(error);
  }
}

async function updateArticle(req, res, next) {
  try {
    const { title, content, status: requestedStatus } = req.body;
    const article = await Article.findByPk(req.params.id);

    if (!article) {
      return res.status(404).json({ message: 'Article not found' });
    }

    if (!canManageArticle(req.user, article)) {
      return res.status(403).json({ message: 'Forbidden: cannot update this article' });
    }

    if (req.file) {
      const previousImage = article.image;
      article.image = await resolveArticleImage(req.file);
      await removePersistedArticleImage(previousImage);
    }

    article.title = title ?? article.title;
    article.content = content ?? article.content;

    if (req.user.role === 'admin') {
      if (requestedStatus && ARTICLE_STATUS.includes(requestedStatus)) {
        article.status = requestedStatus;
      }

      if (article.status === 'published' || article.status === 'rejected') {
        article.approvedBy = req.user.id;
        article.approvedAt = new Date();
      }

      if (article.status === 'pending' || article.status === 'draft') {
        article.approvedBy = null;
        article.approvedAt = null;
      }
    }

    if (req.user.role === 'multimedia') {
      article.status = requestedStatus === 'draft' ? 'draft' : 'pending';
      article.approvedBy = null;
      article.approvedAt = null;
    }

    await article.save();
    return res.status(200).json(article);
  } catch (error) {
    return next(error);
  }
}

async function reviewArticle(req, res, next) {
  try {
    const { action } = req.body;
    if (!['approve', 'reject'].includes(action)) {
      return res.status(422).json({ message: 'Invalid action. Use approve or reject' });
    }

    const article = await Article.findByPk(req.params.id);
    if (!article) {
      return res.status(404).json({ message: 'Article not found' });
    }

    article.status = action === 'approve' ? 'published' : 'rejected';
    article.approvedBy = req.user.id;
    article.approvedAt = new Date();
    await article.save();

    return res.status(200).json({ message: `Article ${action}d`, data: article });
  } catch (error) {
    return next(error);
  }
}

async function deleteArticle(req, res, next) {
  try {
    const article = await Article.findByPk(req.params.id);

    if (!article) {
      return res.status(404).json({ message: 'Article not found' });
    }

    if (!canManageArticle(req.user, article)) {
      return res.status(403).json({ message: 'Forbidden: cannot delete this article' });
    }

    if (req.user.role === 'multimedia' && article.status === 'published') {
      return res.status(403).json({ message: 'Published article can only be deleted by admin' });
    }

    const oldImage = article.image;
    await article.destroy();
    await removePersistedArticleImage(oldImage);
    return res.status(200).json({ message: 'Article deleted' });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  getArticles,
  getManageArticles,
  getArticleById,
  createArticle,
  updateArticle,
  reviewArticle,
  deleteArticle
};
