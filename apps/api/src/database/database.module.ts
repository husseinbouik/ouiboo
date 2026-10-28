import { Global, Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { DatabaseService } from './database.service';
import { TenantContextInterceptor } from './tenant-context.interceptor';

@Global()
@Module({
    providers: [
        DatabaseService,
        // #428 PR-C: populate the request tenant context the
        // tenant-scope extension reads (see tenant-context.ts).
        { provide: APP_INTERCEPTOR, useClass: TenantContextInterceptor },
    ],
    exports: [DatabaseService],
})
export class DatabaseModule { }
