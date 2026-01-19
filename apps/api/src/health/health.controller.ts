import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';

@Controller('health')
export class HealthController {
    constructor(private db: DatabaseService) { }

    @Get()
    getHealth() {
        return {
            status: 'ok',
            timestamp: new Date().toISOString(),
            uptime: process.uptime(),
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
