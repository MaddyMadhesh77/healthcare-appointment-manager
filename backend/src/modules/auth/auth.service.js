const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const prisma = require('../../config/db');
const env = require('../../config/env');
const { AppError } = require('../../middleware/errorHandler');

const SALT_ROUNDS = 10;

function signToken(user) {
  return jwt.sign({ id: user.id, role: user.role, email: user.email }, env.jwtSecret, {
    expiresIn: env.jwtExpiresIn,
  });
}

function toPublicUser(user) {
  return { id: user.id, email: user.email, name: user.name, role: user.role };
}

async function registerPatient({ email, password, name }) {
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    throw new AppError(409, 'An account with this email already exists');
  }
  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
  const user = await prisma.user.create({
    data: { email, passwordHash, name, role: 'PATIENT' },
  });
  return { user: toPublicUser(user), token: signToken(user) };
}

async function login({ email, password }) {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    throw new AppError(401, 'Invalid email or password');
  }
  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    throw new AppError(401, 'Invalid email or password');
  }
  return { user: toPublicUser(user), token: signToken(user) };
}

module.exports = { registerPatient, login, toPublicUser, signToken, SALT_ROUNDS };
