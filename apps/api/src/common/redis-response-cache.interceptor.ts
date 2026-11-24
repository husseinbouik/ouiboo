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

// #1017 (F5): cacheable public GET routes. Patterns are path templates;
// `:param` matches exactly one path segment. TTLs in seconds.
const CACHE_ROUTES: ReadonlyArray<{ pattern: string; ttl: number }> = [
  { pattern: '/api/v1/trips', ttl: 60 },
  { pattern: '/api/v1/trips/destinations/:slug', ttl: 120 },
  { pattern: '/api/v1/agencies/:id/public', ttl: 60 },
  { pattern: '/api/v1/currency/convert', ttl: 300 },
]

const matchesPattern = (pattern: string, pathname: string) => {
  const patternParts = pattern.split('/')
  const pathParts = pathname.split('/')
  if (patternParts.length !== pathParts.length) return false
  return patternParts.every(
    (part, index) => part.startsWith(':') || part === pathParts[index]
  )
}

const ttlForPath = (pathname: string) =>
  CACHE_ROUTES.find((route) => matchesPattern(route.pattern, pathname))?.ttl

// #1017 (F5): the cache key must carry every input that can change the
// payload. The trips/destination handlers resolve locale from the
// `?locale=` query param OR the `x-ouiboo-language` header — the query
// is already in the key via the sorted search string, but the header
// was not, so one language's payload could be served to another
// language's visitors. Auth presence is included for the same reason:
// an authenticated variant must never be served to an anonymous caller
// (or vice versa).
const normalizedCacheKey = (request: Request) => {
  const url = new URL(request.originalUrl || request.url, 'http://ouiboo.local')
  url.searchParams.sort()
  const languageHeader = request.headers['x-ouiboo-language']
  const language =
    (Array.isArray(languageHeader) ? languageHeader[0] : languageHeader)
      ?.trim()
      .toLowerCase() || 'default'
  const auth = request.headers.authorization ? 'auth' : 'anon'
  return `http-cache:${url.pathname}${url.search}|lang=${language}|auth=${auth}`
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

  private async invalidateByPrefix(redis: Redis, prefix: string) {
    try {
      let cursor = '0'
      do {
        const [nextCursor, keys] = await redis.scan(
          cursor,
          'MATCH',
          `http-cache:${prefix}*`,
          'COUNT',
          100
        )
        cursor = nextCursor
        if (keys.length > 0) await redis.unlink(...keys)
      } while (cursor !== '0')
    } catch (error) {
      this.logger.warn(`Cache invalidation failed for ${prefix}: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<Request>()
    const response = context.switchToHttp().getResponse<Response>()
    const pathname = (request.originalUrl || request.url).split('?')[0]
    const ttl = ttlForPath(pathname)

    const isMutation = ['POST', 'PATCH', 'PUT', 'DELETE'].includes(request.method)
    // Trip mutations change the trip list AND destination inventories.
    const isTripMutation = isMutation && pathname.startsWith('/api/v1/trips')
    // Agency self-service edits and admin verification decisions change
    // the cached public agency profile; admin decisions also change
    // which agencies (and therefore trips) are publicly bookable.
    const isAgencyMutation =
      isMutation &&
      (pathname.startsWith('/api/v1/agency') ||
        pathname.startsWith('/api/v1/admin'))
    const isAdminMutation = isMutation && pathname.startsWith('/api/v1/admin')

    if (isTripMutation || isAgencyMutation) {
      const mutationRedis = this.redisService.getClient()
      if (!mutationRedis) return next.handle()
      return next.handle().pipe(
        tap(() => {
          if (isTripMutation || isAdminMutation) {
            void this.invalidateByPrefix(mutationRedis, '/api/v1/trips')
          }
          if (isAgencyMutation) {
            void this.invalidateByPrefix(mutationRedis, '/api/v1/agencies')
          }
        })
      )
    }

    if (request.method !== 'GET' || !ttl) return next.handle()

    const redis = this.redisService.getClient()
    if (!redis) {
      response.setHeader('X-Cache', 'BYPASS')
      return next.handle()
    }

    const key = normalizedCacheKey(request)
    // Anonymous responses on cacheable public routes are safe for
    // shared caches (CDN) to store; authenticated variants stay private.
    const cacheControl = request.headers.authorization
      ? `private, max-age=${ttl}`
      : `public, max-age=${ttl}, stale-while-revalidate=${ttl * 2}`

    return from(this.read(redis, key)).pipe(
      switchMap(({ cached, failed }) => {
        if (cached) {
          try {
            response.setHeader('X-Cache', 'HIT')
            response.setHeader('Cache-Control', cacheControl)
            return of(JSON.parse(cached))
          } catch {
            void redis.del(key)
          }
        }

        response.setHeader('X-Cache', failed ? 'BYPASS' : 'MISS')
        if (!failed) response.setHeader('Cache-Control', cacheControl)
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
