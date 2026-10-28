import { Prisma } from '@ouiboo/database';
import { currentTenantAgencyId } from './tenant-context';

/**
 * #428 PR-C (Council P1-01, defence in depth): structural tenant
 * scoping at the data layer.
 *
 * PR-A/PR-B (#606) stamped every tenant-owned row with `agencyId` and
 * bound the money chain with composite foreign keys, so a cross-tenant
 * PAIRING cannot be written. What they cannot do is stop a query that
 * simply forgets its `where: { agencyId }` clause from READING another
 * tenant's rows — isolation there still rested on per-query discipline
 * in every service. This Prisma client extension removes that
 * assumption: while a tenant context is active (agency-authenticated
 * requests only, see tenant-context.ts), every operation on an
 * agency-owned model is constrained to the context tenant —
 *
 * - reads (find/count/aggregate/groupBy) gain `agencyId = tenant` on
 *   their where; a where that already pins a DIFFERENT tenant id fails
 *   closed with TenantScopeViolationError instead of being honoured;
 * - creates are stamped with the tenant when the caller did not stamp
 *   them (PR-A discipline, now structural), and a create that names a
 *   different tenant — directly or via an agency `connect` — throws;
 * - updates/deletes/upserts get the same where scoping, and update
 *   payloads may not move a row to another tenant.
 *
 * Queries issued with no tenant context (admin, traveller, public,
 * cron, webhooks) pass through untouched — those actors are either
 * cross-tenant by design or scoped by their own ownership rules.
 * Models without an `agencyId` column (User, AgencyProfile itself,
 * and transitively-owned rows like PaymentProof or Message) are not
 * scoped here; their parents are, and RLS remains out of scope until
 * the app connects per-tenant (see the #428 audit).
 *
 * Deliberate exception — `findUnique` / `findUniqueOrThrow` are NOT
 * scoped. A unique-key point lookup is how every service in this
 * codebase loads a row before applying its explicit ownership check,
 * and that check owns the API's denial contract: the #425 suite pins
 * 403 for a foreign direct-ID read, which the service can only
 * produce when the lookup returns the row (a scoped null surfaces as
 * the service's not-found idiom instead — a silent contract rewrite
 * across every service, which is not this layer's call to make).
 * `findFirst` IS scoped: a first-match on a non-unique business key
 * (reference, idempotency key, …) can silently land on another
 * tenant's row, which is exactly the missed-where leak this layer
 * exists to close. The residual discipline — a service must still
 * ownership-check what its point lookup returns — is the layer the
 * #425 suite polices.
 */

/**
 * Every model whose rows carry an `agencyId` stamp (schema at PR-B).
 * Kept as an explicit list on purpose: adding a model here is a
 * deliberate isolation decision, reviewed with the schema change that
 * gives the model its stamp.
 */
export const TENANT_SCOPED_MODELS: ReadonlySet<string> = new Set([
    'AgencyPaymentProfile',
    'Booking',
    'BookingPaymentPlan',
    'Conversation',
    'DuplicateCreditFlag',
    'ExternalPayment',
    'Invoice',
    'InvoiceLineItem',
    'PaymentAttempt',
    'PaymentReconciliationMismatch',
    'PaymentStatusLedgerEntry',
    'PaymentTransaction',
    'PayoutRequest',
    'RefundCase',
    'Review',
    'TripSession',
    'TripTemplate',
    'Wallet',
]);

/** Raised when tenant-scoped code tries to reach across tenants. */
export class TenantScopeViolationError extends Error {
    constructor(model: string, operation: string, contextAgencyId: string, attemptedAgencyId: string) {
        super(
            `Tenant scope violation: ${model}.${operation} under tenant ${contextAgencyId} ` +
            `attempted to target tenant ${attemptedAgencyId}`,
        );
        this.name = 'TenantScopeViolationError';
    }
}

const READ_OPERATIONS: ReadonlySet<string> = new Set([
    'findMany',
    'findFirst',
    'findFirstOrThrow',
    'count',
    'aggregate',
    'groupBy',
]);

/** Point lookups by unique key: deliberately passed through (header). */
const UNIQUE_LOOKUP_OPERATIONS: ReadonlySet<string> = new Set([
    'findUnique',
    'findUniqueOrThrow',
]);

