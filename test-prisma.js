const { PrismaClient } = require('./packages/database/generated-client');
const client = new PrismaClient();
console.log('User model:', !!client.user);
console.log('RefreshToken model:', !!client.refreshToken);
process.exit(0);
