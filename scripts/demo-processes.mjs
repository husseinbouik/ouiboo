import 'dotenv/config';
import fs from 'node:fs';
import http from 'node:http';
import https from 'node:https';
import net from 'node:net';
import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';

const root = process.cwd();
const runtimeRoot = path.join(root, '.demo-runtime');
const stateDir = path.join(runtimeRoot, 'state');
const logDir = path.join(runtimeRoot, 'logs');
const stateFile = path.join(stateDir, 'processes.json');

const services = [
  { name: 'api', args: ['run', 'dev', '--workspace', 'apps/api'], url: 'http://localhost:3000/api/v1/health' },
  { name: 'worker', args: ['run', 'start:worker:dev', '--workspace', 'apps/api'], url: null },
  { name: 'traveler', args: ['run', 'dev', '--workspace', 'apps/traveler'], url: 'http://localhost:3001/api/health' },
  { name: 'agency', args: ['run', 'dev', '--workspace', 'apps/agency'], url: 'http://localhost:3002/api/health' },
  { name: 'admin', args: ['run', 'dev', '--workspace', 'apps/admin'], url: 'http://localhost:3003/api/health' },
];

const ensureDirs = () => {
  fs.mkdirSync(stateDir, { recursive: true });
  fs.mkdirSync(logDir, { recursive: true });
};

const readState = () => {
  try {
    return JSON.parse(fs.readFileSync(stateFile, 'utf8'));
  } catch {
    return { processes: [], skipped: [] };
  }
};

const writeState = (state) => {
  ensureDirs();
  fs.writeFileSync(stateFile, `${JSON.stringify(state, null, 2)}\n`);
};

const npmExecutable = () => (process.platform === 'win32' ? 'C:\\\\Program Files\\\\nodejs\\\\npm.cmd' : process.env.npm_execpath || 'npm');
const psQuote = (value) => `'${String(value).replaceAll("'", "''")}'`;

const canConnect = (url, timeoutMs = 1200) =>
  new Promise((resolve) => {
    const parsed = new URL(url);
    const socket = net.createConnection({
      host: parsed.hostname,
      port: Number(parsed.port || 6379),
      timeout: timeoutMs,
    });
    const finish = (ok) => {
      socket.destroy();
      resolve(ok);
    };
    socket.once('connect', () => finish(true));
    socket.once('timeout', () => finish(false));
    socket.once('error', () => finish(false));
  });

const localRedisUrl = () => process.env.REDIS_URL || 'redis://localhost:6379';

const normalizedEnv = () => {
  const env = {};
  for (const [key, value] of Object.entries(process.env)) {
    if (key.toLowerCase() === 'path') continue;
    env[key] = value;
  }
  env.Path = process.env.Path || process.env.PATH || '';
  env.PATH = env.Path;
  env.NODE_ENV = env.NODE_ENV || 'development';
  env.DATABASE_URL = env.DATABASE_URL || 'postgresql://postgres:admin@localhost:5432/ouiboo?schema=public';
  env.JWT_SECRET = env.JWT_SECRET || 'demo-jwt-secret';
  env.JWT_REFRESH_SECRET = env.JWT_REFRESH_SECRET || 'demo-refresh-secret';
  env.CORS_ORIGINS = env.CORS_ORIGINS || 'http://localhost:3001,http://localhost:3002,http://localhost:3003';
  env.API_URL = env.API_URL || 'http://localhost:3000/api/v1';
  env.NEXT_PUBLIC_API_URL = env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api/v1';
  env.TRAVELER_APP_URL = env.TRAVELER_APP_URL || 'http://localhost:3001';
  env.AGENCY_APP_URL = env.AGENCY_APP_URL || 'http://localhost:3002';
  env.ADMIN_APP_URL = env.ADMIN_APP_URL || 'http://localhost:3003';
  env.STORAGE_PROVIDER = env.STORAGE_PROVIDER || 'local';
  return env;
};

