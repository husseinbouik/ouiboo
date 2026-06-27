import { Module } from '@nestjs/common';
import { RateLimitGuard } from './rate-limit.guard';
import { RedisService } from './redis.service';

@Module({
  providers: [RateLimitGuard, RedisService],
  exports: [RateLimitGuard, RedisService],
})
export class CommonModule {}
