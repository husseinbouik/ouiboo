import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private client?: Redis;

  getClient() {
    const redisUrl = process.env.REDIS_URL;

    if (!redisUrl) {
      if (process.env.NODE_ENV === 'production') {
        throw new Error('REDIS_URL is required in production');
      }
      return null;
    }

    if (!this.client) {
      this.client = new Redis(redisUrl, {
        maxRetriesPerRequest: 2,
        enableReadyCheck: true,
        lazyConnect: true,
      });
      this.client.on('error', (error) => {
        this.logger.error(`Redis connection error: ${error.message}`);
      });
    }

    return this.client;
  }

  async onModuleDestroy() {
    if (this.client) {
      await this.client.quit();
    }
  }
}
