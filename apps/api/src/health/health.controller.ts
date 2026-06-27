import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { RedisService } from '../common/redis.service';

@Controller('health')
export class HealthController {
    constructor(
        private db: DatabaseService,
        private redisService: RedisService,
    ) { }

    @Get()
    async getHealth() {
        let dbStatus = 'ok';
        try {
            await this.db.$queryRaw`SELECT 1`;
        } catch {
            dbStatus = 'unhealthy';
        }

        const redisStatus = await this.checkRedisStatus();

        return {
            status: dbStatus === 'ok' ? 'ok' : 'error',
            timestamp: new Date().toISOString(),
            uptime: process.uptime(),
            database: dbStatus,
            redis: redisStatus,
        };
    }

    @Get('db')
    async getDatabaseHealth() {
        try {
            await this.db.$queryRaw`SELECT 1`;
            return { status: 'ok' };
        } catch {
            throw new ServiceUnavailableException('Database unreachable');
        }
    }

    @Get('redis')
    async getRedisHealth() {
        const redisStatus = await this.checkRedisStatus();
        if (redisStatus !== 'ok') {
            throw new ServiceUnavailableException('Redis unreachable');
        }

        return { status: 'ok' };
    }

    private async checkRedisStatus() {
        try {
            const redis = this.redisService.getClient();
            if (!redis) {
                return process.env.NODE_ENV === 'production' ? 'unhealthy' : 'not_configured';
            }
            await redis.ping();
            return 'ok';
        } catch {
            return 'unhealthy';
        }
    }
}
