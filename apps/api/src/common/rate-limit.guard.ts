import { CanActivate, ExecutionContext, Injectable, HttpException, HttpStatus, SetMetadata } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RedisService } from './redis.service';

type RateLimitOptions = {
  points: number;
  windowMs: number;
  keyPrefix?: string;
};

const RATE_LIMIT_KEY = 'ouiboo:rate-limit';
const buckets = new Map<string, { count: number; resetAt: number }>();

export const RateLimit = (options: RateLimitOptions) => SetMetadata(RATE_LIMIT_KEY, options);

@Injectable()
export class RateLimitGuard implements CanActivate {
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

    if (redis) {
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

    const now = Date.now();
    const bucket = buckets.get(key);

    if (!bucket || bucket.resetAt <= now) {
      buckets.set(key, { count: 1, resetAt: now + options.windowMs });
      return true;
    }

    if (bucket.count >= options.points) {
      throw new HttpException('Rate limit exceeded. Please try again later.', HttpStatus.TOO_MANY_REQUESTS);
    }

    bucket.count += 1;
    return true;
  }
}
