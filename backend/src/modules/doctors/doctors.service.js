const bcrypt = require('bcryptjs');
const prisma = require('../../config/db');
const { AppError } = require('../../middleware/errorHandler');
const { SALT_ROUNDS } = require('../auth/auth.service');
const { queueNotification } = require('../../services/notifications/notificationQueue');
const { dayBoundsUtc } = require('../../utils/date');

function toPublicDoctor(profile) {
  return {
    id: profile.id,
    userId: profile.userId,
    name: profile.user.name,
    email: profile.user.email,
    specialisation: profile.specialisation,
    workingHours: profile.workingHours,
    slotDurationMinutes: profile.slotDurationMinutes,
  };
}

async function createDoctor({ email, password, name, specialisation, workingHours, slotDurationMinutes }) {
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    throw new AppError(409, 'An account with this email already exists');
  }
  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

  const profile = await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: { email, passwordHash, name, role: 'DOCTOR' },
    });
    return tx.doctorProfile.create({
      data: { userId: user.id, specialisation, workingHours, slotDurationMinutes },
      include: { user: true },
    });
  });

  return toPublicDoctor(profile);
}

async function listDoctors({ specialisation } = {}) {
  const profiles = await prisma.doctorProfile.findMany({
    where: specialisation ? { specialisation: { equals: specialisation, mode: 'insensitive' } } : undefined,
    include: { user: true },
    orderBy: { createdAt: 'desc' },
  });
  return profiles.map(toPublicDoctor);
}

async function getDoctorById(id) {
  const profile = await prisma.doctorProfile.findUnique({ where: { id }, include: { user: true } });
  if (!profile) {
    throw new AppError(404, 'Doctor not found');
  }
  return toPublicDoctor(profile);
}

async function updateDoctor(id, updates) {
  const profile = await prisma.doctorProfile.findUnique({ where: { id } });
  if (!profile) {
    throw new AppError(404, 'Doctor not found');
  }
  const updated = await prisma.doctorProfile.update({
    where: { id },
    data: updates,
    include: { user: true },
  });
  return toPublicDoctor(updated);
}

// Marking a doctor on leave for a date cancels any HELD/CONFIRMED appointments
// that day and queues a cancellation notification for each affected patient,
// all inside one transaction so a leave is never recorded without its
// cancellation side effects (or vice versa).
async function addLeave(doctorId, { date, reason }) {
  const profile = await prisma.doctorProfile.findUnique({ where: { id: doctorId } });
  if (!profile) {
    throw new AppError(404, 'Doctor not found');
  }

  const existingLeave = await prisma.doctorLeave.findUnique({
    where: { doctorId_date: { doctorId, date: new Date(`${date}T00:00:00.000Z`) } },
  });
  if (existingLeave) {
    throw new AppError(409, 'Leave already recorded for this date');
  }

  const { start, end } = dayBoundsUtc(date);

  const result = await prisma.$transaction(async (tx) => {
    const leave = await tx.doctorLeave.create({
      data: { doctorId, date: start, reason },
    });

    const affected = await tx.appointment.findMany({
      where: {
        doctorId,
        slotStart: { gte: start, lte: end },
        status: { in: ['HELD', 'CONFIRMED'] },
      },
    });

    for (const appt of affected) {
      await tx.appointment.update({
        where: { id: appt.id },
        data: { status: 'CANCELLED_BY_LEAVE' },
      });
      await queueNotification(tx, {
        type: 'EMAIL',
        appointmentId: appt.id,
        recipientId: appt.patientId,
        payload: {
          template: 'appointment_cancelled_leave',
          appointmentId: appt.id,
          slotStart: appt.slotStart,
          reason: reason || 'Doctor unavailable',
        },
      });
    }

    return { leave, cancelledCount: affected.length };
  });

  return result;
}

async function removeLeave(doctorId, leaveId) {
  const leave = await prisma.doctorLeave.findUnique({ where: { id: leaveId } });
  if (!leave || leave.doctorId !== doctorId) {
    throw new AppError(404, 'Leave record not found');
  }
  await prisma.doctorLeave.delete({ where: { id: leaveId } });
}

async function listLeaves(doctorId) {
  const profile = await prisma.doctorProfile.findUnique({ where: { id: doctorId } });
  if (!profile) {
    throw new AppError(404, 'Doctor not found');
  }
  return prisma.doctorLeave.findMany({ where: { doctorId }, orderBy: { date: 'asc' } });
}

module.exports = {
  toPublicDoctor,
  createDoctor,
  listDoctors,
  getDoctorById,
  updateDoctor,
  addLeave,
  removeLeave,
  listLeaves,
};
