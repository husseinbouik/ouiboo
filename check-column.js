require('dotenv').config({ path: './packages/database/.env' });
const { PrismaClient } = require('./packages/database/generated-client');
const client = new PrismaClient();
async function main() {
    try {
        const users = await client.user.findMany({ take: 1 });
        console.log('User model read test:', JSON.stringify(users, null, 2));
    } catch (e) {
        console.error('Error reading User model:', e.message);
        if (e.code) console.log('Prisma Error Code:', e.code);
    } finally {
        await client.$disconnect();
    }
}
main();
