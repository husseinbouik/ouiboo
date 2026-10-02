import 'dotenv/config';
import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { WorkerModule } from './worker/worker.module';
import {
  getWorkerHeartbeatIntervalMs,
  removeWorkerHeartbeat,
  writeWorkerHeartbeat,
} from './worker/worker-heartbeat';

async function bootstrap() {
  const logger = new Logger('WorkerBootstrap');
  const app = await NestFactory.createApplicationContext(WorkerModule, {
    logger: ['log', 'error', 'warn'],
  });

  await writeWorkerHeartbeat();
  const heartbeatTimer = setInterval(() => {
    void writeWorkerHeartbeat().catch((error) => {
      logger.error('Failed to update worker heartbeat', error);
    });
  }, getWorkerHeartbeatIntervalMs());

  let shuttingDown = false;
  const shutdown = async (signal: string) => {
    if (shuttingDown) return;
    shuttingDown = true;
    logger.log(`Received ${signal}; shutting down worker`);
    clearInterval(heartbeatTimer);
    await removeWorkerHeartbeat();
    await app.close();
    process.exit(0);
  };

  process.on('SIGTERM', () => void shutdown('SIGTERM'));
  process.on('SIGINT', () => void shutdown('SIGINT'));
}

bootstrap().catch((error) => {
  console.error('Worker bootstrap failed:', error);
  process.exit(1);
});
