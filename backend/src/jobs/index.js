const { startNotificationRetryJob } = require('./notificationRetry.job');
const { startMedicationReminderJob } = require('./medicationReminder.job');

function startJobs() {
  const tasks = [startNotificationRetryJob(), startMedicationReminderJob()];
  return () => tasks.forEach((t) => t.stop());
}

module.exports = { startJobs };
