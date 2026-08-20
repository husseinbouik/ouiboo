import { readFile, unlink, writeFile } from 'node:fs/promises';

export const DEFAULT_WORKER_HEALTH_FILE = '/tmp/ouiboo-worker-heartbeat';
export const DEFAULT_WORKER_HEARTBEAT_INTERVAL_MS = 15_000;
export const DEFAULT_WORKER_HEARTBEAT_MAX_AGE_MS = 45_000;

const positiveNumber = (value: string | undefined, fallback: number) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

export const getWorkerHealthFile = () =>
  process.env.WORKER_HEALTH_FILE || DEFAULT_WORKER_HEALTH_FILE;

export const getWorkerHeartbeatIntervalMs = () =>
  positiveNumber(
    process.env.WORKER_HEARTBEAT_INTERVAL_MS,
    DEFAULT_WORKER_HEARTBEAT_INTERVAL_MS,
  );

export const getWorkerHeartbeatMaxAgeMs = () =>
  positiveNumber(
    process.env.WORKER_HEARTBEAT_MAX_AGE_MS,
    DEFAULT_WORKER_HEARTBEAT_MAX_AGE_MS,
  );

export const writeWorkerHeartbeat = async (now = Date.now()) => {
  await writeFile(getWorkerHealthFile(), String(now), 'utf8');
};

export const removeWorkerHeartbeat = async () => {
  await unlink(getWorkerHealthFile()).catch((error: NodeJS.ErrnoException) => {
    if (error.code !== 'ENOENT') throw error;
  });
};

export const assertWorkerHeartbeatFresh = (
  heartbeatValue: string,
  now = Date.now(),
  maxAgeMs = getWorkerHeartbeatMaxAgeMs(),
) => {
  const heartbeatAt = Number(heartbeatValue);
  const ageMs = now - heartbeatAt;

  if (!Number.isFinite(heartbeatAt) || ageMs < 0 || ageMs > maxAgeMs) {
    throw new Error(`Worker heartbeat is stale or invalid (age=${ageMs}ms)`);
  }
};

export const readAndAssertWorkerHeartbeat = async () => {
  const heartbeatValue = await readFile(getWorkerHealthFile(), 'utf8');
  assertWorkerHeartbeatFresh(heartbeatValue);
};
