require('dotenv').config({ path: './packages/database/.env' });
const { PrismaClient } = require('./packages/database/generated-client');
const client = new PrismaClient();
async function main() {
    try {
        console.log('Updating bookings with PENDING_PAYMENT to PENDING...');
        const count = await client.$executeRaw`
            UPDATE "Booking" SET status = 'PENDING' WHERE status = 'PENDING_PAYMENT';
        `;
        console.log(`Updated ${count} bookings.`);
    } catch (e) {
        console.error(e);
    } finally {
        await client.$disconnect();
    }
}
main();
