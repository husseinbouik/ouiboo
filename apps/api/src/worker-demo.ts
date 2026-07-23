import 'dotenv/config';
import { PrismaClient } from '@ouiboo/database';

const prisma = new PrismaClient();
const startedAt = new Date();
const intervalMs = Number(process.env.DEMO_WORKER_HEARTBEAT_MS || 30000);

async function verifyDatabase() {
  await prisma.$queryRaw`SELECT 1`;
}

async function shutdown(signal: string) {
  console.log(`[demo-worker] received ${signal}, shutting down`);
  await prisma.$disconnect();
  process.exit(0);
}

async function bootstrap() {
  await verifyDatabase();
  console.log('[demo-worker] started in local no-Redis mode');
  console.log('[demo-worker] BullMQ jobs require Redis; this process verifies DB connectivity and keeps the worker slot visible for controlled demos.');

  setInterval(() => {
    const uptimeSeconds = Math.round((Date.now() - startedAt.getTime()) / 1000);
    console.log(`[demo-worker] heartbeat uptime=${uptimeSeconds}s redis=unavailable mode=local-demo`);
  }, intervalMs);

  process.on('SIGTERM', () => void shutdown('SIGTERM'));
  process.on('SIGINT', () => void shutdown('SIGINT'));
}

bootstrap().catch(async (error) => {
  console.error('[demo-worker] failed to start', error);
  await prisma.$disconnect().catch(() => undefined);
  process.exit(1);
});
