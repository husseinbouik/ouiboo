import 'dotenv/config'
import { ValidationPipe, type INestApplication, RequestMethod } from '@nestjs/common'
import { NestFactory } from '@nestjs/core'
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger'
import helmet from 'helmet'
import compression from 'compression'
import { AppModule } from './app.module'
import { GlobalExceptionFilter } from './common/global-exception.filter'
import { RedisResponseCacheInterceptor } from './common/redis-response-cache.interceptor'
import { ResponseInterceptor } from './common/response.interceptor'
import { RequestLoggingInterceptor } from './monitoring/request-logging.interceptor'
import { getTrustedOrigins } from './common/trusted-origins.util'
import { env, parseEnv } from './config/env'
import type { NextFunction, Request, Response } from 'express'

// #1030 (B4 + A12): environment validation lives in the zod env schema
// (src/config/env.ts), parsed once at boot and exported typed. The
// schema's production rules mirror this function's old semantics —
// the same 10 required variables and the same JWT length / placeholder
// / distinctness rules — and importing the module already parses once;
// this wrapper re-parses so the boot check stays explicit.
export const validateRequiredEnv = () => {
  parseEnv()
}

const getCorsOrigins = () => getTrustedOrigins()

/**
 * Creates and configures the NestJS application instance without starting
 * the HTTP listener. Shared by the long-running server (main.ts) and the
 * Vercel serverless handler (api/index.ts).
 */
export async function createApp(): Promise<INestApplication> {
  validateRequiredEnv()
  const app = await NestFactory.create(AppModule, { rawBody: true })
  const corsOrigins = getCorsOrigins()
  const trustProxyHops = Number(env.TRUST_PROXY_HOPS)
  if (Number.isInteger(trustProxyHops) && trustProxyHops > 0) {
    app.getHttpAdapter().getInstance().set('trust proxy', trustProxyHops)
  }

  app.use(
    helmet({
      contentSecurityPolicy:
        env.NODE_ENV === 'production'
          ? {
              useDefaults: false,
              directives: {
                defaultSrc: ["'none'"],
                frameAncestors: ["'none'"],
                baseUri: ["'none'"],
                formAction: ["'none'"],
              },
            }
          : false,
      crossOriginEmbedderPolicy: false,
      crossOriginOpenerPolicy: { policy: 'same-origin' },
      crossOriginResourcePolicy: { policy: 'cross-origin' },
      frameguard: { action: 'deny' },
      referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
      hsts:
        env.NODE_ENV === 'production'
          ? { maxAge: 31536000, includeSubDomains: true }
          : false,
    }),
  )

  // Enable gzip compression for API responses
  app.use(compression())

  app.use((_req: Request, res: Response, next: NextFunction) => {
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()')
    next()
  })

  app.enableCors({
    origin:
      env.NODE_ENV === 'production' && corsOrigins.length === 0
        ? false
        : corsOrigins,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
    allowedHeaders: 'Content-Type, Accept, Authorization',
    exposedHeaders: 'X-Cache',
  })

  app.setGlobalPrefix('api/v1')
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    })
  )
  app.useGlobalFilters(new GlobalExceptionFilter())
  app.useGlobalInterceptors(
    new RequestLoggingInterceptor(),
    app.get(ResponseInterceptor),
    app.get(RedisResponseCacheInterceptor)
  )

  const config = new DocumentBuilder()
    .setTitle('Ouiboo API')
    .setDescription('The Ouiboo B2B & B2C Travel Marketplace API')
    .setVersion('1.0')
    .addBearerAuth()
    .build()

  if (
    env.NODE_ENV !== 'production' ||
    env.ENABLE_SWAGGER === 'true'
  ) {
    const document = SwaggerModule.createDocument(app, config)
    SwaggerModule.setup('docs', app, document)
  }

  return app
}

