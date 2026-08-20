require('dotenv').config();
const bcrypt = require('bcryptjs');
const prisma = require('../src/config/db');

const ADMIN_EMAIL = process.env.SEED_ADMIN_EMAIL || 'admin@hca-clinic.example';
const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD || 'admin12345';
const ADMIN_NAME = process.env.SEED_ADMIN_NAME || 'Clinic Admin';

async function main() {
  const existing = await prisma.user.findUnique({ where: { email: ADMIN_EMAIL } });
  if (existing) {
    console.log(`Admin account already exists: ${ADMIN_EMAIL}`);
    return;
  }
  const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 10);
  await prisma.user.create({
    data: { email: ADMIN_EMAIL, passwordHash, name: ADMIN_NAME, role: 'ADMIN' },
  });
  console.log(`Created admin account: ${ADMIN_EMAIL} / ${ADMIN_PASSWORD}`);
  console.log('Set SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD env vars to override before seeding.');
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
