import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@ouiboo/database';
import { tenantScopeExtension } from './tenant-scope';

@Injectable()
export class DatabaseService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
    constructor() {
        super();
        // #428 PR-C: install the tenant-scope extension (tenant-scope.ts).
        // $extends returns a NEW client object; Nest holds this instance,
        // so the extended model delegates and $-methods are copied onto
        // it, shadowing the unscoped base delegates. Everything else —
        // lifecycle hooks, $connect/$disconnect, internals — stays the
        // base client's. The extension itself is inert outside an
        // agency tenant context (see tenant-context.ts).
        const extended = this.$extends(tenantScopeExtension) as unknown as Record<string, unknown>;
        const self = this as unknown as Record<string, unknown>;
        for (const key of Object.keys(extended)) {
            self[key] = extended[key];
        }
    }

    async onModuleInit() {
        await this.$connect();
    }

    async onModuleDestroy() {
        await this.$disconnect();
    }
}
