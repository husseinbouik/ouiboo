require('dotenv').config({ path: './packages/database/.env' });
const { PrismaClient } = require('./packages/database/generated-client');
const client = new PrismaClient();
async function main() {
    const trips = await client.tripTemplate.findMany({ select: { id: true, title: true, images: true, status: true } });
    console.log('Trips:', JSON.stringify(trips, null, 2));
    await client.$disconnect();
}
main();
