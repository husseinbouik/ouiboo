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
  request: Pick<Request, 'method' | 'url'> & Partial<Pick<Request, 'originalUrl'>>
) => {
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
      'http-cache:/api/v1/trips?page=2&status=ACTIVE'
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
      'http-cache:/api/v1/trips?page=1',
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
})
