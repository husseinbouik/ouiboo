import 'dotenv/config'
import { ValidationPipe } from '@nestjs/common'
import { NestFactory } from '@nestjs/core'
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger'
import { AppModule } from './app.module'
import { GlobalExceptionFilter } from './common/global-exception.filter'
import { RedisResponseCacheInterceptor } from './common/redis-response-cache.interceptor'
import { ResponseInterceptor } from './common/response.interceptor'
import { RequestLoggingInterceptor } from './monitoring/request-logging.interceptor'
import type { NextFunction, Request, Response } from 'express'

const REQUIRED_ENV_VARS = [
  'JWT_SECRET',
  'JWT_REFRESH_SECRET',
  'CORS_ORIGINS',
  'DATABASE_URL',
  'SMTP_HOST',
  'SMTP_PORT',
  'SMTP_USER',
  'SMTP_PASS',
  'TRUST_PROXY_HOPS',
]

const validateRequiredEnv = () => {
  if (process.env.NODE_ENV !== 'production') return

  const missing = REQUIRED_ENV_VARS.filter((name) => !process.env[name])
  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(', ')}`
    )
  }

  const jwtSecret = process.env.JWT_SECRET || ''
  const refreshSecret = process.env.JWT_REFRESH_SECRET || ''
  const placeholderPattern = /(?:demo|change|replace|secret|password)/i
  if (jwtSecret.length < 32 || refreshSecret.length < 32
    || placeholderPattern.test(jwtSecret) || placeholderPattern.test(refreshSecret)) {
    throw new Error('JWT secrets must be at least 32 characters and non-placeholder values in production')
  }
  if (jwtSecret === refreshSecret) {
    throw new Error('JWT_SECRET and JWT_REFRESH_SECRET must be different in production')
  }
}

const DEV_CORS_ORIGINS = [
  'http://localhost:3000',
  'http://localhost:3001',
  'http://localhost:3002',
  'http://localhost:3003',
  'http://localhost:3004',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:3001',
  'http://127.0.0.1:3002',
  'http://127.0.0.1:3003',
  'http://127.0.0.1:3004',
]

const getCorsOrigins = () => {
  const configuredOrigins = process.env.CORS_ORIGINS
    ? process.env.CORS_ORIGINS.split(',')
        .map((origin) => origin.trim())
        .filter(Boolean)
    : []

  if (process.env.NODE_ENV === 'production') return configuredOrigins
  return Array.from(new Set([...configuredOrigins, ...DEV_CORS_ORIGINS]))
}

async function bootstrap() {
  try {
    validateRequiredEnv()
    const app = await NestFactory.create(AppModule, { rawBody: true })
    const corsOrigins = getCorsOrigins()
    const trustProxyHops = Number(process.env.TRUST_PROXY_HOPS)
    if (Number.isInteger(trustProxyHops) && trustProxyHops > 0) {
      app.getHttpAdapter().getInstance().set('trust proxy', trustProxyHops)
    }

    app.use((_req: Request, res: Response, next: NextFunction) => {
      res.setHeader('X-Content-Type-Options', 'nosniff')
      res.setHeader('X-Frame-Options', 'DENY')
      res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin')
      res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()')
      if (process.env.NODE_ENV === 'production') {
        res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains')
        res.setHeader(
          'Content-Security-Policy',
          "default-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'",
        )
      }
      next()
    })

    app.enableCors({
      origin:
        process.env.NODE_ENV === 'production' && corsOrigins.length === 0
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
      process.env.NODE_ENV !== 'production' ||
      process.env.ENABLE_SWAGGER === 'true'
    ) {
      const document = SwaggerModule.createDocument(app, config)
      SwaggerModule.setup('api/v1/docs', app, document)
    }

    const port = process.env.PORT || 3000
    await app.listen(port)
    console.log(`Application is running on: http://localhost:${port}/api/v1`)
    if (
      process.env.NODE_ENV !== 'production' ||
      process.env.ENABLE_SWAGGER === 'true'
    ) {
      console.log(
        `Swagger documentation: http://localhost:${port}/api/v1/docs`
      )
    }
  } catch (error) {
    console.error('Error during bootstrap:', error)
    process.exit(1)
  }
}

void bootstrap()
