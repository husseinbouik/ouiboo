require('ts-node').register();
const { DatabaseService } = require('./apps/api/src/database/database.service.ts');
const db = new DatabaseService();
console.log('User model:', !!db.user);
console.log('RefreshToken model:', !!db.refreshToken);
process.exit(0);
