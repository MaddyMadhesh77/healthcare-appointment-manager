const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const prisma = require('../src/config/db');
const env = require('../src/config/env');
const app = require('../src/app');

const ALL_DAY_HOURS = { start: '00:00', end: '23:30' };
const OPEN_EVERY_DAY = {
  mon: ALL_DAY_HOURS,
  tue: ALL_DAY_HOURS,
  wed: ALL_DAY_HOURS,
  thu: ALL_DAY_HOURS,
  fri: ALL_DAY_HOURS,
  sat: ALL_DAY_HOURS,
  sun: ALL_DAY_HOURS,
};

function nextAlignedSlotStart() {
  const candidate = new Date(Date.now() + 2 * 60 * 60 * 1000);
  candidate.setUTCSeconds(0, 0);
  candidate.setUTCMinutes(candidate.getUTCMinutes() < 30 ? 0 : 30);
  return candidate;
}

function signToken(user) {
  return jwt.sign({ id: user.id, role: user.role, email: user.email }, env.jwtSecret, {
    expiresIn: '1h',
  });
}

test('concurrent hold requests for the same doctor+slot: exactly one succeeds', async (t) => {
  const passwordHash = await bcrypt.hash('testpassword123', 4);

  const doctorUser = await prisma.user.create({
    data: {
      email: `concurrency-doctor-${Date.now()}@test.local`,
      passwordHash,
      name: 'Concurrency Test Doctor',
      role: 'DOCTOR',
    },
  });
  const doctorProfile = await prisma.doctorProfile.create({
    data: {
      userId: doctorUser.id,
      specialisation: 'Testing',
      workingHours: OPEN_EVERY_DAY,
      slotDurationMinutes: 30,
    },
  });

  const patientCount = 5;
  const patients = await Promise.all(
    Array.from({ length: patientCount }, (_, i) =>
      prisma.user.create({
        data: {
          email: `concurrency-patient-${i}-${Date.now()}@test.local`,
          passwordHash,
          name: `Concurrency Patient ${i}`,
          role: 'PATIENT',
        },
      })
    )
  );

  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const { port } = server.address();

  t.after(async () => {
    server.close();
    await prisma.appointment.deleteMany({ where: { doctorId: doctorProfile.id } });
    await prisma.doctorProfile.delete({ where: { id: doctorProfile.id } });
    await prisma.user.delete({ where: { id: doctorUser.id } });
    await prisma.user.deleteMany({ where: { id: { in: patients.map((p) => p.id) } } });
  });

  const slotStart = nextAlignedSlotStart().toISOString();

  const responses = await Promise.all(
    patients.map((patient) =>
      fetch(`http://localhost:${port}/api/appointments/hold`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${signToken(patient)}`,
        },
        body: JSON.stringify({ doctorId: doctorProfile.id, slotStart }),
      })
    )
  );

  const statuses = responses.map((r) => r.status).sort();
  const succeeded = statuses.filter((s) => s === 201);
  const conflicted = statuses.filter((s) => s === 409);

  assert.equal(succeeded.length, 1, `expected exactly 1 success, got statuses: ${statuses.join(',')}`);
  assert.equal(conflicted.length, patientCount - 1);

  const rows = await prisma.appointment.findMany({
    where: { doctorId: doctorProfile.id, slotStart: new Date(slotStart) },
  });
  assert.equal(rows.length, 1, 'only one appointment row should exist for the slot');
  assert.equal(rows[0].status, 'HELD');
});

after(async () => {
  await prisma.$disconnect();
});
