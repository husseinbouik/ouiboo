import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const root = process.cwd();
const generatedClientEntry = path.join(root, 'packages', 'database', 'generated-client', 'index.js');

const run = (label, command, args, options = {}) => {
  console.log(`[demo:prepare] ${label}`);
  const result = spawnSync(command, args, {
    cwd: root,
    stdio: 'inherit',
    shell: process.platform === 'win32',
    env: process.env,
  });

  if (result.status === 0) {
    return true;
  }

  if (options.optionalWhen?.()) {
    console.warn(`[demo:prepare] ${label} failed, but continuing because ${options.reason}`);
    return false;
  }

  process.exit(result.status || 1);
};

run(
  'generate Prisma client',
  'npm',
  ['run', 'db:generate', '--workspace', 'packages/database'],
  {
    optionalWhen: () => fs.existsSync(generatedClientEntry),
    reason: 'a generated Prisma client already exists. On Windows/OneDrive, the query engine DLL can be locked by another process.',
  },
);

const migrated = run(
  'apply Prisma migrations to local demo database',
  'npm',
  ['run', 'db:migrate:deploy', '--workspace', 'packages/database'],
  {
    optionalWhen: () => true,
    reason: 'this local developer database may predate the migration history. Falling back to db push for a throwaway demo database only.',
  },
);

if (!migrated) {
  run(
    'push Prisma schema to local demo database with local-only data-loss acceptance',
    'npm',
    ['run', 'db:push', '--workspace', 'packages/database', '--', '--accept-data-loss'],
  );
}

run('seed demo data', 'npm', ['run', 'seed:demo']);

console.log('[demo:prepare] complete');
