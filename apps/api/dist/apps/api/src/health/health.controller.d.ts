import { DatabaseService } from '../database/database.service';
export declare class HealthController {
    private db;
    constructor(db: DatabaseService);
    getHealth(): Promise<{
        status: string;
        timestamp: string;
        uptime: number;
        database: string;
    }>;
    getDatabaseHealth(): Promise<{
        status: string;
    }>;
}
