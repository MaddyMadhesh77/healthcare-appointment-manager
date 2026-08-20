const nodemailer = require('nodemailer');
const env = require('../../config/env');

// Without SMTP configured (local dev, or a reviewer running this without
// credentials), fall back to a transport that doesn't touch the network —
// it renders the message and we log it, so the whole notification pipeline
// stays exercisable without real credentials.
const transport = env.smtpHost
  ? nodemailer.createTransport({
      host: env.smtpHost,
      port: env.smtpPort,
      secure: env.smtpPort === 465,
      auth: env.smtpUser ? { user: env.smtpUser, pass: env.smtpPass } : undefined,
    })
  : nodemailer.createTransport({ jsonTransport: true });

async function sendEmail({ to, subject, text }) {
  const info = await transport.sendMail({ from: env.smtpFrom, to, subject, text });
  if (!env.smtpHost) {
    console.log(`[DEV EMAIL] to=${to} subject="${subject}"\n${text}\n`);
  }
  return info;
}

module.exports = { sendEmail };
