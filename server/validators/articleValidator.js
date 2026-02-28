const { body } = require('express-validator');

const articleValidation = [
  body('title').trim().notEmpty().withMessage('Title is required'),
  body('content').trim().notEmpty().withMessage('Content is required'),
  body('status')
    .optional()
    .isIn(['draft', 'pending', 'published', 'rejected'])
    .withMessage('Invalid status value')
];

module.exports = { articleValidation };
