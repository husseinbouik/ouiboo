import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { RequestLoggingInterceptor } from './monitoring/request-logging.interceptor';

const REQUIRED_ENV_VARS = [
    'JWT_SECRET',
    'JWT_REFRESH_SECRET',
    'CORS_ORIGINS',
    'DATABASE_URL',
    'SMTP_HOST',
    'SMTP_PORT',
    'SMTP_USER',
    'SMTP_PASS',
];

const validateRequiredEnv = () => {
    if (process.env.NODE_ENV !== 'production') {
        return;
    }

    const missing = REQUIRED_ENV_VARS.filter((name) => !process.env[name]);
    if (missing.length > 0) {
        throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
    }
};

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
];

const getCorsOrigins = () => {
    const configuredOrigins = process.env.CORS_ORIGINS
        ? process.env.CORS_ORIGINS.split(',').map((origin) => origin.trim()).filter(Boolean)
        : [];

    if (process.env.NODE_ENV === 'production') {
        return configuredOrigins;
    }

    return Array.from(new Set([...configuredOrigins, ...DEV_CORS_ORIGINS]));
};

async function bootstrap() {
    try {
        validateRequiredEnv();
        const app = await NestFactory.create(AppModule, { rawBody: true });

        const corsOrigins = getCorsOrigins();

        // Enable CORS
        app.enableCors({
            origin: process.env.NODE_ENV === 'production' && corsOrigins.length === 0
                ? false
                : corsOrigins,
            methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
            credentials: true,
            allowedHeaders: 'Content-Type, Accept, Authorization',
        });

        // Prefix all routes with /api/v1 for stable API versioning.
        app.setGlobalPrefix('api/v1');

        // Use validation pipes for DTOs
        app.useGlobalPipes(new ValidationPipe({
            whitelist: true,
            forbidNonWhitelisted: true,
            transform: true,
        }));

        app.useGlobalInterceptors(new RequestLoggingInterceptor());

        // Swagger setup
        const config = new DocumentBuilder()
            .setTitle('Ouiboo API')
            .setDescription('The Ouiboo B2B & B2C Travel Marketplace API')
            .setVersion('1.0')
            .addBearerAuth()
            .build();

        if (process.env.NODE_ENV !== 'production' || process.env.ENABLE_SWAGGER === 'true') {
            const document = SwaggerModule.createDocument(app, config);
            SwaggerModule.setup('api/v1/docs', app, document);
        }

        const port = process.env.PORT || 3000;
        await app.listen(port);
        console.log(`Application is running on: http://localhost:${port}/api/v1`);
        if (process.env.NODE_ENV !== 'production' || process.env.ENABLE_SWAGGER === 'true') {
            console.log(`Swagger documentation: http://localhost:${port}/api/v1/docs`);
        }
    } catch (error) {
        console.error('Error during bootstrap:', error);
        process.exit(1);
    }
}
bootstrap();