const isRunning = (pid) => {
  if (!pid) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
};

const startWindowsProcess = (args, env, outPath, errPath) => {
  const envAssignments = Object.entries(env)
    .filter(([key]) => key.toLowerCase() !== 'path' && /^[A-Za-z_][A-Za-z0-9_]*$/.test(key))
    .map(([key, value]) => `$env:${key}=${psQuote(value)}`)
    .join('; ');
  const argumentList = args.map(psQuote).join(', ');
  const command = [
    envAssignments,
    `$p = Start-Process -FilePath ${psQuote(npmExecutable())} -ArgumentList @(${argumentList}) -WorkingDirectory ${psQuote(root)} -RedirectStandardOutput ${psQuote(outPath)} -RedirectStandardError ${psQuote(errPath)} -WindowStyle Hidden -PassThru`,
    'Write-Output $p.Id',
  ].join('; ');

  const powershellEnv = {};
  for (const [key, value] of Object.entries(env)) {
    if (key.toLowerCase() !== 'path') powershellEnv[key] = value;
  }
  powershellEnv.Path = env.Path || env.PATH || process.env.Path || process.env.PATH || '';

  const result = spawnSync('powershell.exe', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command', command], {
    cwd: root,
    encoding: 'utf8',
    env: powershellEnv,
  });

  if (result.status !== 0) {
    throw new Error([
      `Failed to start Windows process (status=${result.status}, signal=${result.signal || 'none'})`,
      result.error?.message,
      result.stderr,
      result.stdout,
    ].filter(Boolean).join('\n'));
  }

  const pid = Number(String(result.stdout).trim().split(/\s+/).pop());
  if (!Number.isInteger(pid)) {
    throw new Error(`Could not read PID from Start-Process output: ${result.stdout}`);
  }
  return { pid };
};

const npmCliPath = () => {
  if (process.platform !== 'win32') return null;
  const candidate = path.join(path.dirname(process.execPath), 'node_modules', 'npm', 'bin', 'npm-cli.js');
  return fs.existsSync(candidate) ? candidate : 'C:\\Program Files\\nodejs\\node_modules\\npm\\bin\\npm-cli.js';
};

const startWindowsNodeProcess = (args, env, outPath, errPath) => {
  const out = fs.openSync(outPath, 'a');
  const err = fs.openSync(errPath, 'a');
  const child = spawn(process.execPath, [npmCliPath(), ...args], {
    cwd: root,
    env,
    detached: true,
    stdio: ['ignore', out, err],
    windowsHide: true,
    shell: false,
  });
  child.unref();
  return { pid: child.pid };
};
const startUnixProcess = (args, env, outPath, errPath) => {
  const out = fs.openSync(outPath, 'a');
  const err = fs.openSync(errPath, 'a');
  const child = spawn(npmExecutable(), args, {
    cwd: root,
    env,
    detached: true,
    stdio: ['ignore', out, err],
    windowsHide: true,
    shell: false,
  });
  child.unref();
  return { pid: child.pid };
};

const startProcess = (args, env, outPath, errPath) => {
  if (process.platform === 'win32') {
    return startWindowsNodeProcess(args, env, outPath, errPath);
  }
  return startUnixProcess(args, env, outPath, errPath);
};

const start = async () => {
  ensureDirs();
  const redisUrl = localRedisUrl();
  const redisAvailable = await canConnect(redisUrl);
  const existing = readState();
  const live = existing.processes.filter((record) => isRunning(record.pid));
  const liveNames = new Set(live.map((record) => record.name));
  const started = [];
  const skipped = [];

  for (const service of services) {
    if (service.name === 'worker' && !redisAvailable) {
      console.log(`[demo] skipped worker: Redis is not reachable at ${redisUrl}`);
      skipped.push({ name: service.name, reason: `Redis is not reachable at ${redisUrl}`, skippedAt: new Date().toISOString() });
      continue;
    }

    if (liveNames.has(service.name)) {
      console.log(`[demo] ${service.name} already running`);
      continue;
    }

    const env = normalizedEnv();
    if (redisAvailable) env.REDIS_URL = redisUrl;

    const outPath = path.join(logDir, `${service.name}.out.log`);
    const errPath = path.join(logDir, `${service.name}.err.log`);
    const child = startProcess(service.args, env, outPath, errPath);
    const record = {
      name: service.name,
      pid: child.pid,
      url: service.url,
      startedAt: new Date().toISOString(),
      stdout: outPath,
      stderr: errPath,
    };
    started.push(record);
    console.log(`[demo] started ${service.name} pid=${child.pid}`);
  }

  writeState({ processes: [...live, ...started], skipped });
};

