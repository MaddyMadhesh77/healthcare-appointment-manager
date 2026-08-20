const prisma = require('../../config/db');
const { getAuthorizedClientForUser } = require('./googleCalendar.service');

function eventBody(appointment, recipientId) {
  const isPatient = recipientId === appointment.patientId;
  const otherParty = isPatient ? appointment.doctor.user.name : appointment.patient.name;
  return {
    summary: `Appointment with ${otherParty}`,
    description: 'Healthcare appointment — HCA Clinic',
    start: { dateTime: appointment.slotStart.toISOString() },
    end: { dateTime: appointment.slotEnd.toISOString() },
  };
}

// Dispatches a CALENDAR NotificationLog row: action is 'create', 'update',
// or 'delete'. A user who hasn't connected Calendar is a no-op, not a
// failure — calendar sync is optional and must never block booking.
async function syncCalendarEvent(row) {
  const calendar = await getAuthorizedClientForUser(row.recipientId);
  if (!calendar) {
    return { skipped: true, reason: 'Calendar not connected' };
  }

  const existing = await prisma.calendarEvent.findUnique({
    where: { appointmentId_userId: { appointmentId: row.appointmentId, userId: row.recipientId } },
  });

  if (row.payload.action === 'delete') {
    if (existing) {
      try {
        await calendar.events.delete({ calendarId: 'primary', eventId: existing.googleEventId });
      } catch (err) {
        if (err.code !== 404 && err.code !== 410) throw err;
      }
      await prisma.calendarEvent.update({ where: { id: existing.id }, data: { status: 'deleted' } });
    }
    return { skipped: false };
  }

  const appointment = await prisma.appointment.findUnique({
    where: { id: row.appointmentId },
    include: { patient: true, doctor: { include: { user: true } } },
  });
  const body = eventBody(appointment, row.recipientId);

  if (existing) {
    await calendar.events.update({ calendarId: 'primary', eventId: existing.googleEventId, requestBody: body });
  } else {
    const res = await calendar.events.insert({ calendarId: 'primary', requestBody: body });
    await prisma.calendarEvent.create({
      data: { appointmentId: row.appointmentId, userId: row.recipientId, googleEventId: res.data.id, status: 'active' },
    });
  }
  return { skipped: false };
}

module.exports = { syncCalendarEvent };
