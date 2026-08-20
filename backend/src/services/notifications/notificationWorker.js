const prisma = require('../../config/db');
const env = require('../../config/env');
const { sendEmail } = require('../email/email.service');
const { TEMPLATES } = require('../email/templates');
const { syncCalendarEvent } = require('../googleCalendar/calendarSync');

async function buildEmail(row) {
  const recipient = await prisma.user.findUnique({ where: { id: row.recipientId } });
  if (!recipient) {
    throw new Error(`Recipient ${row.recipientId} not found`);
  }

  const templateFn = TEMPLATES[row.payload.template];
  if (!templateFn) {
    throw new Error(`Unknown notification template: ${row.payload.template}`);
  }

  let appointment;
  if (row.appointmentId) {
    appointment = await prisma.appointment.findUnique({
      where: { id: row.appointmentId },
      include: { patient: true, doctor: { include: { user: true } } },
    });
  }

  const { subject, text } = templateFn({ recipient, payload: row.payload, appointment });
  return { to: recipient.email, subject, text };
}

async function processOne(row) {
  if (row.type === 'EMAIL') {
    const email = await buildEmail(row);
    await sendEmail(email);
    return;
  }
  // CALENDAR: a user who hasn't connected Google Calendar is a no-op, not
  // a failure — we still mark the row SENT so it isn't retried forever.
  await syncCalendarEvent(row);
}

// Every notification — booking confirmation, cancellation, leave
// cancellation, medication reminder, calendar create/update/delete — goes
// through this single queue-and-poll path, so one retry mechanism covers
// all of them instead of each caller reimplementing its own.
async function processPendingNotifications(batchSize = 20) {
  const rows = await prisma.notificationLog.findMany({
    where: {
      status: { in: ['PENDING', 'FAILED'] },
      retryCount: { lt: env.notificationMaxRetries },
    },
    orderBy: { createdAt: 'asc' },
    take: batchSize,
  });

  let sent = 0;
  for (const row of rows) {
    try {
      await processOne(row);
      await prisma.notificationLog.update({ where: { id: row.id }, data: { status: 'SENT' } });
      sent += 1;
    } catch (err) {
      await prisma.notificationLog.update({
        where: { id: row.id },
        data: { status: 'FAILED', retryCount: { increment: 1 }, lastError: err.message },
      });
    }
  }
  return { processed: rows.length, sent };
}

module.exports = { processPendingNotifications };
