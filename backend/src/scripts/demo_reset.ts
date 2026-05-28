import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function reset() {
    console.log('--- RESETTING CABLITE DEMO STATE ---');

    // 1. Delete all rides
    const deletedRides = await prisma.ride.deleteMany({});
    console.log(`Deleted ${deletedRides.count} rides.`);

    // 2. Free up all drivers
    const resetDrivers = await prisma.driver.updateMany({
        data: {
            status: 'ONLINE',
            activeRideId: null
        }
    });
    console.log(`Reset ${resetDrivers.count} drivers to ONLINE and FREE.`);

    console.log('--- SYSTEM READY FOR NEW REQUESTS ---');
}

reset()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
