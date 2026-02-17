import { redis } from '../db/redis';
import { logger } from '../utils/logger';
import { calculateDistance } from '../utils/geoUtils';

// Configuration from environment
const RATE_LIMIT_MAX_UPDATES = parseInt(process.env.RATE_LIMIT_MAX_UPDATES || '5');
const RATE_LIMIT_COOLDOWN_SECONDS = parseInt(process.env.RATE_LIMIT_COOLDOWN_SECONDS || '120');
const SUPPRESSION_THRESHOLD_METERS = parseInt(process.env.SUPPRESSION_THRESHOLD_METERS || '50');

export interface RateLimitResult {
    allowed: boolean;
    reason?: 'suppressed' | 'rate_limited';
    message?: string;
    remainingUpdates?: number;
    cooldownSeconds?: number;
}

export class RateLimitService {
    /**
     * Check if passenger update is allowed
     * Implements smart suppression and rate limiting
     */
    async checkPassengerUpdate(
        passengerId: string,
        newLat: number,
        newLng: number
    ): Promise<RateLimitResult> {
        try {
            // 1. Check smart suppression (< 50m from last location)
            const lastLocation = await this.getLastLocation(passengerId);

            if (lastLocation) {
                const distance = calculateDistance(
                    lastLocation.lat,
                    lastLocation.lng,
                    newLat,
                    newLng
                );

                if (distance < SUPPRESSION_THRESHOLD_METERS) {
                    logger.debug('Update suppressed - location unchanged', {
                        passengerId,
                        distance,
                        threshold: SUPPRESSION_THRESHOLD_METERS
                    });

                    return {
                        allowed: false,
                        reason: 'suppressed',
                        message: `Location unchanged (${distance}m). Update ignored.`
                    };
                }
            }

            // 2. Check rate limit (max 5 updates per 2 minutes)
            const updateCount = await this.getUpdateCount(passengerId);

            if (updateCount >= RATE_LIMIT_MAX_UPDATES) {
                const ttl = await this.getCounterTTL(passengerId);
                const cooldownMinutes = Math.ceil(ttl / 60);

                logger.warn('Update rate limited', {
                    passengerId,
                    updateCount,
                    cooldownSeconds: ttl
                });

                return {
                    allowed: false,
                    reason: 'rate_limited',
                    message: `Too many updates. Try again in ${cooldownMinutes} minute(s).`,
                    cooldownSeconds: ttl
                };
            }

            // 3. Allow update and increment counter
            await this.incrementUpdateCount(passengerId);
            await this.saveLastLocation(passengerId, newLat, newLng);

            const remaining = RATE_LIMIT_MAX_UPDATES - updateCount - 1;

            logger.debug('Update allowed', {
                passengerId,
                updateCount: updateCount + 1,
                remainingUpdates: remaining
            });

            return {
                allowed: true,
                remainingUpdates: remaining
            };
        } catch (error: any) {
            // If Redis fails, allow the update (graceful degradation)
            logger.error('Rate limit check failed, allowing update', {
                error: error.message,
                passengerId
            });

            return {
                allowed: true,
                message: 'Rate limiting unavailable'
            };
        }
    }

    /**
     * Get last known location for passenger
     */
    private async getLastLocation(
        passengerId: string
    ): Promise<{ lat: number; lng: number } | null> {
        const key = `ratelimit:passenger:${passengerId}:location`;
        const data = await redis.hgetall(key);

        if (data && data.lat && data.lng) {
            return {
                lat: parseFloat(data.lat),
                lng: parseFloat(data.lng)
            };
        }

        return null;
    }

    /**
     * Save current location for passenger
     */
    private async saveLastLocation(
        passengerId: string,
        lat: number,
        lng: number
    ): Promise<void> {
        const key = `ratelimit:passenger:${passengerId}:location`;
        await redis.hset(key, {
            lat: lat.toString(),
            lng: lng.toString(),
            timestamp: Date.now().toString()
        });
        await redis.expire(key, RATE_LIMIT_COOLDOWN_SECONDS);
    }

    /**
     * Get current update count for passenger
     */
    private async getUpdateCount(passengerId: string): Promise<number> {
        const key = `ratelimit:passenger:${passengerId}:count`;
        const count = await redis.get(key);
        return count ? parseInt(count) : 0;
    }

    /**
     * Increment update counter for passenger
     */
    private async incrementUpdateCount(passengerId: string): Promise<void> {
        const key = `ratelimit:passenger:${passengerId}:count`;
        const count = await redis.incr(key);

        // Set TTL only on first increment
        if (count === 1) {
            await redis.expire(key, RATE_LIMIT_COOLDOWN_SECONDS);
        }
    }

    /**
     * Get remaining TTL for rate limit counter
     */
    private async getCounterTTL(passengerId: string): Promise<number> {
        const key = `ratelimit:passenger:${passengerId}:count`;
        const ttl = await redis.ttl(key);
        return ttl > 0 ? ttl : 0;
    }

    /**
     * Reset rate limit for a passenger (for testing)
     */
    async resetPassengerRateLimit(passengerId: string): Promise<void> {
        const keys = [
            `ratelimit:passenger:${passengerId}:count`,
            `ratelimit:passenger:${passengerId}:location`
        ];

        await redis.del(...keys);
        logger.info('Rate limit reset', { passengerId });
    }
}

export const rateLimitService = new RateLimitService();
