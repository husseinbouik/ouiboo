import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';

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

async function bootstrap() {
    try {
        validateRequiredEnv();
        console.log('DATABASE_URL:', process.env.DATABASE_URL);
        const app = await NestFactory.create(AppModule);

        // Enable CORS
        app.enableCors({
            origin: true,
            methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
            credentials: true,
            allowedHeaders: 'Content-Type, Accept, Authorization',
        });

        // Prefix all routes with /api
        app.setGlobalPrefix('api');

        // Use validation pipes for DTOs
        app.useGlobalPipes(new ValidationPipe({
            whitelist: true,
            transform: true,
        }));

        // Swagger setup
        const config = new DocumentBuilder()
            .setTitle('Ouiboo API')
            .setDescription('The Ouiboo B2B & B2C Travel Marketplace API')
            .setVersion('1.0')
            .addBearerAuth()
            .build();

        const document = SwaggerModule.createDocument(app, config);
        SwaggerModule.setup('api/docs', app, document);

        const port = process.env.PORT || 3000;
        await app.listen(port);
        console.log(`Application is running on: http://localhost:${port}/api`);
        console.log(`Swagger documentation: http://localhost:${port}/api/docs`);
    } catch (error) {
        console.error('Error during bootstrap:', error);
        process.exit(1);
    }
}
bootstrap();
