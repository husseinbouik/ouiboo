import { PrismaClient } from './packages/database/generated-client';

async function main() {
    const prisma = new PrismaClient();
    try {
        const trip = await prisma.tripTemplate.findFirst({
            include: { sessions: true }
        });
        console.log('TRIP_DATA:', JSON.stringify(trip, null, 2));
    } catch (error) {
        console.error(error);
    } finally {
        await prisma.$disconnect();
    }
}

main();
