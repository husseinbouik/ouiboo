import type { CallHandler, ExecutionContext } from '@nestjs/common'
import type { Request, Response } from 'express'
import type Redis from 'ioredis'
import { lastValueFrom, of } from 'rxjs'
import { RedisResponseCacheInterceptor } from './redis-response-cache.interceptor'
import type { RedisService } from './redis.service'

type RedisMock = {
  get: jest.Mock
  set: jest.Mock
  del: jest.Mock
  scan: jest.Mock
  unlink: jest.Mock
}

const createRedis = (): RedisMock => ({
  get: jest.fn().mockResolvedValue(null),
  set: jest.fn().mockResolvedValue('OK'),
  del: jest.fn().mockResolvedValue(1),
  scan: jest.fn().mockResolvedValue(['0', []]),
  unlink: jest.fn().mockResolvedValue(1),
})

const createContext = (
  request: Pick<Request, 'method' | 'url'> &
    Partial<Pick<Request, 'originalUrl'>> & { headers?: Record<string, string> }
) => {
  request = { headers: {}, ...request }
  const headers: Record<string, string> = {}
  const response = {
    setHeader: jest.fn((name: string, value: string) => {
      headers[name] = value
    }),
  } as unknown as Response

  const context = {
    switchToHttp: () => ({
      getRequest: () => request as Request,
      getResponse: () => response,
    }),
  } as unknown as ExecutionContext

  return { context, response, headers }
}

const createInterceptor = (redis: RedisMock | null) =>
  new RedisResponseCacheInterceptor({
    getClient: () => redis as unknown as Redis,
  } as RedisService)

