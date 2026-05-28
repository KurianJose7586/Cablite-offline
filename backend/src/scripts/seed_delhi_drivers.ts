import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const DELHI_LAT = 28.6139;
const DELHI_LNG = 77.2090;

async function main() {
    console.log('Seeding Delhi drivers...');

    for (let i = 1; i <= 3; i++) {
        const phone = `+91999999990${i}`;
        const name = `Delhi Driver ${i}`;

        const user = await prisma.user.upsert({
            where: { phone },
            update: { role: 'DRIVER', name },
            create: { phone, role: 'DRIVER', name }
        });

        const lat = DELHI_LAT + (Math.random() - 0.5) * 0.02;
        const lng = DELHI_LNG + (Math.random() - 0.5) * 0.02;

        await prisma.driver.upsert({
            where: { userId: user.id },
            update: {
                status: 'ONLINE',
                currentLat: lat,
                currentLng: lng,
                lastLocationUpdate: new Date(),
                activeRideId: null
            },
            create: {
                userId: user.id,
                status: 'ONLINE',
                currentLat: lat,
                currentLng: lng,
                lastLocationUpdate: new Date()
            }
        });

        console.log(`Driver ${i} seeded at ${lat.toFixed(4)}, ${lng.toFixed(4)}`);
    }

    console.log('Seed completed successfully.');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
