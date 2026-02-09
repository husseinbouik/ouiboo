#!/usr/bin/env node
/**
 * Seed minimal test data for E2E runs.
 * Requires DATABASE_URL env var pointing to test database.
 */
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Seeding test data...');
  try {
    await prisma.user.createMany({ data: [
      { email: 'admin@test.local', name: 'Admin', role: 'ADMIN' },
      { email: 'agency@test.local', name: 'Agency', role: 'AGENCY' },
      { email: 'traveler@test.local', name: 'Traveler', role: 'TRAVELER' }
    ] });
  } catch (e) {
    console.warn('Seed warning:', e.message);
  }
  console.log('Seeding complete.');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => process.exit(0));
