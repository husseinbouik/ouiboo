import { CallHandler, ExecutionContext } from '@nestjs/common';
import { Observable, lastValueFrom, of } from 'rxjs';
import { TenantContextInterceptor } from './tenant-context.interceptor';
import { currentTenantAgencyId } from './tenant-context';

/**
 * #428 PR-C — the interceptor must make the tenant visible to code
 * running inside the handler's async chain (that is where services
 * query), for agency requests only.
 */
describe('TenantContextInterceptor (#428 PR-C)', () => {
    const interceptor = new TenantContextInterceptor();

    const httpContext = (req: unknown): ExecutionContext => ({
        getType: () => 'http',
        switchToHttp: () => ({ getRequest: () => req }),
    } as unknown as ExecutionContext);

    const probingHandler: CallHandler = {
        handle: () => new Observable((subscriber) => {
            // Defer past a macrotask: the tenant must survive the same
            // async hops a real service's database calls take.
            setImmediate(() => {
                subscriber.next(currentTenantAgencyId());
                subscriber.complete();
            });
        }),
    };

    it('exposes req.tenantId (TenantGuard) inside the handler', async () => {
        const result = interceptor.intercept(httpContext({ tenantId: 'agency-1' }), probingHandler);
        await expect(lastValueFrom(result)).resolves.toBe('agency-1');
        expect(currentTenantAgencyId()).toBeNull();
    });

    it('falls back to the JWT user tenant when the guard did not run', async () => {
        const result = interceptor.intercept(
            httpContext({ user: { tenantId: 'agency-2' } }), probingHandler,
        );
        await expect(lastValueFrom(result)).resolves.toBe('agency-2');
    });

    it('leaves traveller/admin requests without a context', async () => {
        const result = interceptor.intercept(httpContext({ user: { role: 'ADMIN' } }), probingHandler);
        await expect(lastValueFrom(result)).resolves.toBeNull();
    });

    it('passes non-http contexts straight through', async () => {
        const rpcContext = { getType: () => 'rpc' } as unknown as ExecutionContext;
        const result = interceptor.intercept(rpcContext, { handle: () => of('ok') });
        await expect(lastValueFrom(result)).resolves.toBe('ok');
    });
});
