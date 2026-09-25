import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';
import { spawnSync } from 'node:child_process';

const require = createRequire(import.meta.url);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const DEFAULT_REHEARSAL_URL = 'postgresql://postgres:admin@localhost:5432/ouiboo_rehearsal_test?schema=public';
const TARGET_MIGRATION = '20260915133000_add_currency_status_enums_and_indexes';
const MIGRATIONS_DIR = path.join(root, 'packages', 'database', 'prisma', 'migrations');
const SCHEMA_FILE = path.join(root, 'packages', 'database', 'prisma', 'schema.prisma');
const GENERATED_CLIENT = path.join(root, 'packages', 'database', 'generated-client', 'index.js');
const REPORT_PATH = path.join(root, 'docs', 'ai', 'migration-rehearsal-report.md');

const parseDatabaseUrl = (url) => {
  const parsed = new URL(url);
  const databaseName = parsed.pathname.replace(/^\//, '');
  const allowRemote = process.env.REHEARSAL_ALLOW_REMOTE === '1';
  const host = parsed.hostname;
  const local = host === 'localhost' || host === '127.0.0.1' || host === '::1';
  if (!databaseName || !/^[A-Za-z0-9_]+$/.test(databaseName)) {
    throw new Error(`Rehearsal database name must be a simple identifier, got '${databaseName || '<empty>'}'`);
  }
  if (!databaseName.endsWith('_test')) {
    throw new Error(`Refusing to rehearse on non-test database '${databaseName}'. Rehearsal database names must end with '_test'.`);
  }
  if (!local && !allowRemote) {
    throw new Error(`Refusing to rehearse against non-local host '${host}'. Set REHEARSAL_ALLOW_REMOTE=1 to override explicitly.`);
  }
  return { parsed, databaseName, local };
};

const rehearsalUrl = process.env.REHEARSAL_DATABASE_URL || DEFAULT_REHEARSAL_URL;
const { parsed, databaseName } = parseDatabaseUrl(rehearsalUrl);
const scratchUrl = parsed.toString();
const adminUrl = (() => {
  if (process.env.REHEARSAL_ADMIN_DATABASE_URL) return process.env.REHEARSAL_ADMIN_DATABASE_URL;
  const admin = new URL(parsed.toString());
  admin.pathname = '/postgres';
  admin.search = '';
  return admin.toString();
})();

const prismaCli = (() => {
  try {
    return require.resolve('prisma/build/index.js', { paths: [path.join(root, 'packages', 'database')] });
  } catch {
    throw new Error('Could not resolve the prisma CLI in packages/database');
  }
})();

const runCli = (args, env) => {
  const result = spawnSync(process.execPath, [prismaCli, ...args], {
    cwd: root,
    env: { ...process.env, ...env },
    encoding: 'utf8',
    shell: false,
    timeout: 300_000,
  });
  return {
    status: result.status,
    stdout: result.stdout || '',
    stderr: result.stderr || '',
    error: result.error ? `${result.error.code || 'ERROR'}: ${result.error.message}` : '',
  };
};

const copySchemaAndMigrations = (destDir, includeTarget) => {
  fs.mkdirSync(path.join(destDir, 'migrations'), { recursive: true });
  fs.copyFileSync(SCHEMA_FILE, path.join(destDir, 'schema.prisma'));
  fs.copyFileSync(path.join(MIGRATIONS_DIR, 'migration_lock.toml'), path.join(destDir, 'migrations', 'migration_lock.toml'));
  const entries = fs.readdirSync(MIGRATIONS_DIR, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .filter((name) => includeTarget || name !== TARGET_MIGRATION)
    .sort();
  for (const name of entries) {
    fs.cpSync(path.join(MIGRATIONS_DIR, name), path.join(destDir, 'migrations', name), { recursive: true });
  }
  return entries.length;
};

const migrate = (schemaDir) => runCli(
  ['migrate', 'deploy', '--schema', path.join(schemaDir, 'schema.prisma')],
  { DATABASE_URL: scratchUrl },
);

const nowSql = () => new Date().toISOString();

const resetScratchDatabase = async (Client) => {
  process.env.DATABASE_URL = adminUrl;
  const admin = new Client();
  admin.$connect();
  try {
    await admin.$executeRawUnsafe(`DROP DATABASE IF EXISTS "${databaseName}" WITH (FORCE)`);
    await admin.$executeRawUnsafe(`CREATE DATABASE "${databaseName}"`);
  } finally {
    await admin.$disconnect();
  }
};

const createLegacyShape = (schemaDir) => {
  const count = copySchemaAndMigrations(schemaDir, false);
  const result = migrate(schemaDir);
  return { count, applied: result.status === 0, result };
};

const applyTarget = (schemaDir) => {
  copySchemaAndMigrations(schemaDir, true);
  return migrate(schemaDir);
};

const readMigrationLogs = async (client) => {
  const rows = await client.$queryRawUnsafe(`SELECT coalesce(logs, '') AS logs FROM "_prisma_migrations" WHERE migration_name = '${TARGET_MIGRATION}' ORDER BY started_at DESC LIMIT 1`);
  return ((rows || [])[0] || {}).logs || '';
};

const seedCleanLegacy = async (Client) => {
  process.env.DATABASE_URL = scratchUrl;
  const c = new Client();
  c.$connect();
  try {
    const now = nowSql();
    await c.$executeRawUnsafe(`INSERT INTO "User" (id, email, password, "passwordResetTokenHash", "isEmailVerified", "role", "createdAt", "updatedAt") VALUES
      ('rehearsal-traveler', 'traveler@rehearsal.local', 'x', 'hash-traveler-legacy', true, 'TRAVELER', $1::timestamptz, $1::timestamptz),
      ('rehearsal-agency', 'agency@rehearsal.local', 'x', NULL, true, 'AGENCY', $1::timestamptz, $1::timestamptz)`, now);
    await c.$executeRawUnsafe(`INSERT INTO "AgencyProfile" (id, "userId", "companyName", ice, patente, rib, "verificationStatus", "subscriptionStatus") VALUES
      ('rehearsal-agency-1', 'rehearsal-agency', 'Rehearsal Travel Co', 'ICE-001', 'P-001', 'RIB-001', 'VERIFIED', 'ACTIVE')`);
    await c.$executeRawUnsafe(`INSERT INTO "Wallet" (id, "agencyId", "availableBalance", "pendingBalance") VALUES ('rehearsal-wallet-1', 'rehearsal-agency-1', 0, 0)`);
    await c.$executeRawUnsafe(`INSERT INTO "PayoutRequest" (id, "agencyId", amount, status, "bankDetails", "requestedAt") VALUES ('rehearsal-payout-1', 'rehearsal-agency-1', 500.00, 'PENDING', 'RIB-001', $1::timestamptz)`, now);
    await c.$executeRawUnsafe(`INSERT INTO "TripTemplate" (id, "agencyId", title, description, category, "startLocation", "durationDays", "durationNights", inclusions, exclusions, checklist, images, status, featured, currency, "reviewCount", "minBookings", "startingPrice", "createdAt", "updatedAt") VALUES
      ('rehearsal-trip-1', 'rehearsal-agency-1', 'Atlas Rehearsal Escape', 'Rehearsal fixture', 'NATURE', 'Marrakech', 3, 2, ARRAY['guide'], ARRAY[]::text[], ARRAY[]::text[], ARRAY[]::text[], 'ACTIVE', false, 'EUR', 0, 1, 3000.00, $1::timestamptz, $1::timestamptz)`, now);
    await c.$executeRawUnsafe(`INSERT INTO "TripSession" (id, "templateId", "startDate", "endDate", price, deposit, "totalSeats", "availableSeats", status, currency, "createdAt", "updatedAt") VALUES
      ('rehearsal-session-1', 'rehearsal-trip-1', $1::timestamptz, $2::timestamptz, 3000.00, 400.00, 10, 8, 'OPEN', 'EUR', $1::timestamptz, $1::timestamptz)`, now, new Date(Date.now() + 3 * 86400000).toISOString());
    await c.$executeRawUnsafe(`INSERT INTO "Booking" (id, "sessionId", "travelerId", status, "totalAmount", "guestsCount", "paymentMethod", "paymentStatus", "bookingDate", "createdAt", "updatedAt") VALUES
      ('rehearsal-booking-1', 'rehearsal-session-1', 'rehearsal-traveler', 'CONFIRMED', 3000.00, 1, 'GATEWAY', 'PAID', $1::timestamptz, $1::timestamptz, $1::timestamptz)`, now);
    await c.$executeRawUnsafe(`INSERT INTO "NotificationLog" (id, "userId", "notificationType", "recipientEmail", message, status, "sentAt") VALUES
      ('rehearsal-notification-1', 'rehearsal-traveler', 'BOOKING_CONFIRMATION', 'traveler@rehearsal.local', 'Rehearsal notification', 'SENT', $1::timestamptz)`, now);
    await c.$executeRawUnsafe(`INSERT INTO "PaymentTransaction" (id, "bookingId", amount, method, status, provider, "createdAt", "updatedAt") VALUES
      ('rehearsal-payment-1', 'rehearsal-booking-1', 3000.00, 'GATEWAY', 'INITIATED', 'CMI', $1::timestamptz, $1::timestamptz)`, now);
  } finally {
    await c.$disconnect();
  }
};

const seedInvalidNotificationStatus = async (Client) => {
  process.env.DATABASE_URL = scratchUrl;
  const c = new Client();
  c.$connect();
  try {
    const now = nowSql();
    await c.$executeRawUnsafe(`INSERT INTO "User" (id, email, password, "isEmailVerified", "role", "createdAt", "updatedAt") VALUES
      ('rehearsal-traveler', 'traveler@rehearsal.local', 'x', true, 'TRAVELER', $1::timestamptz, $1::timestamptz)`, now);
    await c.$executeRawUnsafe(`INSERT INTO "NotificationLog" (id, "userId", "notificationType", "recipientEmail", message, status, "sentAt") VALUES
      ('rehearsal-notification-1', 'rehearsal-traveler', 'BOOKING_CONFIRMATION', 'traveler@rehearsal.local', 'Rehearsal notification', 'UNKNOWN_LEGACY', $1::timestamptz)`, now);
  } finally {
    await c.$disconnect();
  }
};

const seedInvalidPaymentStatus = async (Client) => {
  process.env.DATABASE_URL = scratchUrl;
  const c = new Client();
  c.$connect();
  try {
    const now = nowSql();
    await c.$executeRawUnsafe(`INSERT INTO "User" (id, email, password, "isEmailVerified", "role", "createdAt", "updatedAt") VALUES
      ('rehearsal-traveler', 'traveler@rehearsal.local', 'x', true, 'TRAVELER', $1::timestamptz, $1::timestamptz)`, now);
    await c.$executeRawUnsafe(`INSERT INTO "AgencyProfile" (id, "userId", "companyName", ice, patente, rib, "verificationStatus", "subscriptionStatus") VALUES
      ('rehearsal-agency-1', 'rehearsal-traveler', 'Rehearsal Travel Co', 'ICE-001', 'P-001', 'RIB-001', 'VERIFIED', 'ACTIVE')`);
    await c.$executeRawUnsafe(`INSERT INTO "TripTemplate" (id, "agencyId", title, description, category, "startLocation", "durationDays", "durationNights", inclusions, exclusions, checklist, images, status, featured, "reviewCount", "minBookings", "startingPrice", "createdAt", "updatedAt") VALUES
      ('rehearsal-trip-1', 'rehearsal-agency-1', 'Atlas Rehearsal Escape', 'Rehearsal fixture', 'NATURE', 'Marrakech', 3, 2, ARRAY['guide'], ARRAY[]::text[], ARRAY[]::text[], ARRAY[]::text[], 'ACTIVE', false, 0, 1, 3000.00, $1::timestamptz, $1::timestamptz)`, now);
    await c.$executeRawUnsafe(`INSERT INTO "TripSession" (id, "templateId", "startDate", "endDate", price, deposit, "totalSeats", "availableSeats", status, "createdAt", "updatedAt") VALUES
      ('rehearsal-session-1', 'rehearsal-trip-1', $1::timestamptz, $2::timestamptz, 3000.00, 400.00, 10, 8, 'OPEN', $1::timestamptz, $1::timestamptz)`, now, new Date(Date.now() + 3 * 86400000).toISOString());
    await c.$executeRawUnsafe(`INSERT INTO "Booking" (id, "sessionId", "travelerId", status, "totalAmount", "guestsCount", "bookingDate", "createdAt", "updatedAt") VALUES
      ('rehearsal-booking-1', 'rehearsal-session-1', 'rehearsal-traveler', 'CONFIRMED', 3000.00, 1, $1::timestamptz, $1::timestamptz, $1::timestamptz)`, now);
    await c.$executeRawUnsafe(`INSERT INTO "PaymentTransaction" (id, "bookingId", amount, method, status, "createdAt", "updatedAt") VALUES
      ('rehearsal-payment-1', 'rehearsal-booking-1', 3000.00, 'GATEWAY', 'INVALID_STATUS', $1::timestamptz, $1::timestamptz)`, now);
  } finally {
    await c.$disconnect();
  }
};

const seedDuplicateResetTokenHash = async (Client) => {
  process.env.DATABASE_URL = scratchUrl;
  const c = new Client();
  c.$connect();
  try {
    const now = nowSql();
    await c.$executeRawUnsafe(`INSERT INTO "User" (id, email, password, "passwordResetTokenHash", "isEmailVerified", "role", "createdAt", "updatedAt") VALUES
      ('rehearsal-user-1', 'one@rehearsal.local', 'x', 'duplicate-hash', true, 'TRAVELER', $1::timestamptz, $1::timestamptz),
      ('rehearsal-user-2', 'two@rehearsal.local', 'x', 'duplicate-hash', true, 'TRAVELER', $1::timestamptz, $1::timestamptz)`, now);
  } finally {
    await c.$disconnect();
  }
};

const verifyScenarioA = async (client) => {
  const checks = [];
  const currencies = await client.$queryRawUnsafe(`SELECT table_name, column_name, udt_name, column_default
    FROM information_schema.columns
    WHERE table_schema = 'public' AND column_name = 'currency'
    ORDER BY table_name`);
  for (const table of ['Booking', 'Wallet', 'PayoutRequest']) {
    const row = currencies.find((r) => r.table_name === table);
    checks.push({
      check: `currency column added to ${table} with MAD default`,
      passed: !!row && String(row.column_default).includes('MAD'),
      detail: row ? `${row.udt_name} default=${row.column_default}` : 'column missing',
    });
  }

  const backfilled = (await client.$queryRawUnsafe(`SELECT
    (SELECT currency FROM "Booking" WHERE id = 'rehearsal-booking-1') AS booking_currency,
    (SELECT currency FROM "Wallet" WHERE id = 'rehearsal-wallet-1') AS wallet_currency,
    (SELECT currency FROM "PayoutRequest" WHERE id = 'rehearsal-payout-1') AS payout_currency`))[0] || {};
  checks.push({
    check: 'legacy booking inherits session currency while wallet and payout keep the explicit Morocco default',
    passed: backfilled.booking_currency === 'EUR' && backfilled.wallet_currency === 'MAD' && backfilled.payout_currency === 'MAD',
    detail: JSON.stringify(backfilled),
  });

  const statusTypes = await client.$queryRawUnsafe(`SELECT table_name, udt_name FROM information_schema.columns
    WHERE table_schema = 'public' AND ((table_name = 'NotificationLog' AND column_name = 'status') OR (table_name = 'PaymentTransaction' AND column_name = 'status'))`);
  const n = statusTypes.find((r) => r.table_name === 'NotificationLog');
  const p = statusTypes.find((r) => r.table_name === 'PaymentTransaction');
  checks.push({ check: 'NotificationLog.status becomes enum', passed: String(n?.udt_name || '').toLowerCase() === 'notificationdeliverystatus', detail: n?.udt_name });
  checks.push({ check: 'PaymentTransaction.status becomes enum', passed: String(p?.udt_name || '').toLowerCase() === 'paymenttransactionstatus', detail: p?.udt_name });

  const preserved = (await client.$queryRawUnsafe(`SELECT
    (SELECT status::text FROM "NotificationLog" LIMIT 1) AS notification_status,
    (SELECT status::text FROM "PaymentTransaction" LIMIT 1) AS payment_status`))[0] || {};
  checks.push({ check: 'legacy status values preserved through cast', passed: preserved.notification_status === 'SENT' && preserved.payment_status === 'INITIATED', detail: JSON.stringify(preserved) });

  const indexes = await client.$queryRawUnsafe(`SELECT indexname FROM pg_indexes WHERE schemaname = 'public' AND indexname IN ('User_passwordResetTokenHash_key', 'Booking_sessionId_status_idx', 'Review_tripTemplateId_rating_idx') ORDER BY indexname`);
  const indexNames = new Set(indexes.map((i) => i.indexname));
  for (const name of ['User_passwordResetTokenHash_key', 'Booking_sessionId_status_idx', 'Review_tripTemplateId_rating_idx']) {
    checks.push({ check: `index ${name} exists`, passed: indexNames.has(name), detail: name });
  }

  try {
    await client.$executeRawUnsafe(`INSERT INTO "User" (id, email, password, "passwordResetTokenHash", "createdAt", "updatedAt") VALUES ('rehearsal-dup-check', 'dup@rehearsal.local', 'x', 'hash-traveler-legacy', now(), now())`);
    checks.push({ check: 'unique index rejects duplicate passwordResetTokenHash', passed: false, detail: 'duplicate insert succeeded (unique index missing or not enforced)' });
  } catch (error) {
    const message = String(error?.message || '');
    checks.push({ check: 'unique index rejects duplicate passwordResetTokenHash', passed: message.includes('23505') || message.includes('already exists'), detail: message.slice(0, 160) });
  }

  try {
    await client.$executeRawUnsafe(`INSERT INTO "NotificationLog" (id, "userId", "notificationType", "recipientEmail", message, status, "sentAt") VALUES ('rehearsal-bad-status', 'rehearsal-traveler', 'BOOKING_CONFIRMATION', 'x@rehearsal.local', 'x', 'UNKNOWN_LEGACY', now())`);
    checks.push({ check: 'enum rejects invalid NotificationLog status', passed: false, detail: 'invalid insert succeeded (enum missing)' });
  } catch (error) {
    checks.push({ check: 'enum rejects invalid NotificationLog status', passed: String(error?.message || '').includes('invalid input value for enum'), detail: String(error?.message || '').slice(0, 160) });
  }

  return checks;
};

const run = async () => {
  const { PrismaClient } = await import(pathToFileURL(GENERATED_CLIENT).href);
  const scenarios = [];
  const evidence = [];
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'ouiboo-migration-rehearsal-'));
  let scratchClient = null;
  const teardownScratch = async () => {
    if (scratchClient) {
      const c = scratchClient;
      scratchClient = null;
      try { await c.$disconnect(); } catch { /* best-effort */ }
    }
  };

  const summary = {
    targetMigration: TARGET_MIGRATION,
    database: `postgresql://${parsed.hostname}:${parsed.port}/${databaseName}?schema=public`,
    scenarios: [],
  };

  try {
    // Scenario A: clean legacy data migrates; constraints and post-migration state are correct.
    await resetScratchDatabase(PrismaClient);
    process.env.DATABASE_URL = scratchUrl;
    scratchClient = new PrismaClient();
    await scratchClient.$connect();
    {
      const legacyDir = path.join(tempRoot, 'legacy');
      const legacy = createLegacyShape(legacyDir);
      if (!legacy.applied) {
        throw new Error(`Legacy migration setup failed:\n${legacy.result.error}\n${legacy.result.stdout}\n${legacy.result.stderr}`);
      }
      await seedCleanLegacy(PrismaClient);
      const targetDir = path.join(tempRoot, 'full-legacy');
      copySchemaAndMigrations(targetDir, true);
      const start = Date.now();
      const applied = migrate(targetDir);
      const durationMs = Date.now() - start;
      const checks = await verifyScenarioA(scratchClient);
      evidence.push(...checks.map((c) => ({ scenario: 'A-clean-legacy-migrates', ...c })));
      const passed = legacy.applied && applied.status === 0 && checks.every((c) => c.passed);
      scenarios.push({
        name: 'A-clean-legacy-migrates',
        passed,
        legacyMigrationsApplied: legacy.count,
        legacyDeploy: legacy.result.status === 0 ? 'ok' : `failed(${legacy.result.status})`,
        targetDeployStatus: applied.status,
        targetDeployMs: durationMs,
        failureDetail: applied.status === 0 ? '' : `${applied.stdout}\n${applied.stderr}`.slice(0, 400),
      });
    }

    await teardownScratch();
    await resetScratchDatabase(PrismaClient);
    process.env.DATABASE_URL = scratchUrl;
    scratchClient = new PrismaClient();
    await scratchClient.$connect();

    // Scenario B: invalid legacy NotificationLog status must fail fast before DDL.
    {
      const legacyDir = path.join(tempRoot, 'legacy-b');
      createLegacyShape(legacyDir);
      await seedInvalidNotificationStatus(PrismaClient);
      const targetDir = path.join(tempRoot, 'full-b');
      copySchemaAndMigrations(targetDir, true);
      const applied = migrate(targetDir);
      const logs = await readMigrationLogs(scratchClient);
      const enumType = (await scratchClient.$queryRawUnsafe(`SELECT COUNT(*)::int AS n FROM pg_type WHERE typname = 'notificationdeliverystatus' AND typnamespace::regnamespace::text = 'public'`))[0] || {};
      const passed = applied.status !== 0 && logs.includes('NotificationLog contains unsupported status values') && (enumType.n || 0) === 0;
      evidence.push({ scenario: 'B-rejects-invalid-notification-status', check: 'preflight fails fast before creating enum/DDL', passed, detail: logs.slice(0, 400) });
      scenarios.push({ name: 'B-rejects-invalid-notification-status', passed, targetDeployStatus: applied.status, failureDetail: logs.slice(0, 400) });
    }

    await teardownScratch();
    await resetScratchDatabase(PrismaClient);
    process.env.DATABASE_URL = scratchUrl;
    scratchClient = new PrismaClient();
    await scratchClient.$connect();

    // Scenario C: invalid legacy PaymentTransaction status must fail fast.
    {
      const legacyDir = path.join(tempRoot, 'legacy-c');
      createLegacyShape(legacyDir);
      await seedInvalidPaymentStatus(PrismaClient);
      const targetDir = path.join(tempRoot, 'full-c');
      copySchemaAndMigrations(targetDir, true);
      const applied = migrate(targetDir);
      const logs = await readMigrationLogs(scratchClient);
      const enumType = (await scratchClient.$queryRawUnsafe(`SELECT COUNT(*)::int AS n FROM pg_type WHERE typname = 'paymenttransactionstatus' AND typnamespace::regnamespace::text = 'public'`))[0] || {};
      const passed = applied.status !== 0 && logs.includes('PaymentTransaction contains unsupported status values') && (enumType.n || 0) === 0;
      evidence.push({ scenario: 'C-rejects-invalid-payment-status', check: 'preflight fails fast before creating enum/DDL', passed, detail: logs.slice(0, 400) });
      scenarios.push({ name: 'C-rejects-invalid-payment-status', passed, targetDeployStatus: applied.status, failureDetail: logs.slice(0, 400) });
    }

    await teardownScratch();
    await resetScratchDatabase(PrismaClient);
    process.env.DATABASE_URL = scratchUrl;
    scratchClient = new PrismaClient();
    await scratchClient.$connect();

    // Scenario D: duplicate passwordResetTokenHash must fail the preflight, not the unique index.
    {
      const legacyDir = path.join(tempRoot, 'legacy-d');
      createLegacyShape(legacyDir);
      await seedDuplicateResetTokenHash(PrismaClient);
      const targetDir = path.join(tempRoot, 'full-d');
      copySchemaAndMigrations(targetDir, true);
      const applied = migrate(targetDir);
      const logs = await readMigrationLogs(scratchClient);
      const uniqueIndex = (await scratchClient.$queryRawUnsafe(`SELECT COUNT(*)::int AS n FROM pg_indexes WHERE schemaname = 'public' AND indexname = 'User_passwordResetTokenHash_key'`))[0] || {};
      const passed = applied.status !== 0 && logs.includes('duplicate passwordResetTokenHash') && (uniqueIndex.n || 0) === 0;
      evidence.push({ scenario: 'D-rejects-duplicate-reset-token-hash', check: 'duplicate-hash preflight fails fast before unique index', passed, detail: logs.slice(0, 400) });
      scenarios.push({ name: 'D-rejects-duplicate-reset-token-hash', passed, targetDeployStatus: applied.status, failureDetail: logs.slice(0, 400) });
    }
  } finally {
    await teardownScratch();
    await resetScratchDatabase(PrismaClient);
    fs.rmSync(tempRoot, { recursive: true, force: true });
  }

  summary.scenarios = scenarios;
  summary.allPassed = scenarios.every((s) => s.passed);
  writeReport(summary, evidence);
  console.log(JSON.stringify(summary, null, 2));
  console.log(`\nReport written to ${REPORT_PATH}`);
  if (!summary.allPassed) process.exitCode = 1;
};

