// Writes a NotificationLog row instead of sending immediately. The retry
// worker (added alongside the email service) polls PENDING/FAILED rows and
// does the actual send, so callers never block on SMTP/Calendar latency and
// a transient failure there can't drop a notification silently.
async function queueNotification(db, { type, appointmentId, recipientId, payload }) {
  return db.notificationLog.create({
    data: { type, appointmentId, recipientId, payload, status: 'PENDING' },
  });
}

module.exports = { queueNotification };
