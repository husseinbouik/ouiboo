import { Global, Module } from '@nestjs/common'
import { RateLimitGuard } from './rate-limit.guard'
import { RedisResponseCacheInterceptor } from './redis-response-cache.interceptor'
import { RedisService } from './redis.service'
import { ResponseInterceptor } from './response.interceptor'

@Global()
@Module({
  providers: [
    RateLimitGuard,
    RedisService,
    RedisResponseCacheInterceptor,
    ResponseInterceptor,
  ],
  exports: [
    RateLimitGuard,
    RedisService,
    RedisResponseCacheInterceptor,
    ResponseInterceptor,
  ],
})
export class CommonModule {}
