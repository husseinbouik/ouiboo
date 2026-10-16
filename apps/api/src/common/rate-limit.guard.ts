import { CanActivate, ExecutionContext, Injectable, HttpException, HttpStatus, SetMetadata, Logger } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RedisService } from './redis.service';

type RateLimitOptions = {
  points: number;
  windowMs: number;
  keyPrefix?: string;
};

const RATE_LIMIT_KEY = 'ouiboo:rate-limit';

export const RateLimit = (options: RateLimitOptions) => SetMetadata(RATE_LIMIT_KEY, options);

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

    const req = context.switchToHttp().getRequest();
    const ip =
      req.ip ||
      req.headers?.['x-forwarded-for']?.split(',')?.[0]?.trim() ||
      req.socket?.remoteAddress ||
      'unknown';
    const userId = req.user?.userId || req.user?.sub || 'anonymous';
    const key = `${options.keyPrefix || req.method}:${req.route?.path || req.url}:${userId}:${ip}`;
    const redis = this.redisService.getClient();

    // Fail-open when Redis is unavailable: a process-local counter would give
    // inconsistent limits across instances, so we allow the request and log.
    // Rate limiting is a defense-in-depth control, not an auth check.
    if (!redis) {
      this.logger.warn(`Rate limiting disabled for ${key}: Redis unavailable (fail-open)`);
      return true;
    }

    const redisKey = `rate-limit:${key}`;
    const count = await redis.incr(redisKey);
    if (count === 1) {
      await redis.pexpire(redisKey, options.windowMs);
    }

    if (count > options.points) {
      throw new HttpException('Rate limit exceeded. Please try again later.', HttpStatus.TOO_MANY_REQUESTS);
    }

    return true;
  }
}
