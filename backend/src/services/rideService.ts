import { prisma } from '../db/prisma';
import { logger } from '../utils/logger';
import { stateMachine } from './stateMachine';
import { smsService } from './smsService';

export class RideService {
    /**
     * Create a new ride from SMS request
     */
    async createRideFromSMS(
        phone: string,
        rideId: string,
        lat: number,
        lng: number,
        destination: string,
        twilioMessageSid?: string
    ): Promise<void> {
        try {
            // Find or create passenger user
            let user = await prisma.user.findUnique({
                where: { phone }
            });

            if (!user) {
                user = await prisma.user.create({
                    data: {
                        phone,
                        role: 'PASSENGER'
                    }
                });
                logger.info('Created new passenger user', { phone, userId: user.id });
            }

            // Create ride with REQUESTED state
            const ride = await prisma.ride.create({
                data: {
                    id: rideId,
                    passengerId: user.id,
                    pickupLat: lat,
                    pickupLng: lng,
                    destinationText: destination,
                    state: 'REQUESTED',
                    twilioMessageSid,
                    broadcastExpiresAt: new Date(Date.now() + 60000) // 60 seconds from now
                }
            });

            logger.info('Ride created', {
                rideId: ride.id,
                passengerId: user.id,
                pickup: { lat, lng },
                destination
            });

            // Transition to BROADCASTING
            await stateMachine.transition(rideId, 'BROADCASTING');

            // Send confirmation SMS
            await smsService.send(
                phone,
                `Ride ${rideId} requested. Searching for nearby drivers...`
            );

            // Emit event for broadcast service
            const { eventBus } = await import('./eventBus');
            eventBus.emitRideRequested({
                rideId: ride.id,
                passengerId: user.id,
                pickupLat: lat,
                pickupLng: lng,
                destination
            });

            logger.info('Ride ready for broadcast', { rideId });

        } catch (error: any) {
            logger.error('Failed to create ride', {
                error: error.message,
                rideId,
                phone
            });
            throw error;
        }
    }

    /**
     * Handle update request from passenger
     */
    async handleUpdateRequest(
        phone: string,
        rideId: string,
        newLat: number,
        newLng: number
    ): Promise<void> {
        // Find ride
        const ride = await prisma.ride.findUnique({
            where: { id: rideId },
            include: {
                passenger: true,
                driver: true
            }
        });

        if (!ride) {
            await smsService.send(phone, `Ride ${rideId} not found.`);
            return;
        }

        // Verify ownership
        if (ride.passenger.phone !== phone) {
            await smsService.send(phone, 'You are not authorized for this ride.');
            return;
        }

        // Check ride state
        if (ride.state !== 'ACCEPTED' && ride.state !== 'EN_ROUTE') {
            await smsService.send(
                phone,
                `Cannot update location. Ride status: ${ride.state}`
            );
            return;
        }

        // Check rate limiting with smart suppression
        const { rateLimitService } = await import('./rateLimitService');
        const rateLimitResult = await rateLimitService.checkPassengerUpdate(
            ride.passengerId,
            newLat,
            newLng
        );

        if (!rateLimitResult.allowed) {
            await smsService.send(phone, rateLimitResult.message || 'Update not allowed');
            logger.info('Update blocked', {
                rideId,
                phone,
                reason: rateLimitResult.reason
            });
            return;
        }

        // Update passenger location in ride
        await prisma.ride.update({
            where: { id: rideId },
            data: {
                pickupLat: newLat,
                pickupLng: newLng
            }
        });

        // Get driver location if available
        if (ride.driver && ride.driver.currentLat && ride.driver.currentLng) {
            const { calculateDistance } = await import('../utils/geoUtils');
            const distance = calculateDistance(
                newLat,
                newLng,
                ride.driver.currentLat,
                ride.driver.currentLng
            );

            const distanceKm = (distance / 1000).toFixed(1);
            const eta = Math.ceil(distance / 500); // Rough estimate: 500m/min

            await smsService.send(
                phone,
                `Driver is ${distanceKm}km away. ETA: ${eta} min(s). Updates remaining: ${rateLimitResult.remainingUpdates || 0}`
            );
        } else {
            await smsService.send(
                phone,
                `Location updated. Driver location unavailable. Updates remaining: ${rateLimitResult.remainingUpdates || 0}`
            );
        }

        logger.info('Update request processed', {
            rideId,
            phone,
            newLocation: { lat: newLat, lng: newLng },
            remainingUpdates: rateLimitResult.remainingUpdates
        });
    }

    /**
     * Handle cancel request from passenger
     */
    async handleCancelRequest(phone: string, rideId: string): Promise<void> {
        const ride = await prisma.ride.findUnique({
            where: { id: rideId },
            include: {
                passenger: true,
                driver: true
            }
        });

        if (!ride) {
            await smsService.send(phone, `Ride ${rideId} not found.`);
            return;
        }

        // Verify ownership
        if (ride.passenger.phone !== phone) {
            await smsService.send(phone, 'You are not authorized to cancel this ride.');
            return;
        }

        // Check if already completed or cancelled
        if (ride.state === 'COMPLETED' || ride.state === 'CANCELLED') {
            await smsService.send(phone, `Ride is already ${ride.state.toLowerCase()}.`);
            return;
        }

        // Transition to CANCELLED
        await stateMachine.transition(rideId, 'CANCELLED');

        // Notify driver if assigned
        if (ride.driver && ride.driverId) {
            // TODO: Notify driver via push notification
            logger.info('Driver should be notified of cancellation', {
                rideId,
                driverId: ride.driverId
            });
        }

        await smsService.send(phone, `Ride ${rideId} has been cancelled.`);

        logger.info('Ride cancelled', { rideId, phone });
    }
}

export const rideService = new RideService();
