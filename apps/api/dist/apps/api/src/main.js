"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const core_1 = require("@nestjs/core");
const swagger_1 = require("@nestjs/swagger");
const app_module_1 = require("./app.module");
const common_1 = require("@nestjs/common");
const request_logging_interceptor_1 = require("./monitoring/request-logging.interceptor");
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
        const app = await core_1.NestFactory.create(app_module_1.AppModule);
        const corsOrigins = process.env.CORS_ORIGINS
            ? process.env.CORS_ORIGINS.split(',').map((origin) => origin.trim()).filter(Boolean)
            : undefined;
        const allowAllOrigins = process.env.NODE_ENV !== 'production' && !corsOrigins;
        app.enableCors({
            origin: corsOrigins ?? allowAllOrigins,
            methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
            credentials: true,
            allowedHeaders: 'Content-Type, Accept, Authorization',
        });
        app.setGlobalPrefix('api');
        app.useGlobalPipes(new common_1.ValidationPipe({
            whitelist: true,
            transform: true,
        }));
        app.useGlobalInterceptors(new request_logging_interceptor_1.RequestLoggingInterceptor());
        const config = new swagger_1.DocumentBuilder()
            .setTitle('Ouiboo API')
            .setDescription('The Ouiboo B2B & B2C Travel Marketplace API')
            .setVersion('1.0')
            .addBearerAuth()
            .build();
        const document = swagger_1.SwaggerModule.createDocument(app, config);
        swagger_1.SwaggerModule.setup('api/docs', app, document);
        const port = process.env.PORT || 3000;
        await app.listen(port);
        console.log(`Application is running on: http://localhost:${port}/api`);
        console.log(`Swagger documentation: http://localhost:${port}/api/docs`);
    }
    catch (error) {
        console.error('Error during bootstrap:', error);
        process.exit(1);
    }
}
bootstrap();
//# sourceMappingURL=main.js.map