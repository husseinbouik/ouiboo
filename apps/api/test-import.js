try {
    const { NestFactory } = require('@nestjs/core');
    console.log('Successfully required @nestjs/core');
} catch (e) {
    console.error('Failed to require @nestjs/core:', e.message);
}
