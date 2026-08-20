const env = require('../../config/env');
const calendarService = require('../../services/googleCalendar/googleCalendar.service');

async function getAuthUrl(req, res, next) {
  try {
    const url = calendarService.getAuthUrl(req.user.id);
    res.json({ url });
  } catch (err) {
    next(err);
  }
}

async function callback(req, res) {
  try {
    await calendarService.handleCallback(req.query.code, req.query.state);
    res.redirect(`${env.frontendUrl}/calendar/connected`);
  } catch (err) {
    console.error('Google Calendar OAuth callback failed:', err.message);
    res.redirect(`${env.frontendUrl}/calendar/failed`);
  }
}

async function status(req, res, next) {
  try {
    const connected = await calendarService.isConnected(req.user.id);
    res.json({ connected });
  } catch (err) {
    next(err);
  }
}

async function disconnect(req, res, next) {
  try {
    await calendarService.disconnect(req.user.id);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

module.exports = { getAuthUrl, callback, status, disconnect };
