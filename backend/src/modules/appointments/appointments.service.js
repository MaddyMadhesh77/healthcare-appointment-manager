const prisma = require('../../config/db');
const env = require('../../config/env');
const { AppError } = require('../../middleware/errorHandler');
const { queueNotification } = require('../../services/notifications/notificationQueue');
const { dayBoundsUtc } = require('../../utils/date');
const { generateSlotsForDay } = require('./slotGenerator');

async function getAvailableSlots(doctorId, dateStr) {
  const profile = await prisma.doctorProfile.findUnique({ where: { id: doctorId } });
  if (!profile) {
    throw new AppError(404, 'Doctor not found');
  }

  const { start, end } = dayBoundsUtc(dateStr);

  const leave = await prisma.doctorLeave.findUnique({
    where: { doctorId_date: { doctorId, date: start } },
  });
  if (leave) {
    return [];
  }

  const candidateSlots = generateSlotsForDay(profile.workingHours, profile.slotDurationMinutes, dateStr);
  if (candidateSlots.length === 0) {
    return [];
  }

  const blocking = await prisma.appointment.findMany({
    where: {
      doctorId,
      slotStart: { gte: start, lte: end },
      OR: [{ status: 'CONFIRMED' }, { status: 'HELD', holdExpiresAt: { gt: new Date() } }],
    },
    select: { slotStart: true },
  });
  const blockedTimes = new Set(blocking.map((b) => b.slotStart.toISOString()));

  const now = new Date();
  return candidateSlots
    .filter((s) => s.start > now && !blockedTimes.has(s.start.toISOString()))
    .map((s) => ({ slotStart: s.start.toISOString(), slotEnd: s.end.toISOString() }));
}

async function findMatchingSlot(profile, slotStartDate) {
  const dateStr = slotStartDate.toISOString().slice(0, 10);
  const candidates = generateSlotsForDay(profile.workingHours, profile.slotDurationMinutes, dateStr);
  return candidates.find((s) => s.start.getTime() === slotStartDate.getTime());
}

// The double-booking guarantee lives at the DB layer (see the partial
// unique index on Appointment(doctorId, slotStart) added in
// prisma/migrations/20260820073458_add_active_slot_unique_index). This
// function only needs to (a) sweep any stale HELD row for the slot so an
// expired hold doesn't block a fresh one, and (b) attempt the insert inside
// a transaction and translate a unique-constraint violation into a 409 —
// it never has to "check then insert" itself, so concurrent requests for
// the same slot cannot both win.
async function holdSlot(patientId, { doctorId, slotStart }) {
  const profile = await prisma.doctorProfile.findUnique({ where: { id: doctorId } });
  if (!profile) {
    throw new AppError(404, 'Doctor not found');
  }

  const slotStartDate = new Date(slotStart);
  if (slotStartDate <= new Date()) {
    throw new AppError(400, 'Cannot book a slot in the past');
  }

  const dateStr = slotStartDate.toISOString().slice(0, 10);
  const { start: dayStart } = dayBoundsUtc(dateStr);
  const leave = await prisma.doctorLeave.findUnique({
    where: { doctorId_date: { doctorId, date: dayStart } },
  });
  if (leave) {
    throw new AppError(409, 'Doctor is on leave that day');
  }

  const matchedSlot = await findMatchingSlot(profile, slotStartDate);
  if (!matchedSlot) {
    throw new AppError(400, 'Requested slot does not align with doctor availability');
  }

  try {
    return await prisma.$transaction(async (tx) => {
      await tx.appointment.updateMany({
        where: { doctorId, slotStart: slotStartDate, status: 'HELD', holdExpiresAt: { lt: new Date() } },
        data: { status: 'EXPIRED' },
      });
      const holdExpiresAt = new Date(Date.now() + env.bookingHoldMinutes * 60000);
      return tx.appointment.create({
        data: {
          patientId,
          doctorId,
          slotStart: matchedSlot.start,
          slotEnd: matchedSlot.end,
          status: 'HELD',
          holdExpiresAt,
        },
      });
    });
  } catch (err) {
    if (err.code === 'P2002') {
      throw new AppError(409, 'Slot no longer available');
    }
    throw err;
  }
}