describe('RedisResponseCacheInterceptor', () => {
  it('normalizes query ordering and returns a cached trip list', async () => {
    const redis = createRedis()
    redis.get.mockResolvedValue(JSON.stringify({ data: ['cached'] }))
    const interceptor = createInterceptor(redis)
    const { context, headers } = createContext({
      method: 'GET',
      url: '/api/v1/trips?status=ACTIVE&page=2',
      originalUrl: '/api/v1/trips?status=ACTIVE&page=2',
    })
    const next = { handle: jest.fn(() => of({ data: ['fresh'] })) }

    const result = await lastValueFrom(
      interceptor.intercept(context, next as CallHandler)
    )

    expect(redis.get).toHaveBeenCalledWith(
      'http-cache:/api/v1/trips?page=2&status=ACTIVE|lang=default|auth=anon'
    )
    expect(result).toEqual({ data: ['cached'] })
    expect(headers['X-Cache']).toBe('HIT')
    expect(next.handle).not.toHaveBeenCalled()
  })

  it('stores a cache miss with the route TTL', async () => {
    const redis = createRedis()
    const interceptor = createInterceptor(redis)
    const { context, headers } = createContext({
      method: 'GET',
      url: '/api/v1/trips?page=1',
      originalUrl: '/api/v1/trips?page=1',
    })
    const body = { data: [{ id: 'trip-1' }] }
    const next = { handle: jest.fn(() => of(body)) }

    await lastValueFrom(interceptor.intercept(context, next as CallHandler))
    await Promise.resolve()

    expect(headers['X-Cache']).toBe('MISS')
    expect(redis.set).toHaveBeenCalledWith(
      'http-cache:/api/v1/trips?page=1|lang=default|auth=anon',
      JSON.stringify(body),
      'EX',
      60
    )
  })

  it('bypasses Redis when no client is configured', async () => {
    const interceptor = createInterceptor(null)
    const { context, headers } = createContext({
      method: 'GET',
      url: '/api/v1/trips',
      originalUrl: '/api/v1/trips',
    })
    const next = { handle: jest.fn(() => of({ data: [] })) }

    await lastValueFrom(interceptor.intercept(context, next as CallHandler))

    expect(headers['X-Cache']).toBe('BYPASS')
    expect(next.handle).toHaveBeenCalledTimes(1)
  })

  it('invalidates cached trip lists after a successful mutation', async () => {
    const redis = createRedis()
    redis.scan
      .mockResolvedValueOnce(['7', ['http-cache:/api/v1/trips?page=1']])
      .mockResolvedValueOnce(['0', ['http-cache:/api/v1/trips?page=2']])
    const interceptor = createInterceptor(redis)
    const { context } = createContext({
      method: 'PATCH',
      url: '/api/v1/trips/trip-1',
      originalUrl: '/api/v1/trips/trip-1',
    })
    const next = { handle: jest.fn(() => of({ id: 'trip-1' })) }

    await lastValueFrom(interceptor.intercept(context, next as CallHandler))
    await new Promise((resolve) => setImmediate(resolve))

    expect(redis.scan).toHaveBeenNthCalledWith(
      1,
      '0',
      'MATCH',
      'http-cache:/api/v1/trips*',
      'COUNT',
      100
    )
    expect(redis.unlink).toHaveBeenNthCalledWith(
      1,
      'http-cache:/api/v1/trips?page=1'
    )
    expect(redis.unlink).toHaveBeenNthCalledWith(
      2,
      'http-cache:/api/v1/trips?page=2'
    )
  })

  it('separates cache entries by the x-ouiboo-language header (#1017)', async () => {
    const redis = createRedis()
    redis.get.mockImplementation(async (key: string) =>
      key.includes('lang=fr')
        ? JSON.stringify({ data: ['fr'] })
        : JSON.stringify({ data: ['default'] })
    )
    const interceptor = createInterceptor(redis)

    const frContext = createContext({
      method: 'GET',
      url: '/api/v1/trips?page=1',
      originalUrl: '/api/v1/trips?page=1',
      headers: { 'x-ouiboo-language': 'fr' },
    })
    const frNext = { handle: jest.fn(() => of({ data: ['fresh'] })) }
    const frResult = await lastValueFrom(
      interceptor.intercept(frContext.context, frNext as CallHandler)
    )

    expect(redis.get).toHaveBeenCalledWith(
      'http-cache:/api/v1/trips?page=1|lang=fr|auth=anon'
    )
    expect(frResult).toEqual({ data: ['fr'] })
    expect(frNext.handle).not.toHaveBeenCalled()

    const defaultContext = createContext({
      method: 'GET',
      url: '/api/v1/trips?page=1',
      originalUrl: '/api/v1/trips?page=1',
    })
    const defaultNext = { handle: jest.fn(() => of({ data: ['fresh'] })) }
    const defaultResult = await lastValueFrom(
      interceptor.intercept(defaultContext.context, defaultNext as CallHandler)
    )

    expect(redis.get).toHaveBeenCalledWith(
      'http-cache:/api/v1/trips?page=1|lang=default|auth=anon'
    )
    expect(defaultResult).toEqual({ data: ['default'] })
    expect(defaultNext.handle).not.toHaveBeenCalled()
  })

  it('separates authenticated variants and keeps them out of shared caches (#1017)', async () => {
    const redis = createRedis()
    const interceptor = createInterceptor(redis)
    const { context, headers } = createContext({
      method: 'GET',
      url: '/api/v1/trips?page=1',
      originalUrl: '/api/v1/trips?page=1',
      headers: { authorization: 'Bearer token-123' },
    })
    const next = { handle: jest.fn(() => of({ data: [] })) }

    await lastValueFrom(interceptor.intercept(context, next as CallHandler))

    expect(redis.get).toHaveBeenCalledWith(
      'http-cache:/api/v1/trips?page=1|lang=default|auth=auth'
    )
    expect(headers['Cache-Control']).toBe('private, max-age=60')
  })

  it('caches destination inventory with its own TTL (#1017)', async () => {
    const redis = createRedis()
    const interceptor = createInterceptor(redis)
    const { context, headers } = createContext({
      method: 'GET',
      url: '/api/v1/trips/destinations/tangier',
      originalUrl: '/api/v1/trips/destinations/tangier',
    })
    const body = { slug: 'tangier', trips: [] }
    const next = { handle: jest.fn(() => of(body)) }

    await lastValueFrom(interceptor.intercept(context, next as CallHandler))
    await Promise.resolve()

    expect(headers['X-Cache']).toBe('MISS')
    expect(headers['Cache-Control']).toBe(
      'public, max-age=120, stale-while-revalidate=240'
    )
    expect(redis.set).toHaveBeenCalledWith(
      'http-cache:/api/v1/trips/destinations/tangier|lang=default|auth=anon',
      JSON.stringify(body),
      'EX',
      120
    )
  })

  it('caches the agency public profile (#1017)', async () => {
    const redis = createRedis()
    const interceptor = createInterceptor(redis)
    const { context, headers } = createContext({
      method: 'GET',
      url: '/api/v1/agencies/agency-1/public',
      originalUrl: '/api/v1/agencies/agency-1/public',
    })
    const body = { id: 'agency-1', companyName: 'Atlas Tours' }
    const next = { handle: jest.fn(() => of(body)) }

    await lastValueFrom(interceptor.intercept(context, next as CallHandler))
    await Promise.resolve()

    expect(headers['X-Cache']).toBe('MISS')
    expect(redis.set).toHaveBeenCalledWith(
      'http-cache:/api/v1/agencies/agency-1/public|lang=default|auth=anon',
      JSON.stringify(body),
      'EX',
      60
    )
  })

  it('does not cache non-public agency routes', async () => {
    const redis = createRedis()
    const interceptor = createInterceptor(redis)
    const { context, headers } = createContext({
      method: 'GET',
      url: '/api/v1/agencies/agency-1/bookings',
      originalUrl: '/api/v1/agencies/agency-1/bookings',
    })
    const next = { handle: jest.fn(() => of({ data: [] })) }

    await lastValueFrom(interceptor.intercept(context, next as CallHandler))

    expect(headers['X-Cache']).toBeUndefined()
    expect(redis.get).not.toHaveBeenCalled()
    expect(next.handle).toHaveBeenCalledTimes(1)
  })

  it('invalidates cached agency profiles after an agency mutation (#1017)', async () => {
    const redis = createRedis()
    redis.scan.mockResolvedValue([
      '0',
      ['http-cache:/api/v1/agencies/agency-1/public|lang=default|auth=anon'],
    ])
    const interceptor = createInterceptor(redis)
    const { context } = createContext({
      method: 'PATCH',
      url: '/api/v1/agency/profile',
      originalUrl: '/api/v1/agency/profile',
    })
    const next = { handle: jest.fn(() => of({ id: 'agency-1' })) }

    await lastValueFrom(interceptor.intercept(context, next as CallHandler))
    await new Promise((resolve) => setImmediate(resolve))

    expect(redis.scan).toHaveBeenCalledWith(
      '0',
      'MATCH',
      'http-cache:/api/v1/agencies*',
      'COUNT',
      100
    )
    expect(redis.unlink).toHaveBeenCalledWith(
      'http-cache:/api/v1/agencies/agency-1/public|lang=default|auth=anon'
    )
  })
})
