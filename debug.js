const { PrismaClient } = require('./packages/database/generated-client');
const prisma = new PrismaClient();

async function run() {
  const trip = await prisma.tripTemplate.findFirst();
  console.log('TRIP:', JSON.stringify(trip));
}

run().finally(() => prisma.$disconnect());
