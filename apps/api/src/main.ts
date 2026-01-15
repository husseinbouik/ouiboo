import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
    try {
        const app = await NestFactory.create(AppModule);

        const corsOrigins = process.env.CORS_ORIGINS
            ? process.env.CORS_ORIGINS.split(',').map((origin) => origin.trim()).filter(Boolean)
            : undefined;
        const allowAllOrigins = process.env.NODE_ENV !== 'production' && !corsOrigins;

        // Enable CORS
        app.enableCors({
            origin: corsOrigins ?? allowAllOrigins,
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
