const cron = require('node-cron');
const env = require('../config/env');
const { processPendingNotifications } = require('../services/notifications/notificationWorker');

function startNotificationRetryJob() {
  return cron.schedule(env.notificationPollCron, async () => {
    try {
      const { processed, sent } = await processPendingNotifications();
      if (processed > 0) {
        console.log(`[notification-worker] processed=${processed} sent=${sent}`);
      }
    } catch (err) {
      console.error('[notification-worker] tick failed:', err.message);
    }
  });
}

module.exports = { startNotificationRetryJob };