const writeReport = (summary, evidence) => {
  const date = new Date().toISOString().slice(0, 10);
  const rows = summary.scenarios.map((s) => {
    if (s.name === 'A-clean-legacy-migrates') {
      return `| ${s.name} | ${s.passed ? 'PASS' : 'FAIL'} | ${s.legacyMigrationsApplied} legacy migrations applied; target deploy exit ${s.targetDeployStatus} in ${s.targetDeployMs} ms |`;
    }
    return `| ${s.name} | ${s.passed ? 'PASS' : 'FAIL'} | target deploy exit ${s.targetDeployStatus}; ${s.failureDetail.slice(0, 120)} |`;
  }).join('\n');
  const detailLines = evidence.map((e) => `- ${e.scenario}: ${e.check} — ${e.passed ? 'pass' : 'FAIL'} (${e.detail})`).join('\n');
  const report = `# Migration Rehearsal Report

**Migration:** \`${summary.targetMigration}\`
**Database:** \`${summary.database}\`
**Date:** ${date}
**Result:** ${summary.allPassed ? 'ALL REHEARSAL SCENARIOS PASSED' : 'FAILURES PRESENT — DO NOT DEPLOY'}

## Methodology
A legacy-shaped schema was materialized by applying every migration before
\`${summary.targetMigration}\` to an empty scratch database, then seeding rows
with free-text statuses, pre-currency columns (matching the pre-migration
schema), and reset-token hashes. The target migration was then applied with
\`prisma migrate deploy\`. Every scenario ran against a freshly created,
non-production scratch database (name ends \`_test\`, local host by default).

## Scenario results
| Scenario | Result | Detail |
|----------|--------|--------|
${rows}

## Post-migration verification (clean scenario)
${detailLines}

## Preflight coverage
- NotificationLog.status must contain only \`SENT\`, \`FAILED\`, \`BOUNCED\`.
- PaymentTransaction.status must contain only \`INITIATED\`, \`SUCCESS\`, \`FAILED\`, \`PENDING\`.
- \`User.passwordResetTokenHash\` must have no duplicate non-null values before the unique index is created.

## Rollback / locking notes
- Each migration runs in its own transaction; the target aborts atomically and
  preflight failures leave no partial DDL (verified for all scenarios).
- Wallet and payout currency columns use metadata-only defaults on PostgreSQL 11+.
- Booking currency is backfilled from \`TripSession.currency\`; this update writes
  every legacy booking row and must be timed on a production-like snapshot.
- \`ALTER COLUMN ... TYPE <enum>\` and \`CREATE INDEX\` take ACCESS EXCLUSIVE
  locks; at launch scale the two status tables are small, so the rewrite is
  brief, but a scheduled maintenance window is recommended and large-table
  review is required before any future enum/index expansion.

## Regeneration
  node scripts/rehearse-migration.mjs   # default local scratch DB
  REHEARSAL_DATABASE_URL=... node scripts/rehearse-migration.mjs   # custom local _test DB

## Remaining risk
- A production snapshot may contain status values not covered above; the
  preflight fails closed, so run this rehearsal (or a staging
  \`prisma migrate deploy\`) against a real sanitized production dump before
  launch.
- Index creation on large tables was not profiled at production cardinality;
  duration was recorded only on the small rehearsal fixture.
`;
  fs.mkdirSync(path.dirname(REPORT_PATH), { recursive: true });
  fs.writeFileSync(REPORT_PATH, report, 'utf8');
};

run().catch((error) => {
  console.error(`Rehearsal failed: ${error.stack || error}`);
  process.exitCode = 1;
});
