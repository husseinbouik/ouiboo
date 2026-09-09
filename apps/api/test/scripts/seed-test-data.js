#!/usr/bin/env node
/**
 * Seed minimal test data for E2E runs.
 * Requires DATABASE_URL env var pointing to test database.
 */
const path = require('node:path');
const bcrypt = require('bcrypt');
const { PrismaClient } = require(path.resolve(
  __dirname,
  '../../../../packages/database/generated-client',
));
const prisma = new PrismaClient();

async function main() {
  console.log('Seeding test data...');
  const password = await bcrypt.hash('e2e-test-password', 10);
  try {
    await prisma.user.createMany({ data: [
      { email: 'admin@test.local', name: 'Admin', password, role: 'ADMIN', isEmailVerified: true },
      { email: 'agency@test.local', name: 'Agency', password, role: 'AGENCY', isEmailVerified: true },
      { email: 'traveler@test.local', name: 'Traveler', password, role: 'TRAVELER', isEmailVerified: true }
    ] });
  } catch (e) {
    console.warn('Seed warning:', e.message);
  }
  console.log('Seeding complete.');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
