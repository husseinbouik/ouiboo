import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const DEFAULT_E2E_DATABASE_URL = 'postgresql://postgres:admin@localhost:5432/ouiboo_test?schema=public';
const __filename = fileURLToPath(import.meta.url);
const root = path.resolve(path.dirname(__filename), '..');

const npmCommand = (args) => {
  if (process.platform !== 'win32') {
    return { command: process.env.npm_execpath || 'npm', args };
  }

  const candidate = path.join(path.dirname(process.execPath), 'node_modules', 'npm', 'bin', 'npm-cli.js');
  const npmCli = process.env.npm_execpath || (fs.existsSync(candidate) ? candidate : 'C:\\Program Files\\nodejs\\node_modules\\npm\\bin\\npm-cli.js');
  return { command: process.execPath, args: [npmCli, ...args] };
};

const parseDatabaseName = (databaseUrl) => {
  const parsed = new URL(databaseUrl);
  const databaseName = parsed.pathname.replace(/^\//, '');
  if (!databaseName || !/^[A-Za-z0-9_]+$/.test(databaseName)) {
    throw new Error(`E2E database name must be a simple identifier, got '${databaseName || '<empty>'}'`);
  }
  if (!databaseName.endsWith('_test')) {
    throw new Error(`Refusing to prepare non-test database '${databaseName}'. E2E database names must end with '_test'.`);
  }
  return { parsed, databaseName };
};

const adminUrlFor = (parsed) => {
  if (process.env.E2E_ADMIN_DATABASE_URL) return process.env.E2E_ADMIN_DATABASE_URL;
  const admin = new URL(parsed.toString());
  admin.pathname = '/postgres';
  admin.search = '';
  return admin.toString();
};

const run = (command, args, env) => {
  const result = spawnSync(command, args, {
    cwd: root,
    env,
    stdio: 'inherit',
    shell: false,
  });

  if (result.status !== 0) {
    throw new Error(`${command} ${args.join(' ')} failed with status ${result.status}`);
  }
};

const e2eDatabaseUrl = process.env.E2E_DATABASE_URL || DEFAULT_E2E_DATABASE_URL;
const { parsed, databaseName } = parseDatabaseName(e2eDatabaseUrl);
const adminDatabaseUrl = adminUrlFor(parsed);

console.log(`[e2e-db] ensuring database ${databaseName}`);
run(
  process.execPath,
  [path.join(root, 'scripts', 'ensure-e2e-database.mjs')],
  {
    ...process.env,
    E2E_DATABASE_URL: e2eDatabaseUrl,
    E2E_ADMIN_DATABASE_URL: adminDatabaseUrl,
  },
);

const env = {
  ...process.env,
  DATABASE_URL: e2eDatabaseUrl,
  E2E_DATABASE_URL: e2eDatabaseUrl,
  NODE_ENV: 'test',
};

console.log('[e2e-db] resetting the isolated test database and applying the Prisma schema');
const npm = npmCommand([
  'run',
  'db:push',
  '--workspace',
  'packages/database',
  '--',
  '--force-reset',
]);
run(npm.command, npm.args, env);
console.log(`[e2e-db] ready: ${e2eDatabaseUrl}`);