const stop = () => {
  const state = readState();
  for (const record of state.processes) {
    if (!isRunning(record.pid)) {
      console.log(`[demo] ${record.name} not running`);
      continue;
    }

    if (process.platform === 'win32') {
      spawnSync('taskkill', ['/PID', String(record.pid), '/T', '/F'], { stdio: 'ignore' });
    } else {
      try {
        process.kill(-record.pid, 'SIGTERM');
      } catch {
        process.kill(record.pid, 'SIGTERM');
      }
    }
    console.log(`[demo] stopped ${record.name} pid=${record.pid}`);
  }
  writeState({ processes: [], skipped: [] });
};

const checkUrl = (url) =>
  new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const client = parsed.protocol === 'https:' ? https : http;
    const request = client.request(
      parsed,
      { method: 'GET', headers: { Accept: 'application/json', Connection: 'close' }, timeout: 5000 },
      (response) => {
        let body = '';
        response.setEncoding('utf8');
        response.on('data', (chunk) => {
          body += chunk;
        });
        response.on('end', () => {
          if (!response.statusCode || response.statusCode < 200 || response.statusCode >= 300) {
            resolve({ ok: false, status: response.statusCode || 0 });
            return;
          }
          try {
            const json = body ? JSON.parse(body) : {};
            resolve({ ok: json.status === 'ok', status: response.statusCode, body: json });
          } catch {
            resolve({ ok: true, status: response.statusCode, body });
          }
        });
      },
    );
    request.on('timeout', () => {
      request.destroy(new Error('request timed out'));
    });
    request.on('error', reject);
    request.end();
  });
const status = async () => {
  const state = readState();
  let hasFailure = false;
  for (const service of services) {
    const record = state.processes.find((item) => item.name === service.name);
    const skipped = state.skipped?.find((item) => item.name === service.name);
    if (skipped) {
      console.log(`[demo] ${service.name}: skipped (${skipped.reason})`);
      continue;
    }

    if (service.url) {
      try {
        const result = await checkUrl(service.url);
        if (!result.ok) {
          hasFailure = true;
          console.log(`[demo] ${service.name}: unhealthy ${service.url} status=${result.status}`);
        } else {
          const pidInfo = record && isRunning(record.pid) ? ` pid=${record.pid}` : '';
          console.log(`[demo] ${service.name}: ok ${service.url}${pidInfo}`);
        }
      } catch (error) {
        hasFailure = true;
        const pidInfo = record && isRunning(record.pid) ? ` pid=${record.pid}` : '';
        console.log(`[demo] ${service.name}: unreachable ${service.url}${pidInfo} (${error.message})`);
      }
      continue;
    }

    const running = record ? isRunning(record.pid) : false;
    if (!running) {
      hasFailure = true;
      console.log(`[demo] ${service.name}: not running`);
      continue;
    }

    console.log(`[demo] ${service.name}: running pid=${record.pid}`);
  }
  if (hasFailure) process.exitCode = 1;
};

const command = process.argv[2];
if (command === 'start') {
  await start();
} else if (command === 'stop') {
  stop();
} else if (command === 'status') {
  await status();
} else {
  console.error('Usage: node scripts/demo-processes.mjs <start|status|stop>');
  process.exit(1);
}













