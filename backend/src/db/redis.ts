import { Redis } from 'ioredis';
import { logger } from '../utils/logger';

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

const redis = new Redis(REDIS_URL, {
    retryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000);
        logger.warn(`Redis connection retry attempt ${times}, waiting ${delay}ms`);
        return delay;
    },
    maxRetriesPerRequest: 3,
    reconnectOnError: (err) => {
        const targetError = 'READONLY';
        if (err.message.includes(targetError)) {
            return true; // Reconnect on READONLY errors
        }
        return false;
    },
});

redis.on('connect', () => {
    logger.info('✅ Redis connected', { url: REDIS_URL });
});

redis.on('ready', () => {
    logger.info('✅ Redis ready for commands');
});

redis.on('error', (err) => {
    logger.error('❌ Redis connection error', { error: err.message });
});

redis.on('close', () => {
    logger.warn('⚠️  Redis connection closed');
});

redis.on('reconnecting', () => {
    logger.info('🔄 Redis reconnecting...');
});

// Health check function
export async function checkRedisHealth(): Promise<boolean> {
    try {
        const result = await redis.ping();
        return result === 'PONG';
    } catch (error) {
        logger.error('Redis health check failed', { error });
        return false;
    }
}

// Graceful shutdown
export async function disconnectRedis(): Promise<void> {
    try {
        await redis.quit();
        logger.info('Redis connection closed gracefully');
    } catch (error: any) {
        logger.error('Error closing Redis connection', { error: error.message });
    }
}

export { redis };