async function confirmAppointment(patientId, appointmentId, { symptoms }) {
  const appt = await prisma.appointment.findUnique({ where: { id: appointmentId } });
  if (!appt || appt.patientId !== patientId) {
    throw new AppError(404, 'Appointment not found');
  }
  if (appt.status !== 'HELD') {
    throw new AppError(409, 'Appointment is not awaiting confirmation');
  }
  if (appt.holdExpiresAt < new Date()) {
    await prisma.appointment.update({ where: { id: appt.id }, data: { status: 'EXPIRED' } });
    throw new AppError(410, 'Hold expired — please select a slot again');
  }

  const doctorProfile = await prisma.doctorProfile.findUnique({ where: { id: appt.doctorId } });

  return prisma.$transaction(async (tx) => {
    const confirmed = await tx.appointment.update({
      where: { id: appt.id },
      data: { status: 'CONFIRMED', holdExpiresAt: null },
    });
    const symptomForm = await tx.symptomForm.create({
      data: { appointmentId: appt.id, rawSymptoms: symptoms, llmStatus: 'PENDING' },
    });
    await queueNotification(tx, {
      type: 'EMAIL',
      appointmentId: appt.id,
      recipientId: patientId,
      payload: { template: 'booking_confirmation_patient', appointmentId: appt.id, slotStart: confirmed.slotStart },
    });
    await queueNotification(tx, {
      type: 'EMAIL',
      appointmentId: appt.id,
      recipientId: doctorProfile.userId,
      payload: { template: 'booking_confirmation_doctor', appointmentId: appt.id, slotStart: confirmed.slotStart },
    });
    return { appointment: confirmed, symptomForm };
  });
}

async function cancelAppointment(user, appointmentId) {
  const appt = await prisma.appointment.findUnique({ where: { id: appointmentId } });
  if (!appt) {
    throw new AppError(404, 'Appointment not found');
  }
  if (user.role === 'PATIENT' && appt.patientId !== user.id) {
    throw new AppError(403, 'Not your appointment');
  }
  if (!['HELD', 'CONFIRMED'].includes(appt.status)) {
    throw new AppError(409, 'Appointment cannot be cancelled from its current state');
  }

  const doctorProfile = await prisma.doctorProfile.findUnique({ where: { id: appt.doctorId } });

  return prisma.$transaction(async (tx) => {
    const cancelled = await tx.appointment.update({
      where: { id: appt.id },
      data: { status: 'CANCELLED_BY_PATIENT', holdExpiresAt: null },
    });
    if (appt.status === 'CONFIRMED') {
      await queueNotification(tx, {
        type: 'EMAIL',
        appointmentId: appt.id,
        recipientId: appt.patientId,
        payload: { template: 'appointment_cancelled', appointmentId: appt.id, slotStart: appt.slotStart },
      });
      await queueNotification(tx, {
        type: 'EMAIL',
        appointmentId: appt.id,
        recipientId: doctorProfile.userId,
        payload: { template: 'appointment_cancelled', appointmentId: appt.id, slotStart: appt.slotStart },
      });
    }
    return cancelled;
  });
}

async function listForPatient(patientId) {
  return prisma.appointment.findMany({
    where: { patientId },
    include: { doctor: { include: { user: true } }, symptomForm: true, visitNote: true },
    orderBy: { slotStart: 'desc' },
  });
}

async function listForDoctorUser(userId) {
  const profile = await prisma.doctorProfile.findUnique({ where: { userId } });
  if (!profile) {
    throw new AppError(404, 'Doctor profile not found');
  }
  return prisma.appointment.findMany({
    where: { doctorId: profile.id },
    include: { patient: true, symptomForm: true, visitNote: true },
    orderBy: { slotStart: 'asc' },
  });
}

module.exports = {
  getAvailableSlots,
  holdSlot,
  confirmAppointment,
  cancelAppointment,
  listForPatient,
  listForDoctorUser,
};
