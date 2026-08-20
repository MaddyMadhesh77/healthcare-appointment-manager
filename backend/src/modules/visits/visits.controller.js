const service = require('./visits.service');

async function create(req, res, next) {
  try {
    const visitNote = await service.createVisit(req.user.id, req.params.appointmentId, req.body);
    res.status(201).json(visitNote);
  } catch (err) {
    next(err);
  }
}

async function getOne(req, res, next) {
  try {
    const visitNote = await service.getByAppointment(req.user, req.params.appointmentId);
    res.json(visitNote);
  } catch (err) {
    next(err);
  }
}

module.exports = { create, getOne };
