const { Op } = require('sequelize');
const { CongregationMember, User } = require('../models');

const CATEGORY_TO_GENDER = {
  kaum_pria: 'pria',
  kaum_wanita: 'wanita',
  kaum_muda: null,
  sekolah_minggu: null
};

function sanitizePayload(body = {}) {
  return {
    fullName: body.fullName,
    birthDate: body.birthDate,
    category: body.category,
    phone: body.phone || null,
    address: body.address
  };
}

function buildMemberFilter(query) {
  const where = {};
  const search = (query.search || '').trim();

  if (query.category) {
    where.category = query.category;
  }

  if (search) {
    where[Op.or] = [
      { fullName: { [Op.iLike]: `%${search}%` } },
      { phone: { [Op.iLike]: `%${search}%` } },
      { address: { [Op.iLike]: `%${search}%` } }
    ];
  }

  return where;
}

async function getCongregationMembers(req, res, next) {
  try {
    const where = buildMemberFilter(req.query);
    if (req.user.role === 'jemaat') {
      where.submittedByUserId = req.user.id;
    }

    const members = await CongregationMember.findAll({
      where,
      include: req.user.role === 'admin'
        ? [{ model: User, as: 'submitter', attributes: ['id', 'name', 'email'] }]
        : [],
      order: [['fullName', 'ASC']]
    });
    return res.status(200).json(members);
  } catch (error) {
    return next(error);
  }
}

async function createCongregationMember(req, res, next) {
  try {
    const payload = sanitizePayload(req.body);
    payload.submittedByUserId = req.user.id;

    // Keep legacy gender column compatible with existing table data.
    payload.gender = CATEGORY_TO_GENDER[payload.category];

    const member = await CongregationMember.create(payload);
    return res.status(201).json(member);
  } catch (error) {
    return next(error);
  }
}

async function updateCongregationMember(req, res, next) {
  try {
    const where = { id: req.params.id };
    if (req.user.role === 'jemaat') {
      where.submittedByUserId = req.user.id;
    }

    const member = await CongregationMember.findOne({ where });
    if (!member) {
      return res.status(404).json({ message: 'Data jemaat tidak ditemukan' });
    }

    const payload = sanitizePayload(req.body);
    payload.gender = CATEGORY_TO_GENDER[payload.category];

    await member.update(payload);
    return res.status(200).json(member);
  } catch (error) {
    return next(error);
  }
}

async function deleteCongregationMember(req, res, next) {
  try {
    const where = { id: req.params.id };
    if (req.user.role === 'jemaat') {
      where.submittedByUserId = req.user.id;
    }

    const member = await CongregationMember.findOne({ where });
    if (!member) {
      return res.status(404).json({ message: 'Data jemaat tidak ditemukan' });
    }

    await member.destroy();
    return res.status(200).json({ message: 'Data jemaat berhasil dihapus' });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  getCongregationMembers,
  createCongregationMember,
  updateCongregationMember,
  deleteCongregationMember
};
