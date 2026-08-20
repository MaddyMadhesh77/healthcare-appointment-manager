require('dotenv').config();

function required(name, fallback) {
  const value = process.env[name] ?? fallback;
  if (value === undefined) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return value;
}

module.exports = {
  port: Number(process.env.PORT || 4000),
  nodeEnv: process.env.NODE_ENV || 'development',
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',

  jwtSecret: required('JWT_SECRET'),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',

  llmProvider: process.env.LLM_PROVIDER || 'anthropic',
  anthropicApiKey: process.env.ANTHROPIC_API_KEY || '',
  anthropicModel: process.env.ANTHROPIC_MODEL || 'claude-sonnet-5',
  openaiApiKey: process.env.OPENAI_API_KEY || '',
  openaiModel: process.env.OPENAI_MODEL || 'gpt-4o-mini',
  llmTimeoutMs: Number(process.env.LLM_TIMEOUT_MS || 15000),

  smtpHost: process.env.SMTP_HOST || '',
  smtpPort: Number(process.env.SMTP_PORT || 587),
  smtpUser: process.env.SMTP_USER || '',
  smtpPass: process.env.SMTP_PASS || '',
  smtpFrom: process.env.SMTP_FROM || 'HCA Clinic <no-reply@hca-clinic.example>',

  googleClientId: process.env.GOOGLE_CLIENT_ID || '',
  googleClientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
  googleRedirectUri: process.env.GOOGLE_REDIRECT_URI || 'http://localhost:4000/api/calendar/oauth/callback',

  bookingHoldMinutes: Number(process.env.BOOKING_HOLD_MINUTES || 5),
  notificationMaxRetries: Number(process.env.NOTIFICATION_MAX_RETRIES || 5),
  notificationPollCron: process.env.NOTIFICATION_POLL_CRON || '*/1 * * * *',
  reminderPollCron: process.env.REMINDER_POLL_CRON || '*/5 * * * *',
};
