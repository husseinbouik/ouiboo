import { CanActivate, ExecutionContext } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
export declare class SubscriptionGuard implements CanActivate {
    private db;
    constructor(db: DatabaseService);
    canActivate(context: ExecutionContext): Promise<boolean>;
}
