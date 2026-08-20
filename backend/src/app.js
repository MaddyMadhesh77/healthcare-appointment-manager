const express = require('express');
const cors = require('cors');
const env = require('./config/env');
const { notFoundHandler, errorHandler } = require('./middleware/errorHandler');

const authRoutes = require('./modules/auth/auth.routes');

const app = express();

app.use(cors({ origin: env.frontendUrl, credentials: true }));
app.use(express.json());

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

app.use('/api/auth', authRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
