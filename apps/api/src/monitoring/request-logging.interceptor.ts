import { Injectable, NestInterceptor, ExecutionContext, CallHandler, Logger } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

@Injectable()
export class RequestLoggingInterceptor implements NestInterceptor {
    private readonly logger = new Logger('HTTP');

    intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
        const req = context.switchToHttp().getRequest();
        const method = req.method;
        const url = req.originalUrl || req.url;
        const start = Date.now();

        return next.handle().pipe(
            tap({
                next: () => {
                    const res = context.switchToHttp().getResponse();
                    const duration = Date.now() - start;
                    this.logger.log(`${method} ${url} ${res.statusCode} - ${duration}ms`);
                },
                error: (err) => {
                    const res = context.switchToHttp().getResponse();
                    const duration = Date.now() - start;
                    this.logger.error(`${method} ${url} ${res?.statusCode ?? 500} - ${duration}ms`, err?.stack);
                },
            }),
        );
    }
}
