const express = require('express');
const cors = require('cors');
const env = require('./config/env');
const { notFoundHandler, errorHandler } = require('./middleware/errorHandler');

const authRoutes = require('./modules/auth/auth.routes');
const { adminRouter: adminDoctorsRoutes, publicRouter: doctorsRoutes } = require('./modules/doctors/doctors.routes');
const appointmentsRoutes = require('./modules/appointments/appointments.routes');
const visitsRoutes = require('./modules/visits/visits.routes');

const app = express();

app.use(cors({ origin: env.frontendUrl, credentials: true }));
app.use(express.json());

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

app.use('/api/auth', authRoutes);
app.use('/api/admin/doctors', adminDoctorsRoutes);
app.use('/api/doctors', doctorsRoutes);
app.use('/api/appointments', appointmentsRoutes);
app.use('/api/visits', visitsRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
