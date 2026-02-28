const { Schedule } = require('../models');

async function getSchedules(req, res, next) {
  try {
    const schedules = await Schedule.findAll({ order: [['date', 'ASC']] });
    return res.status(200).json(schedules);
  } catch (error) {
    return next(error);
  }
}

async function createSchedule(req, res, next) {
  try {
    const schedule = await Schedule.create(req.body);
    return res.status(201).json(schedule);
  } catch (error) {
    return next(error);
  }
}

async function updateSchedule(req, res, next) {
  try {
    const schedule = await Schedule.findByPk(req.params.id);
    if (!schedule) {
      return res.status(404).json({ message: 'Schedule not found' });
    }

    await schedule.update(req.body);
    return res.status(200).json(schedule);
  } catch (error) {
    return next(error);
  }
}

async function deleteSchedule(req, res, next) {
  try {
    const schedule = await Schedule.findByPk(req.params.id);
    if (!schedule) {
      return res.status(404).json({ message: 'Schedule not found' });
    }

    await schedule.destroy();
    return res.status(200).json({ message: 'Schedule deleted' });
  } catch (error) {
    return next(error);
  }
}

module.exports = { getSchedules, createSchedule, updateSchedule, deleteSchedule };
