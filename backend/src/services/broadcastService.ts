import { driverMatchingService, NearbyDriver } from './driverMatchingService';
import { eventBus } from './eventBus';
import { logger } from '../utils/logger';

export interface BroadcastResult {
    success: boolean;
    driversNotified: number;
    drivers: NearbyDriver[];
}

export class BroadcastService {
    /**
     * Broadcast ride request to nearby drivers
     */
    async broadcastRideRequest(
        rideId: string,
        pickupLat: number,
        pickupLng: number,
        _destination: string
    ): Promise<BroadcastResult> {
        try {
            // Find nearby available drivers
            const drivers = await driverMatchingService.findNearbyDrivers(
                pickupLat,
                pickupLng,
                3, // 3km radius
                10 // Max 10 drivers
            );

            if (drivers.length === 0) {
                logger.warn('No drivers available for broadcast', {
                    rideId,
                    pickup: { lat: pickupLat, lng: pickupLng }
                });
                return {
                    success: false,
                    driversNotified: 0,
                    drivers: []
                };
            }

            // TODO: Send push notifications to drivers
            // For now, just log the broadcast
            logger.info('Broadcasting ride to drivers', {
                rideId,
                driverCount: drivers.length,
                drivers: drivers.map(d => ({
                    id: d.id,
                    distance: `${d.distanceKm.toFixed(2)}km`
                }))
            });

            // In production, this would:
            // 1. Send FCM/WebSocket notifications to each driver
            // 2. Include ride details (pickup, destination, distance, fare estimate)
            // 3. Set a timeout for driver response (e.g., 30 seconds)

            return {
                success: true,
                driversNotified: drivers.length,
                drivers
            };
        } catch (error: any) {
            logger.error('Broadcast failed', {
                error: error.message,
                rideId
            });
            return {
                success: false,
                driversNotified: 0,
                drivers: []
            };
        }
    }
}

export const broadcastService = new BroadcastService();

// Listen for ride requested events and trigger broadcast
eventBus.onRideRequested(async (event) => {
    logger.info('Handling RIDE_REQUESTED event for broadcast', {
        rideId: event.rideId
    });

    const result = await broadcastService.broadcastRideRequest(
        event.rideId,
        event.pickupLat,
        event.pickupLng,
        event.destination
    );

    if (!result.success) {
        logger.warn('No drivers available, ride may expire', {
            rideId: event.rideId
        });
        // TODO: Notify passenger that no drivers are available
    }
});
