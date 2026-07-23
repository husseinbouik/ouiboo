const DEFAULT_E2E_DATABASE_URL = 'postgresql://postgres:admin@localhost:5432/ouiboo_test?schema=public';

const resolveE2eDatabaseUrl = () => {
    const databaseUrl = process.env.E2E_DATABASE_URL || process.env.DATABASE_URL || DEFAULT_E2E_DATABASE_URL;
    const parsed = new URL(databaseUrl);
    const databaseName = parsed.pathname.replace(/^\//, '');

    if (!databaseName.endsWith('_test')) {
        throw new Error(`Refusing to run E2E against non-test database '${databaseName}'. Set E2E_DATABASE_URL to a database ending in '_test'.`);
    }

    return databaseUrl;
};

process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = resolveE2eDatabaseUrl();
process.env.E2E_DATABASE_URL = process.env.DATABASE_URL;
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret';
process.env.JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'test-refresh-secret';
process.env.CORS_ORIGINS = process.env.CORS_ORIGINS || 'http://localhost:3000';
process.env.TRAVELER_APP_URL = process.env.TRAVELER_APP_URL || 'http://localhost:3002';
process.env.API_URL = process.env.API_URL || 'http://localhost:3000/api/v1';
process.env.STORAGE_PROVIDER = process.env.STORAGE_PROVIDER || 'local';
