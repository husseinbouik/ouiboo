import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common'
import type { Observable } from 'rxjs'
import type { Request } from 'express'
import { map } from 'rxjs/operators'

export interface ResponseMeta {
  page: number
  limit: number
  total: number
  totalPages: number
}

export interface ApiSuccessResponse<T> {
  success: true
  data: T
  meta?: ResponseMeta
  timestamp: string
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value)

const isPaginationMeta = (value: unknown): value is ResponseMeta =>
  isRecord(value) &&
  ['page', 'limit', 'total', 'totalPages'].every(
    (key) => typeof value[key] === 'number'
  )

@Injectable()
export class ResponseInterceptor<T>
  implements NestInterceptor<T, ApiSuccessResponse<unknown>>
{
  intercept(
    context: ExecutionContext,
    next: CallHandler<T>
  ): Observable<ApiSuccessResponse<unknown>> {
    const request = context.switchToHttp().getRequest<Request>()
    const accept = request.headers.accept || ''
    const envelopeEnabled =
      process.env.API_ENVELOPE_MODE === 'always' ||
      accept.includes('application/vnd.ouiboo.v2+json')

    if (!envelopeEnabled) return next.handle() as Observable<ApiSuccessResponse<unknown>>

    return next.handle().pipe(
      map((body: unknown) => {
        if (isRecord(body) && body.success === true && 'data' in body) {
          return body as unknown as ApiSuccessResponse<unknown>
        }

        if (
          isRecord(body) &&
          Array.isArray(body.data) &&
          isPaginationMeta(body.pagination)
        ) {
          return {
            success: true,
            data: body.data,
            meta: body.pagination,
            timestamp: new Date().toISOString(),
          }
        }

        return {
          success: true,
          data: body ?? null,
          timestamp: new Date().toISOString(),
        }
      })
    )
  }
}
