const jwt = require('jsonwebtoken');
const env = require('../config/env');
const { AppError } = require('./errorHandler');

function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');
  if (scheme !== 'Bearer' || !token) {
    return next(new AppError(401, 'Missing or invalid Authorization header'));
  }
  try {
    const payload = jwt.verify(token, env.jwtSecret);
    req.user = payload; // { id, role, email }
    next();
  } catch {
    next(new AppError(401, 'Invalid or expired token'));
  }
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return next(new AppError(401, 'Not authenticated'));
    }
    if (!roles.includes(req.user.role)) {
      return next(new AppError(403, 'Insufficient permissions'));
    }
    next();
  };
}

module.exports = { requireAuth, requireRole };
