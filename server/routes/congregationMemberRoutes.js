const express = require('express');
const {
  getCongregationMembers,
  createCongregationMember,
  updateCongregationMember,
  deleteCongregationMember
} = require('../controllers/congregationMemberController');
const { authenticate, authorizeRoles } = require('../middleware/authMiddleware');
const { validate } = require('../middleware/validationMiddleware');
const {
  createCongregationMemberValidation,
  updateCongregationMemberValidation
} = require('../validators/congregationMemberValidator');

const router = express.Router();

router.use(authenticate);
router.get('/', authorizeRoles('admin'), getCongregationMembers);
router.post(
  '/',
  authorizeRoles('admin', 'jemaat'),
  createCongregationMemberValidation,
  validate,
  createCongregationMember
);
router.put('/:id', authorizeRoles('admin'), updateCongregationMemberValidation, validate, updateCongregationMember);
router.delete('/:id', authorizeRoles('admin'), deleteCongregationMember);

module.exports = router;
