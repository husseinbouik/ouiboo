import { ServiceUnavailableException } from '@nestjs/common';
import { HealthController } from './health.controller';
import type { DatabaseService } from '../database/database.service';
import type { RedisService } from '../common/redis.service';

const createController = ({
    databaseHealthy = true,
    redisHealthy = true,
}: {
    databaseHealthy?: boolean;
    redisHealthy?: boolean;
} = {}) => {
    const db = {
        $queryRaw: databaseHealthy
            ? jest.fn().mockResolvedValue([{ '?column?': 1 }])
            : jest.fn().mockRejectedValue(new Error('database unavailable')),
    } as unknown as DatabaseService;
    const redis = {
        ping: redisHealthy
            ? jest.fn().mockResolvedValue('PONG')
            : jest.fn().mockRejectedValue(new Error('redis unavailable')),
    };
    const redisService = {
        getClient: jest.fn(() => redis),
    } as unknown as RedisService;

    return new HealthController(db, redisService);
};

describe('HealthController readiness', () => {
    it('reports ready only when database and Redis are healthy', async () => {
        const controller = createController();

        await expect(controller.getReadiness()).resolves.toMatchObject({
            status: 'ok',
            database: 'ok',
            redis: 'ok',
        });
    });

    it('returns service unavailable when the database is unhealthy', async () => {
        const controller = createController({ databaseHealthy: false });

        await expect(controller.getReadiness()).rejects.toBeInstanceOf(
            ServiceUnavailableException,
        );
    });

    it('returns service unavailable when Redis is unhealthy', async () => {
        const controller = createController({ redisHealthy: false });

        await expect(controller.getReadiness()).rejects.toBeInstanceOf(
            ServiceUnavailableException,
        );
    });
});
