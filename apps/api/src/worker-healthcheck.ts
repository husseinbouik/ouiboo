import 'dotenv/config';
import Redis from 'ioredis';
import { getRedisConnectionOptions } from './worker/redis-connection';
import { readAndAssertWorkerHeartbeat } from './worker/worker-heartbeat';

const checkWorkerHealth = async () => {
  await readAndAssertWorkerHeartbeat();

  const redis = new Redis({
    ...getRedisConnectionOptions(),
    connectTimeout: 3_000,
    lazyConnect: true,
    maxRetriesPerRequest: 1,
    retryStrategy: () => null,
  });

  try {
    await redis.connect();
    const response = await redis.ping();
    if (response !== 'PONG') {
      throw new Error(`Unexpected Redis response: ${response}`);
    }
  } finally {
    redis.disconnect();
  }
};

checkWorkerHealth().catch((error) => {
  console.error('Worker health check failed:', error);
  process.exitCode = 1;
});
