const { startNotificationRetryJob } = require('./notificationRetry.job');

function startJobs() {
  const tasks = [startNotificationRetryJob()];
  return () => tasks.forEach((t) => t.stop());
}

module.exports = { startJobs };
