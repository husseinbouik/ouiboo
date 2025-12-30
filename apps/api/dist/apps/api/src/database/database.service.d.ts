import { OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@ouiboo/database';
export declare class DatabaseService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
    onModuleInit(): Promise<void>;
    onModuleDestroy(): Promise<void>;
}
