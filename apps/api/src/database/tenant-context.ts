import { AsyncLocalStorage } from 'async_hooks';

/**
 * #428 PR-C (Council P1-01, defence in depth): request-scoped tenant
 * context for the data layer.
 *
 * TenantGuard already resolves the caller's agency (an AgencyProfile
 * id) onto the request; TenantContextInterceptor copies it into this
 * AsyncLocalStorage for the duration of the request, and the tenant
 * scope Prisma extension (tenant-scope.ts) reads it on every query.
 * Code running outside an agency request — admin and traveller
 * requests, cron jobs, webhooks, scripts — has no store here, and the
 * extension leaves its queries untouched: scoping is strictly a
 * property of agency-authenticated work.
 */
export interface TenantContext {
    agencyId: string;
}

const tenantContextStorage = new AsyncLocalStorage<TenantContext>();

/** Run `callback` with `agencyId` as the active tenant context. */
export function runWithTenantContext<T>(agencyId: string, callback: () => T): T {
    return tenantContextStorage.run({ agencyId }, callback);
}

/** The active tenant's AgencyProfile id, or null outside agency work. */
export function currentTenantAgencyId(): string | null {
    return tenantContextStorage.getStore()?.agencyId ?? null;
}
