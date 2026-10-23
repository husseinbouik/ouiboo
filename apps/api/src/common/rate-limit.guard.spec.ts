import {
  ExecutionContext,
  HttpException,
  HttpStatus,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RateLimit, RateLimitGuard, RateLimitSensitive } from './rate-limit.guard';
import type { RedisService } from './redis.service';

/**
 * Outage-policy tests for RateLimitGuard (#392). Dummy controllers carry the
 * real decorator metadata so the guard runs against a real Reflector, exactly
 * as in production wiring.
 */
class DummyController {
  @RateLimit({ points: 2, windowMs: 60_000, keyPrefix: 'test:open' })
  openRoute() {}

  @RateLimit({ points: 2, windowMs: 60_000, keyPrefix: 'test:sensitive' })
  @RateLimitSensitive()
  sensitiveRoute() {}

  unratedRoute() {}
}

@RateLimitSensitive()
class SensitiveClassController {
  @RateLimit({ points: 2, windowMs: 60_000, keyPrefix: 'test:class-sensitive' })
  route() {}
}

function mockContext(handler: unknown, cls: unknown) {
  const setHeader = jest.fn();
  const req = {
    ip: '203.0.113.10',
    headers: {},
    socket: { remoteAddress: '203.0.113.10' },
    method: 'POST',
    url: '/test',
    route: { path: '/test' },
    user: undefined,
  };
  const ctx = {
    getHandler: () => handler,
    getClass: () => cls,
    switchToHttp: () => ({
      getRequest: () => req,
      getResponse: () => ({ setHeader }),
    }),
  } as unknown as ExecutionContext;
  return { ctx, setHeader };
}

const noRedisService = { getClient: () => null } as unknown as RedisService;

const throwingRedisService = {
  getClient: () => {
    throw new Error('REDIS_URL is required in production');
  },
} as unknown as RedisService;

function countingRedisService() {
  const counts = new Map<string, number>();
  const client = {
    incr: jest.fn(async (key: string) => {
      const next = (counts.get(key) ?? 0) + 1;
      counts.set(key, next);
      return next;
    }),
    pexpire: jest.fn(async () => 1),
  };
  return {
    service: { getClient: () => client } as unknown as RedisService,
    client,
  };
}

const failingRedisService = {
  getClient: () => ({
    incr: jest.fn(async () => {
      throw new Error('ECONNRESET');
    }),
    pexpire: jest.fn(async () => 1),
  }),
} as unknown as RedisService;

describe('RateLimitGuard (#392 outage policy)', () => {
  let errorSpy: jest.SpyInstance;

  beforeEach(() => {
    errorSpy = jest
      .spyOn(Logger.prototype, 'error')
      .mockImplementation(() => undefined);
  });

  afterEach(() => {
    errorSpy.mockRestore();
  });

  const degradedMessages = () =>
    errorSpy.mock.calls
      .map((call) => String(call[0]))
      .filter((message) => message.includes('RATE_LIMIT_DEGRADED'));

  it('allows routes without @RateLimit options even when Redis is unavailable', async () => {
    const guard = new RateLimitGuard(new Reflector(), noRedisService);
    const { ctx } = mockContext(DummyController.prototype.unratedRoute, DummyController);
    await expect(guard.canActivate(ctx)).resolves.toBe(true);
    expect(degradedMessages()).toHaveLength(0);
  });

  it('fails CLOSED with 503 + Retry-After for a sensitive route when Redis is unavailable', async () => {
    const guard = new RateLimitGuard(new Reflector(), noRedisService);
    const { ctx, setHeader } = mockContext(
      DummyController.prototype.sensitiveRoute,
      DummyController,
    );
    await expect(guard.canActivate(ctx)).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
    await expect(guard.canActivate(ctx)).rejects.toMatchObject({
      status: HttpStatus.SERVICE_UNAVAILABLE,
    });
    expect(setHeader).toHaveBeenCalledWith('Retry-After', '30');
    expect(degradedMessages().length).toBeGreaterThan(0);
  });

  it('honours a class-level @RateLimitSensitive marker', async () => {
    const guard = new RateLimitGuard(new Reflector(), noRedisService);
    const { ctx } = mockContext(
      SensitiveClassController.prototype.route,
      SensitiveClassController,
    );
    await expect(guard.canActivate(ctx)).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
  });

  it('fails open for a non-sensitive route when Redis is unavailable, logging RATE_LIMIT_DEGRADED at error level', async () => {
    const guard = new RateLimitGuard(new Reflector(), noRedisService);
    const { ctx, setHeader } = mockContext(DummyController.prototype.openRoute, DummyController);
    await expect(guard.canActivate(ctx)).resolves.toBe(true);
    expect(setHeader).not.toHaveBeenCalled();
    expect(degradedMessages().length).toBeGreaterThan(0);
  });

  it('treats a getClient() throw (missing REDIS_URL in production) as unavailable', async () => {
    const guard = new RateLimitGuard(new Reflector(), throwingRedisService);
    const sensitive = mockContext(DummyController.prototype.sensitiveRoute, DummyController);
    await expect(guard.canActivate(sensitive.ctx)).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
    const open = mockContext(DummyController.prototype.openRoute, DummyController);
    await expect(guard.canActivate(open.ctx)).resolves.toBe(true);
  });

  it('applies the same outage policy when Redis commands fail', async () => {
    const guard = new RateLimitGuard(new Reflector(), failingRedisService);
    const sensitive = mockContext(DummyController.prototype.sensitiveRoute, DummyController);
    await expect(guard.canActivate(sensitive.ctx)).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
    const open = mockContext(DummyController.prototype.openRoute, DummyController);
    await expect(guard.canActivate(open.ctx)).resolves.toBe(true);
    expect(degradedMessages().length).toBeGreaterThan(0);
  });

  it('keeps normal counting behaviour when Redis is available', async () => {
    const { service, client } = countingRedisService();
    const guard = new RateLimitGuard(new Reflector(), service);
    const { ctx } = mockContext(DummyController.prototype.openRoute, DummyController);

    await expect(guard.canActivate(ctx)).resolves.toBe(true);
    await expect(guard.canActivate(ctx)).resolves.toBe(true);
    // Window expiry is set exactly once, on the first hit of the window.
    expect(client.pexpire).toHaveBeenCalledTimes(1);
    expect(client.pexpire).toHaveBeenCalledWith(expect.any(String), 60_000);

    const third = guard.canActivate(ctx);
    await expect(third).rejects.toBeInstanceOf(HttpException);
    await expect(third).rejects.toMatchObject({ status: HttpStatus.TOO_MANY_REQUESTS });
    expect(degradedMessages()).toHaveLength(0);
  });

  it('counts sensitive routes normally when Redis is available', async () => {
    const { service } = countingRedisService();
    const guard = new RateLimitGuard(new Reflector(), service);
    const { ctx, setHeader } = mockContext(
      DummyController.prototype.sensitiveRoute,
      DummyController,
    );
    await expect(guard.canActivate(ctx)).resolves.toBe(true);
    expect(setHeader).not.toHaveBeenCalled();
    expect(degradedMessages()).toHaveLength(0);
  });
});
