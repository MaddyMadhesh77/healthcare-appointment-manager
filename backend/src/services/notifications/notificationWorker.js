const prisma = require('../../config/db');
const env = require('../../config/env');
const { sendEmail } = require('../email/email.service');
const { TEMPLATES } = require('../email/templates');

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

// Every send goes through this single path, whether it's a booking
// confirmation, a leave cancellation, or a medication reminder — so one
// retry/backoff mechanism covers all notification types instead of each
// caller re-implementing its own.
async function processPendingNotifications(batchSize = 20) {
  const rows = await prisma.notificationLog.findMany({
    where: {
      type: 'EMAIL',
      status: { in: ['PENDING', 'FAILED'] },
      retryCount: { lt: env.notificationMaxRetries },
    },
    orderBy: { createdAt: 'asc' },
    take: batchSize,
  });

  let sent = 0;
  for (const row of rows) {
    try {
      const email = await buildEmail(row);
      await sendEmail(email);
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
