/* eslint-disable no-console */
require('dotenv/config');
const bcrypt = require('bcrypt');
const { PrismaClient } = require('../../../packages/database/generated-client');
const db = new PrismaClient();

const roles = [
  ['TRAVELER', 'TEST_TRAVELER_EMAIL', 'TEST_TRAVELER_PASSWORD'],
  ['AGENCY', 'TEST_AGENCY_EMAIL', 'TEST_AGENCY_PASSWORD'],
  ['ADMIN', 'TEST_ADMIN_EMAIL', 'TEST_ADMIN_PASSWORD'],
];

function config() {
  const environment = process.env.TEST_IDENTITY_ENV;
  if (!['local', 'staging', 'production'].includes(environment)) throw new Error('TEST_IDENTITY_ENV must be local, staging, or production.');
  if (process.env.ALLOW_TEST_IDENTITIES !== environment) throw new Error(`Set ALLOW_TEST_IDENTITIES=${environment} to confirm the target.`);
  if (!process.env.DATABASE_URL || !process.env.API_URL) throw new Error('DATABASE_URL and API_URL are required.');
  const missing = roles.flatMap(([, email, password]) => [email, password]).filter((name) => !process.env[name]);
  if (missing.length) throw new Error(`Missing secret-manager inputs: ${missing.join(', ')}`);
  return environment;
}

async function provision() {
  const environment = config();
  const fixtureFailures = [];
  const loginFailures = [];
  const passed = [];
  for (const [role, emailVar, passwordVar] of roles) {
    const email = process.env[emailVar].trim().toLowerCase();
    const password = process.env[passwordVar];
    try {
      const hash = await bcrypt.hash(password, 10);
      const user = await db.user.upsert({ where: { email }, update: { password: hash, role, isEmailVerified: true, otp: null, otpExpiresAt: null }, create: { email, name: `${environment} ${role.toLowerCase()} test`, password: hash, role, isEmailVerified: true } });
      if (role === 'AGENCY') await db.agencyProfile.upsert({ where: { userId: user.id }, update: {}, create: { userId: user.id, companyName: `${environment} test agency`, ice: `TEST-${environment}-${user.id.slice(-8)}`, patente: 'TEST-ONLY', rib: 'TEST-ONLY', verificationStatus: 'VERIFIED' } });
    } catch (error) {
      fixtureFailures.push(`${role}: ${error.message}`);
      continue;
    }
    try {
      const response = await fetch(new URL('auth/login', process.env.API_URL.endsWith('/') ? process.env.API_URL : `${process.env.API_URL}/`), { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email, password }) });
      const body = await response.json().catch(() => ({}));
      if (!response.ok || body?.user?.role !== role) throw new Error(`HTTP ${response.status}; expected role ${role}, received ${body?.user?.role || 'none'}`);
      passed.push(role);
    } catch (error) { loginFailures.push(`${role}: ${error.message}`); }
  }
  console.log('\nTEST IDENTITY REPORT');
  console.log(`PASS: ${passed.join(', ') || 'none'}`);
  console.log(`FIXTURE/PRECONDITION FAILURE: ${fixtureFailures.join(' | ') || 'none'}`);
  console.log(`APPLICATION LOGIN FAILURE: ${loginFailures.join(' | ') || 'none'}`);
  if (fixtureFailures.length || loginFailures.length) process.exitCode = 1;
}

provision().catch((error) => { console.error(`FIXTURE/PRECONDITION FAILURE: ${error.message}`); process.exitCode = 1; }).finally(() => db.$disconnect());
