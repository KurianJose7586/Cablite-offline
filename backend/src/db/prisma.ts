import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger';

const prisma = new PrismaClient({
    log: [
        { level: 'query', emit: 'event' },
        { level: 'error', emit: 'event' },
        { level: 'warn', emit: 'event' },
    ],
});

// Log queries in development
if (process.env.NODE_ENV === 'development') {
    prisma.$on('query' as never, (e: any) => {
        logger.debug('Prisma Query', {
            query: e.query,
            duration: `${e.duration}ms`
        });
    });
}

prisma.$on('error' as never, (e: any) => {
    logger.error('Prisma Error', { error: e });
});

// Test connection
prisma.$connect()
    .then(() => logger.info('✅ Database connected'))
    .catch((err) => logger.error('❌ Database connection failed', { error: err }));

export { prisma };
