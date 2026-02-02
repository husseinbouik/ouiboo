import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';

@Controller('health')
export class HealthController {
    constructor(private db: DatabaseService) { }

    @Get()
    async getHealth() {
        let dbStatus = 'ok';
        try {
            await this.db.$queryRaw`SELECT 1`;
        } catch (_e) {
            dbStatus = 'unhealthy';
        }

        return {
            status: dbStatus === 'ok' ? 'ok' : 'error',
            timestamp: new Date().toISOString(),
            uptime: process.uptime(),
            database: dbStatus,
        };
    }

    @Get('db')
    async getDatabaseHealth() {
        try {
            await this.db.$queryRaw`SELECT 1`;
            return { status: 'ok' };
        } catch (_error) {
            throw new ServiceUnavailableException('Database unreachable');
        }
    }
}
