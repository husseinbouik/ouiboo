import { Global, Module } from '@nestjs/common'
import { FeatureFlagsService } from './feature-flags.service'
import { RateLimitGuard } from './rate-limit.guard'
import { RedisResponseCacheInterceptor } from './redis-response-cache.interceptor'
import { RedisService } from './redis.service'
import { ResponseInterceptor } from './response.interceptor'

@Global()
@Module({
  providers: [
    FeatureFlagsService,
    RateLimitGuard,
    RedisService,
    RedisResponseCacheInterceptor,
    ResponseInterceptor,
  ],
  exports: [
    FeatureFlagsService,
    RateLimitGuard,
    RedisService,
    RedisResponseCacheInterceptor,
    ResponseInterceptor,
  ],
})
export class CommonModule {}
