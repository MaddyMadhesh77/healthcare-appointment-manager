const prisma = require('../../config/db');
const { AppError } = require('../../middleware/errorHandler');
const { queueNotification } = require('../../services/notifications/notificationQueue');
const llmService = require('../../services/llm/llm.service');

function parseSummary(visitNote) {
  if (!visitNote.patientSummary) {
    return { ...visitNote, patientSummary: null };
  }
  try {
    return { ...visitNote, patientSummary: JSON.parse(visitNote.patientSummary) };
  } catch {
    return { ...visitNote, patientSummary: null };
  }
}

async function createVisit(doctorUserId, appointmentId, { doctorNotes, prescription }) {
  const doctorProfile = await prisma.doctorProfile.findUnique({ where: { userId: doctorUserId } });
  if (!doctorProfile) {
    throw new AppError(404, 'Doctor profile not found');
  }
  const appt = await prisma.appointment.findUnique({ where: { id: appointmentId } });
  if (!appt || appt.doctorId !== doctorProfile.id) {
    throw new AppError(404, 'Appointment not found');
  }
  if (appt.status !== 'CONFIRMED') {
    throw new AppError(409, 'Appointment is not in a completable state');
  }
  const existing = await prisma.visitNote.findUnique({ where: { appointmentId } });
  if (existing) {
    throw new AppError(409, 'A visit note already exists for this appointment');
  }

  // Reminder cadence: first reminder fires one dosing interval after the
  // visit, then the reminder job (see src/jobs) advances nextSendAt by
  // intervalHours and decrements remainingDoses each time it fires, until
  // the course is complete.
  const { visitNote } = await prisma.$transaction(async (tx) => {
    const note = await tx.visitNote.create({
      data: { appointmentId, doctorNotes, prescription, llmStatus: 'PENDING' },
    });
    await tx.appointment.update({ where: { id: appointmentId }, data: { status: 'COMPLETED' } });

    const now = new Date();
    for (const item of prescription) {
      const intervalHours = 24 / item.timesPerDay;
      await tx.medicationReminder.create({
        data: {
          visitNoteId: note.id,
          medicationName: item.medicationName,
          dosage: item.dosage,
          frequencyLabel: `${item.timesPerDay}x/day for ${item.durationDays} day(s)`,
          intervalHours,
          remainingDoses: item.timesPerDay * item.durationDays,
          nextSendAt: new Date(now.getTime() + intervalHours * 3600000),
          status: 'SCHEDULED',
        },
      });
    }

    await queueNotification(tx, {
      type: 'EMAIL',
      appointmentId,
      recipientId: appt.patientId,
      payload: { template: 'post_visit_summary_ready', appointmentId },
    });

    return { visitNote: note };
  });

  // Same rationale as the pre-visit summary: runs after the transaction
  // commits so a slow/failing LLM call can't hold a DB transaction open.
  let finalVisitNote = visitNote;
  try {
    const summary = await llmService.generatePostVisitSummary(doctorNotes);
    finalVisitNote = await prisma.visitNote.update({
      where: { id: visitNote.id },
      data: {
        patientSummary: JSON.stringify({
          summary: summary.summary,
          medicationSchedule: summary.medicationSchedule || [],
          followUpSteps: summary.followUpSteps || [],
        }),
        llmStatus: 'OK',
      },
    });
  } catch (err) {
    console.error('Post-visit LLM summary failed:', err.message);
    finalVisitNote = await prisma.visitNote.update({
      where: { id: visitNote.id },
      data: { llmStatus: 'FAILED' },
    });
  }

  return parseSummary(finalVisitNote);
}

async function getByAppointment(user, appointmentId) {
  const appt = await prisma.appointment.findUnique({ where: { id: appointmentId } });
  if (!appt) {
    throw new AppError(404, 'Appointment not found');
  }
  if (user.role === 'PATIENT' && appt.patientId !== user.id) {
    throw new AppError(403, 'Not your appointment');
  }
  if (user.role === 'DOCTOR') {
    const doctorProfile = await prisma.doctorProfile.findUnique({ where: { userId: user.id } });
    if (!doctorProfile || doctorProfile.id !== appt.doctorId) {
      throw new AppError(403, 'Not your appointment');
    }
  }

  const visitNote = await prisma.visitNote.findUnique({
    where: { appointmentId },
    include: { reminders: true },
  });
  if (!visitNote) {
    throw new AppError(404, 'No visit note for this appointment yet');
  }
  return parseSummary(visitNote);
}

module.exports = { createVisit, getByAppointment };
