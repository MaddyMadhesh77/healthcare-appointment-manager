const service = require('./appointments.service');

async function getSlots(req, res, next) {
  try {
    const slots = await service.getAvailableSlots(req.query.doctorId, req.query.date);
    res.json(slots);
  } catch (err) {
    next(err);
  }
}

async function hold(req, res, next) {
  try {
    const appointment = await service.holdSlot(req.user.id, req.body);
    res.status(201).json(appointment);
  } catch (err) {
    next(err);
  }
}

async function confirm(req, res, next) {
  try {
    const result = await service.confirmAppointment(req.user.id, req.params.id, req.body);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

async function cancel(req, res, next) {
  try {
    const appointment = await service.cancelAppointment(req.user, req.params.id);
    res.json(appointment);
  } catch (err) {
    next(err);
  }
}

async function mine(req, res, next) {
  try {
    const appointments = await service.listForPatient(req.user.id);
    res.json(appointments);
  } catch (err) {
    next(err);
  }
}

async function forDoctor(req, res, next) {
  try {
    const appointments = await service.listForDoctorUser(req.user.id);
    res.json(appointments);
  } catch (err) {
    next(err);
  }
}

module.exports = { getSlots, hold, confirm, cancel, mine, forDoctor };
