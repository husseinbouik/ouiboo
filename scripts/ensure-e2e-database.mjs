import { PrismaClient } from '../packages/database/generated-client/index.js';

const databaseUrl = process.env.E2E_DATABASE_URL;
if (!databaseUrl) throw new Error('E2E_DATABASE_URL is required');

const parsed = new URL(databaseUrl);
const databaseName = parsed.pathname.replace(/^\//, '');
if (!databaseName || !/^[A-Za-z0-9_]+$/.test(databaseName) || !databaseName.endsWith('_test')) {
  throw new Error(`Refusing to create non-test database '${databaseName || '<empty>'}'`);
}

const adminUrl = process.env.E2E_ADMIN_DATABASE_URL;
if (!adminUrl) throw new Error('E2E_ADMIN_DATABASE_URL is required');
process.env.DATABASE_URL = adminUrl;

const admin = new PrismaClient();
try {
  await admin.$executeRawUnsafe(`CREATE DATABASE "${databaseName}"`);
  console.log(`[e2e-db] created database ${databaseName}`);
} catch (error) {
  const message = String(error?.message || error);
  if (message.includes('already exists') || message.includes('42P04')) {
    console.log(`[e2e-db] database ${databaseName} already exists`);
  } else {
    throw error;
  }
} finally {
  await admin.$disconnect();
}
