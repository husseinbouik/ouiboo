require('dotenv').config({ path: './packages/database/.env' });
const { PrismaClient } = require('./packages/database/generated-client');
const client = new PrismaClient();
async function main() {
    const userCount = await client.user.count();
    const agencyCount = await client.agencyProfile.count();
    console.log(`Users: ${userCount}, Agencies: ${agencyCount}`);
    
    const users = await client.user.findMany({ take: 5, select: { id: true, email: true } });
    console.log('Users:', JSON.stringify(users, null, 2));
    
    const agencies = await client.agencyProfile.findMany({ take: 5, select: { id: true, userId: true, companyName: true } });
    console.log('Agencies:', JSON.stringify(agencies, null, 2));
    
    await client.$disconnect();
}
main();
