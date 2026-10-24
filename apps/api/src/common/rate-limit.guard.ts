import {
  CanActivate,
  ExecutionContext,
  Injectable,
  HttpException,
  HttpStatus,
  ServiceUnavailableException,
  SetMetadata,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RedisService } from './redis.service';

type RateLimitOptions = {
  points: number;
  windowMs: number;
  keyPrefix?: string;
};

const RATE_LIMIT_KEY = 'ouiboo:rate-limit';
const RATE_LIMIT_SENSITIVE_KEY = 'ouiboo:rate-limit-sensitive';

// Seconds a client should wait before retrying a fail-closed (503) response.
const REDIS_OUTAGE_RETRY_AFTER_SECONDS = 30;

export const RateLimit = (options: RateLimitOptions) => SetMetadata(RATE_LIMIT_KEY, options);

/**
 * Marks a route (or a whole controller) as security-sensitive for rate
 * limiting (#392). When the distributed rate-limit store (Redis) is
 * unavailable, sensitive routes fail CLOSED — 503 with a Retry-After header —
 * instead of silently losing throttling. Non-sensitive routes still fail
 * open, but log at error level with the RATE_LIMIT_DEGRADED marker so the
 * degraded mode is observable in production logs and alerts.
 */
export const RateLimitSensitive = () => SetMetadata(RATE_LIMIT_SENSITIVE_KEY, true);

@Injectable()
export class RateLimitGuard implements CanActivate {
  private readonly logger = new Logger(RateLimitGuard.name);

  constructor(
    private reflector: Reflector,
    private redisService: RedisService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const options = this.reflector.getAllAndOverride<RateLimitOptions>(RATE_LIMIT_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!options) {
      return true;
    }

    const sensitive =
      this.reflector.getAllAndOverride<boolean>(RATE_LIMIT_SENSITIVE_KEY, [
        context.getHandler(),
        context.getClass(),
      ]) === true;

    const req = context.switchToHttp().getRequest();
    const ip =
      req.ip ||
      req.headers?.['x-forwarded-for']?.split(',')?.[0]?.trim() ||
      req.socket?.remoteAddress ||
      'unknown';
    const userId = req.user?.userId || req.user?.sub || 'anonymous';
    const key = `${options.keyPrefix || req.method}:${req.route?.path || req.url}:${userId}:${ip}`;

    // RedisService.getClient() throws when REDIS_URL is missing in
    // production; treat a construction failure exactly like an unavailable
    // client so the outage policy below still applies.
    let redis: ReturnType<RedisService['getClient']> = null;
    try {
      redis = this.redisService.getClient();
    } catch {
      redis = null;
    }

    if (!redis) {
      return this.handleRedisUnavailable(context, key, sensitive, 'client unavailable');
    }

    const redisKey = `rate-limit:${key}`;
    let count: number;
    try {
      count = await redis.incr(redisKey);
      if (count === 1) {
        await redis.pexpire(redisKey, options.windowMs);
      }
    } catch {
      return this.handleRedisUnavailable(context, key, sensitive, 'command failed');
    }

    if (count > options.points) {
      throw new HttpException('Rate limit exceeded. Please try again later.', HttpStatus.TOO_MANY_REQUESTS);
    }

    return true;
  }

  /**
   * Outage policy by endpoint class (#392). Sensitive routes fail closed so
   * auth, upload, and payment entry points never silently lose distributed
   * throttling; other routes fail open (a process-local counter would give
   * inconsistent limits across instances) but the degradation is logged at
   * error level with a greppable RATE_LIMIT_DEGRADED marker.
   */
  private handleRedisUnavailable(
    context: ExecutionContext,
    key: string,
    sensitive: boolean,
    reason: string,
  ): boolean {
    if (sensitive) {
      this.logger.error(
        `RATE_LIMIT_DEGRADED: Redis unavailable (${reason}); failing CLOSED for sensitive route ${key}`,
      );
      const res = context.switchToHttp().getResponse();
      if (res && typeof res.setHeader === 'function') {
        res.setHeader('Retry-After', String(REDIS_OUTAGE_RETRY_AFTER_SECONDS));
      }
      throw new ServiceUnavailableException(
        'Rate limiting is temporarily unavailable. Please try again shortly.',
      );
    }

    this.logger.error(
      `RATE_LIMIT_DEGRADED: Redis unavailable (${reason}); failing open for ${key}`,
    );
    return true;
  }
}