const CREATE_OPERATIONS: ReadonlySet<string> = new Set([
    'create',
    'createMany',
    'createManyAndReturn',
]);

function scopeWhere(model: string, operation: string, where: any, agencyId: string): any {
    if (where == null) {
        return { agencyId };
    }
    const existing = where.agencyId;
    if (existing === undefined) {
        return { ...where, agencyId };
    }
    if (typeof existing === 'string') {
        if (existing === agencyId) {
            return where;
        }
        throw new TenantScopeViolationError(model, operation, agencyId, existing);
    }
    // A complex agencyId filter (in / not / …): keep it, but AND the
    // tenant equality on top so the result can never leave the tenant.
    return { AND: [where, { agencyId }] };
}

function scopeCreateData(model: string, operation: string, data: any, agencyId: string): any {
    if (Array.isArray(data)) {
        return data.map((item) => scopeCreateData(model, operation, item, agencyId));
    }
    if (data == null || typeof data !== 'object') {
        return data;
    }
    const existing = data.agencyId;
    if (typeof existing === 'string') {
        if (existing !== agencyId) {
            throw new TenantScopeViolationError(model, operation, agencyId, existing);
        }
        return data;
    }
    if (existing !== undefined) {
        return data;
    }
    // No scalar stamp: a relation payload may still name the tenant.
    const relation = data.agency;
    const connectId = relation?.connect?.id;
    if (typeof connectId === 'string') {
        if (connectId !== agencyId) {
            throw new TenantScopeViolationError(model, operation, agencyId, connectId);
        }
        return data;
    }
    if (relation !== undefined) {
        // Nested create/connect shapes the extension cannot verify —
        // leave them to the composite FKs (PR-B) and service discipline.
        return data;
    }
    return { ...data, agencyId };
}

function guardUpdateData(model: string, operation: string, data: any, agencyId: string): any {
    if (data == null || typeof data !== 'object') {
        return data;
    }
    const existing = data.agencyId;
    const attempted = typeof existing === 'string'
        ? existing
        : typeof existing?.set === 'string'
            ? existing.set
            : undefined;
    if (attempted !== undefined && attempted !== agencyId) {
        throw new TenantScopeViolationError(model, operation, agencyId, attempted);
    }
    return data;
}

/**
 * Apply tenant scoping to one operation's args. Pure and exported for
 * tests; the extension below is a thin adapter over it. Returns the
 * args to execute (a copy — the caller's object is never mutated).
 */
export function scopeOperationArgs(
    model: string,
    operation: string,
    args: any,
    agencyId: string,
): any {
    if (UNIQUE_LOOKUP_OPERATIONS.has(operation)) {
        return args;
    }
    if (READ_OPERATIONS.has(operation)) {
        return { ...args, where: scopeWhere(model, operation, args?.where, agencyId) };
    }
    if (CREATE_OPERATIONS.has(operation)) {
        if (args?.data === undefined) {
            return args;
        }
        return { ...args, data: scopeCreateData(model, operation, args.data, agencyId) };
    }
    if (operation === 'update' || operation === 'updateMany') {
        return {
            ...args,
            where: scopeWhere(model, operation, args?.where, agencyId),
            data: guardUpdateData(model, operation, args?.data, agencyId),
        };
    }
    if (operation === 'delete' || operation === 'deleteMany') {
        return { ...args, where: scopeWhere(model, operation, args?.where, agencyId) };
    }
    if (operation === 'upsert') {
        return {
            ...args,
            where: scopeWhere(model, operation, args?.where, agencyId),
            create: scopeCreateData(model, operation, args?.create, agencyId),
            update: guardUpdateData(model, operation, args?.update, agencyId),
        };
    }
    return args;
}

/**
 * The Prisma client extension DatabaseService installs. Inert unless a
 * tenant context is active AND the model is agency-owned.
 */
export const tenantScopeExtension = Prisma.defineExtension({
    name: 'ouiboo-tenant-scope',
    query: {
        $allModels: {
            async $allOperations({ model, operation, args, query }: any) {
                const agencyId = currentTenantAgencyId();
                if (!agencyId || !model || !TENANT_SCOPED_MODELS.has(model)) {
                    return query(args);
                }
                return query(scopeOperationArgs(model, operation, args, agencyId));
            },
        },
    },
});
