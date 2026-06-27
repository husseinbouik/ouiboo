process.env.NODE_ENV = process.env.NODE_ENV || 'test';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret';
process.env.JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'test-refresh-secret';
process.env.CORS_ORIGINS = process.env.CORS_ORIGINS || 'http://localhost:3000';
process.env.TRAVELER_APP_URL = process.env.TRAVELER_APP_URL || 'http://localhost:3002';
process.env.API_URL = process.env.API_URL || 'http://localhost:3000/api/v1';
process.env.STORAGE_PROVIDER = process.env.STORAGE_PROVIDER || 'local';
