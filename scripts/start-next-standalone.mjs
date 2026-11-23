import { cp, mkdir } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import path from 'node:path';
import process from 'node:process';

const [app, port] = process.argv.slice(2);
if (!app || !port || !/^\d+$/.test(port)) {
  console.error('Usage: node scripts/start-next-standalone.mjs <app> <port>');
  process.exit(1);
}

const repositoryRoot = process.cwd();
const appRoot = path.join(repositoryRoot, 'apps', app);
const standaloneRoot = path.join(appRoot, '.next', 'standalone');
const standaloneAppRoot = path.join(standaloneRoot, 'apps', app);
const serverPath = path.join(standaloneAppRoot, 'server.js');

await mkdir(path.join(standaloneAppRoot, '.next'), { recursive: true });
await cp(path.join(appRoot, '.next', 'static'), path.join(standaloneAppRoot, '.next', 'static'), {
  recursive: true,
  force: true,
});
await cp(path.join(appRoot, 'public'), path.join(standaloneAppRoot, 'public'), {
  recursive: true,
  force: true,
});

const child = spawn(process.execPath, [serverPath], {
  cwd: standaloneRoot,
  stdio: 'inherit',
  env: {
    ...process.env,
    HOSTNAME: '127.0.0.1',
    PORT: port,
  },
});

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => child.kill(signal));
}

child.on('exit', (code, signal) => {
  if (signal) process.kill(process.pid, signal);
  process.exit(code ?? 1);
});
