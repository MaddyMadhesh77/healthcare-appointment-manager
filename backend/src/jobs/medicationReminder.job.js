const cron = require('node-cron');
const prisma = require('../config/db');
const env = require('../config/env');
const { queueNotification } = require('../services/notifications/notificationQueue');

// Each due reminder queues one EMAIL notification (reusing the same
// NotificationLog + retry worker as booking emails), then either advances
// to the next dose time or, once remainingDoses hits 0, marks the course
// complete. Advancing nextSendAt from the reminder's own previous value
// (rather than from "now") keeps the dosing cadence stable even if a poll
// tick is late.
async function processDueReminders(batchSize = 50) {
  const due = await prisma.medicationReminder.findMany({
    where: { status: 'SCHEDULED', nextSendAt: { lte: new Date() } },
    include: { visitNote: { include: { appointment: true } } },
    take: batchSize,
  });

  for (const reminder of due) {
    const { appointmentId, patientId } = reminder.visitNote.appointment;
    await prisma.$transaction(async (tx) => {
      await queueNotification(tx, {
        type: 'EMAIL',
        appointmentId,
        recipientId: patientId,
        payload: {
          template: 'medication_reminder',
          medicationName: reminder.medicationName,
          dosage: reminder.dosage,
        },
      });

      const remaining = reminder.remainingDoses - 1;
      if (remaining <= 0) {
        await tx.medicationReminder.update({
          where: { id: reminder.id },
          data: { remainingDoses: 0, status: 'SENT' },
        });
      } else {
        await tx.medicationReminder.update({
          where: { id: reminder.id },
          data: {
            remainingDoses: remaining,
            nextSendAt: new Date(reminder.nextSendAt.getTime() + reminder.intervalHours * 3600000),
          },
        });
      }
    });
  }

  return { queued: due.length };
}

function startMedicationReminderJob() {
  return cron.schedule(env.reminderPollCron, async () => {
    try {
      const { queued } = await processDueReminders();
      if (queued > 0) {
        console.log(`[reminder-job] queued=${queued}`);
      }
    } catch (err) {
      console.error('[reminder-job] tick failed:', err.message);
    }
  });
}

module.exports = { startMedicationReminderJob, processDueReminders };
