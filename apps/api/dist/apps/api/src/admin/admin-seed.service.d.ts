import { OnModuleInit } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
export declare class AdminSeedService implements OnModuleInit {
    private readonly db;
    private readonly logger;
    constructor(db: DatabaseService);
    onModuleInit(): Promise<void>;
}
