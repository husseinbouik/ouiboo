import type { RedisOptions } from 'ioredis';

export const getRedisConnectionOptions = (): RedisOptions => {
  const redisUrl = process.env.REDIS_URL;
  if (!redisUrl) {
    throw new Error('REDIS_URL is required for worker and queue processing');
  }

  return {
    host: new URL(redisUrl).hostname,
    port: Number(new URL(redisUrl).port || 6379),
    username: new URL(redisUrl).username || undefined,
    password: new URL(redisUrl).password || undefined,
    db: Number(new URL(redisUrl).pathname.replace('/', '') || 0),
    tls: new URL(redisUrl).protocol === 'rediss:' ? {} : undefined,
    maxRetriesPerRequest: null,
  };
};
