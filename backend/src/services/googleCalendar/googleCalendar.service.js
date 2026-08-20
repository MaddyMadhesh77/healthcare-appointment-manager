const { google } = require('googleapis');
const jwt = require('jsonwebtoken');
const prisma = require('../../config/db');
const env = require('../../config/env');
const { AppError } = require('../../middleware/errorHandler');

const SCOPES = ['https://www.googleapis.com/auth/calendar.events'];

function assertConfigured() {
  if (!env.googleClientId || !env.googleClientSecret) {
    throw new AppError(500, 'Google Calendar is not configured on this server');
  }
}

function newOAuthClient() {
  return new google.auth.OAuth2(env.googleClientId, env.googleClientSecret, env.googleRedirectUri);
}

// The OAuth redirect is a plain browser GET from Google with no Authorization
// header, so the user is identified via a short-lived signed state token
// instead of the usual JWT middleware.
function getAuthUrl(userId) {
  assertConfigured();
  const state = jwt.sign({ userId }, env.jwtSecret, { expiresIn: '10m' });
  const client = newOAuthClient();
  return client.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: SCOPES,
    state,
  });
}

function verifyState(state) {
  try {
    const { userId } = jwt.verify(state, env.jwtSecret);
    return userId;
  } catch {
    throw new AppError(400, 'Invalid or expired OAuth state');
  }
}

async function handleCallback(code, state) {
  assertConfigured();
  const userId = verifyState(state);
  const client = newOAuthClient();
  const { tokens } = await client.getToken(code);
  if (!tokens.refresh_token) {
    // Google only returns a refresh_token on first consent; if the user
    // re-connects without revoking access first, keep the one already stored.
    const existing = await prisma.googleOAuthToken.findUnique({ where: { userId } });
    if (!existing) {
      throw new AppError(400, 'Google did not return a refresh token — revoke app access in your Google Account and try again');
    }
    tokens.refresh_token = existing.refreshToken;
  }
  await prisma.googleOAuthToken.upsert({
    where: { userId },
    create: {
      userId,
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      expiryDate: new Date(tokens.expiry_date),
    },
    update: {
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      expiryDate: new Date(tokens.expiry_date),
    },
  });
  return userId;
}

async function disconnect(userId) {
  await prisma.googleOAuthToken.deleteMany({ where: { userId } });
}

async function isConnected(userId) {
  const token = await prisma.googleOAuthToken.findUnique({ where: { userId } });
  return Boolean(token);
}

// Returns null (not an error) when the user hasn't connected Calendar —
// callers treat that as "skip, nothing to sync" rather than a failure.
async function getAuthorizedClientForUser(userId) {
  const tokenRow = await prisma.googleOAuthToken.findUnique({ where: { userId } });
  if (!tokenRow) {
    return null;
  }
  const client = newOAuthClient();
  client.setCredentials({
    access_token: tokenRow.accessToken,
    refresh_token: tokenRow.refreshToken,
    expiry_date: tokenRow.expiryDate.getTime(),
  });
  client.on('tokens', async (tokens) => {
    await prisma.googleOAuthToken.update({
      where: { userId },
      data: {
        accessToken: tokens.access_token || tokenRow.accessToken,
        refreshToken: tokens.refresh_token || tokenRow.refreshToken,
        ...(tokens.expiry_date ? { expiryDate: new Date(tokens.expiry_date) } : {}),
      },
    });
  });
  return google.calendar({ version: 'v3', auth: client });
}

module.exports = { getAuthUrl, handleCallback, disconnect, isConnected, getAuthorizedClientForUser };
