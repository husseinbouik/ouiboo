import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable } from 'rxjs';
import { runWithTenantContext } from './tenant-context';

/**
 * #428 PR-C: bridges the HTTP tenant resolution into the data layer.
 *
 * Guards run before interceptors in Nest, so by the time this runs
 * TenantGuard has already placed the caller's AgencyProfile id on
 * `req.tenantId` (the JWT strategy's resolution on `req.user` is the
 * fallback for routes without the guard). While the handler — and
 * therefore every service and database call it makes — executes, the
 * id lives in the AsyncLocalStorage the tenant-scope extension reads.
 *
 * Requests that are not agency work (traveller, admin, anonymous) get
 * no context and are deliberately left unscoped. The subscription is
 * created inside the context on purpose: with RxJS, the async chain
 * that carries the tenant is the one established at subscribe time.
 */
@Injectable()
export class TenantContextInterceptor implements NestInterceptor {
    intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
        if (context.getType() !== 'http') {
            return next.handle();
        }
        const req = context.switchToHttp().getRequest();
        const agencyId: unknown = req?.tenantId ?? req?.user?.tenantId ?? req?.user?.agencyId;
        if (typeof agencyId !== 'string' || agencyId.length === 0) {
            return next.handle();
        }
        return new Observable((subscriber) =>
            runWithTenantContext(agencyId, () => next.handle().subscribe(subscriber)),
        );
    }
}
