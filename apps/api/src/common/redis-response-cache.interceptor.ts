import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common'
import type { Request, Response } from 'express'
import type Redis from 'ioredis'
import type { Observable } from 'rxjs'
import { from, of } from 'rxjs'
import { switchMap, tap } from 'rxjs/operators'
import { RedisService } from './redis.service'

const CACHE_ROUTES: Record<string, number> = {
  '/api/v1/trips': 60,
  '/api/v1/currency/convert': 300,
}

const normalizedCacheKey = (request: Request) => {
  const url = new URL(request.originalUrl || request.url, 'http://ouiboo.local')
  url.searchParams.sort()
  return `http-cache:${url.pathname}${url.search}`
}

@Injectable()
export class RedisResponseCacheInterceptor implements NestInterceptor {
  private readonly logger = new Logger(RedisResponseCacheInterceptor.name)

  constructor(private readonly redisService: RedisService) {}

  private async read(redis: Redis, key: string) {
    try {
      return { cached: await redis.get(key), failed: false }
    } catch (error) {
      this.logger.warn(
        `Redis cache read failed: ${
          error instanceof Error ? error.message : String(error)
        }`
      )
      return { cached: null, failed: true }
    }
  }

  private async invalidateTripLists(redis: Redis) {
    try {
      let cursor = '0'
      do {
        const [nextCursor, keys] = await redis.scan(
          cursor,
          'MATCH',
          'http-cache:/api/v1/trips*',
          'COUNT',
          100
        )
        cursor = nextCursor
        if (keys.length > 0) await redis.unlink(...keys)
      } while (cursor !== '0')
    } catch (error) {
      this.logger.warn(`Trip cache invalidation failed: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<Request>()
    const response = context.switchToHttp().getResponse<Response>()
    const pathname = (request.originalUrl || request.url).split('?')[0]
    const ttl = CACHE_ROUTES[pathname]

    const isTripMutation =
      ['POST', 'PATCH', 'PUT', 'DELETE'].includes(request.method) &&
      pathname.startsWith('/api/v1/trips')

    if (isTripMutation) {
      const mutationRedis = this.redisService.getClient()
      if (!mutationRedis) return next.handle()
      return next.handle().pipe(
        tap(() => void this.invalidateTripLists(mutationRedis))
      )
    }

    if (request.method !== 'GET' || !ttl) return next.handle()

    const redis = this.redisService.getClient()
    if (!redis) {
      response.setHeader('X-Cache', 'BYPASS')
      return next.handle()
    }

    const key = normalizedCacheKey(request)

    return from(this.read(redis, key)).pipe(
      switchMap(({ cached, failed }) => {
        if (cached) {
          try {
            response.setHeader('X-Cache', 'HIT')
            response.setHeader(
              'Cache-Control',
              `public, max-age=${ttl}, stale-while-revalidate=${ttl * 2}`
            )
            return of(JSON.parse(cached))
          } catch {
            void redis.del(key)
          }
        }

        response.setHeader('X-Cache', failed ? 'BYPASS' : 'MISS')
        return next.handle().pipe(
          tap((body) => {
            if (failed) return
            void redis
              .set(key, JSON.stringify(body), 'EX', ttl)
              .catch((error: Error) =>
                this.logger.warn(`Redis cache write failed: ${error.message}`)
              )
          })
        )
      })
    )
  }
}
