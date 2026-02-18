import { prisma } from '../db/prisma';
import { logger } from '../utils/logger';
import { stateMachine } from './stateMachine';
import { smsService } from './smsService';

export class ExpiryService {
    /**
     * Check for expired rides and transition them to EXPIRED state
     */
    async checkExpiredRides(): Promise<void> {
        try {
            // Find rides in BROADCASTING state that have passed their expiry time
            const expiredRides = await prisma.ride.findMany({
                where: {
                    state: 'BROADCASTING',
                    broadcastExpiresAt: {
                        lt: new Date() // Less than current time
                    }
                },
                include: {
                    passenger: true
                }
            });

            if (expiredRides.length === 0) {
                return; // No expired rides
            }

            logger.info('Found expired ride(s)', {
                count: expiredRides.length,
                rideIds: expiredRides.map(r => r.id)
            });

            // Process each expired ride
            for (const ride of expiredRides) {
                try {
                    // Transition to EXPIRED state
                    await stateMachine.transition(ride.id, 'EXPIRED');

                    // Update completedAt timestamp
                    await prisma.ride.update({
                        where: { id: ride.id },
                        data: { completedAt: new Date() }
                    });

                    // Send SMS notification to passenger (non-fatal)
                    try {
                        await smsService.send(
                            ride.passenger.phone,
                            `Ride ${ride.id} expired. No drivers available. Please try again later.`
                        );
                    } catch (smsError: any) {
                        logger.warn('Could not send expiry SMS (non-fatal)', {
                            to: ride.passenger.phone,
                            error: smsError.message
                        });
                    }

                    logger.info('Ride expired', {
                        rideId: ride.id,
                        passengerId: ride.passengerId,
                        expiryTime: ride.broadcastExpiresAt
                    });
                } catch (error: any) {
                    logger.error('Failed to expire ride', {
                        rideId: ride.id,
                        error: error.message
                    });
                    // Continue processing other rides
                }
            }
        } catch (error: any) {
            logger.error('Expiry check failed', {
                error: error.message,
                stack: error.stack
            });
        }
    }

    /**
     * Get count of rides currently in BROADCASTING state
     */
    async getBroadcastingRidesCount(): Promise<number> {
        return await prisma.ride.count({
            where: { state: 'BROADCASTING' }
        });
    }

    /**
     * Get rides that will expire soon (within next 10 seconds)
     */
    async getExpiringRidesSoon(): Promise<number> {
        const tenSecondsFromNow = new Date(Date.now() + 10000);

        return await prisma.ride.count({
            where: {
                state: 'BROADCASTING',
                broadcastExpiresAt: {
                    lte: tenSecondsFromNow,
                    gt: new Date()
                }
            }
        });
    }
}

export const expiryService = new ExpiryService();
