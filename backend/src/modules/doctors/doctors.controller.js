const service = require('./doctors.service');

async function create(req, res, next) {
  try {
    const doctor = await service.createDoctor(req.body);
    res.status(201).json(doctor);
  } catch (err) {
    next(err);
  }
}

async function list(req, res, next) {
  try {
    const doctors = await service.listDoctors({ specialisation: req.query.specialisation });
    res.json(doctors);
  } catch (err) {
    next(err);
  }
}

async function getOne(req, res, next) {
  try {
    const doctor = await service.getDoctorById(req.params.id);
    res.json(doctor);
  } catch (err) {
    next(err);
  }
}

async function update(req, res, next) {
  try {
    const doctor = await service.updateDoctor(req.params.id, req.body);
    res.json(doctor);
  } catch (err) {
    next(err);
  }
}

async function addLeave(req, res, next) {
  try {
    const result = await service.addLeave(req.params.id, req.body);
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
}

async function removeLeave(req, res, next) {
  try {
    await service.removeLeave(req.params.id, req.params.leaveId);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

async function listLeaves(req, res, next) {
  try {
    const leaves = await service.listLeaves(req.params.id);
    res.json(leaves);
  } catch (err) {
    next(err);
  }
}

module.exports = { create, list, getOne, update, addLeave, removeLeave, listLeaves };
