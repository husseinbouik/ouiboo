import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@ouiboo/database';

@Injectable()
export class DatabaseService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
    async onModuleInit() {
        await this.$connect();
        console.log('Database models available:', Object.keys(this).filter(k => !k.startsWith('$')));
    }

    async onModuleDestroy() {
        await this.$disconnect();
    }
}
