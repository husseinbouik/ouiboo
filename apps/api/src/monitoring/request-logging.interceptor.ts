import { Injectable, NestInterceptor, ExecutionContext, CallHandler, Logger } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { randomUUID } from 'crypto';

@Injectable()
export class RequestLoggingInterceptor implements NestInterceptor {
    private readonly logger = new Logger('HTTP');

    intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
        const req = context.switchToHttp().getRequest();
        const res = context.switchToHttp().getResponse();
        const method = req.method;
        const url = req.originalUrl || req.url;
        const start = Date.now();
        const correlationId = req.headers['x-correlation-id'] || randomUUID();
        req.correlationId = correlationId;
        res.setHeader('x-correlation-id', correlationId);

        return next.handle().pipe(
            tap({
                next: () => {
                    const duration = Date.now() - start;
                    this.logger.log(`${method} ${url} ${res.statusCode} - ${duration}ms - cid=${correlationId}`);
                },
                error: (err) => {
                    const duration = Date.now() - start;
                    this.logger.error(`${method} ${url} ${res?.statusCode ?? 500} - ${duration}ms - cid=${correlationId}`, err?.stack);
                },
            }),
        );
    }
}
