import { Request, Response } from 'express';
import { prisma } from '../db/prisma';
import { eventBus } from '../services/eventBus';
import { logger } from '../utils/logger';

export class DriverController {
    /**
     * Accept a ride offer
     * POST /driver/accept
     * Body: { rideId, driverId }
     */
    async acceptRide(req: Request, res: Response): Promise<void> {
        try {
            const { rideId, driverId } = req.body;

            if (!rideId || !driverId) {
                res.status(400).json({ error: 'Missing rideId or driverId' });
                return;
            }

            // Use atomic locking to prevent race conditions
            const result = await prisma.$transaction(async (tx) => {
                // Lock the ride row with FOR UPDATE (exclude geography columns that Prisma can't deserialize)
                const ride = await tx.$queryRaw<any[]>`
          SELECT 
            id, "passengerId", "driverId", "pickupLat", "pickupLng", 
            "destinationText", state, "createdAt", "acceptedAt", 
            "completedAt", "broadcastExpiresAt", "twilioMessageSid"
          FROM "Ride"
          WHERE id = ${rideId}
          FOR UPDATE
        `;

                if (ride.length === 0) {
                    throw new Error('Ride not found');
                }

                const rideData = ride[0];

                // Check if ride is still in BROADCASTING state
                if (rideData.state !== 'BROADCASTING') {
                    throw new Error(`Ride is not available (current state: ${rideData.state})`);
                }

                // Check if driver is available
                const driver = await tx.driver.findUnique({
                    where: { id: driverId }
                });

                if (!driver) {
                    throw new Error('Driver not found');
                }

                if (driver.status !== 'ONLINE') {
                    throw new Error('Driver is not online');
                }

                if (driver.activeRideId) {
                    throw new Error('Driver already has an active ride');
                }

                // Update ride with driver
                const updatedRide = await tx.ride.update({
                    where: { id: rideId },
                    data: {
                        driverId,
                        state: 'ACCEPTED',
                        acceptedAt: new Date()
                    },
                    include: {
                        passenger: true,
                        driver: true
                    }
                });

                // Update driver with active ride
                await tx.driver.update({
                    where: { id: driverId },
                    data: {
                        activeRideId: rideId
                    }
                });

                return updatedRide;
            }, {
                isolationLevel: 'Serializable' // Highest isolation level
            });

            // Emit event
            eventBus.emitRideAccepted({
                rideId: result.id,
                driverId: result.driverId!,
                passengerId: result.passengerId
            });

            logger.info('Ride accepted', {
                rideId,
                driverId,
                passengerId: result.passengerId
            });

            res.json({
                success: true,
                ride: {
                    id: result.id,
                    state: result.state,
                    pickup: {
                        lat: result.pickupLat,
                        lng: result.pickupLng
                    },
                    destination: result.destinationText,
                    passenger: {
                        phone: result.passenger.phone,
                        name: result.passenger.name
                    }
                }
            });
        } catch (error: any) {
            logger.error('Failed to accept ride', {
                error: error.message,
                rideId: req.body.rideId,
                driverId: req.body.driverId
            });

            res.status(400).json({
                success: false,
                error: error.message
            });
        }
    }

    /**
     * Update driver location
     * POST /driver/location
     * Body: { driverId, lat, lng }
     */
    async updateLocation(req: Request, res: Response): Promise<void> {
        try {
            const { driverId, lat, lng } = req.body;

            if (!driverId || lat === undefined || lng === undefined) {
                res.status(400).json({ error: 'Missing driverId, lat, or lng' });
                return;
            }

            // Validate coordinates
            if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
                res.status(400).json({ error: 'Invalid coordinates' });
                return;
            }

            // Update driver location
            await prisma.driver.update({
                where: { id: driverId },
                data: {
                    currentLat: lat,
                    currentLng: lng,
                    lastLocationUpdate: new Date()
                }
            });

            // Emit driver moved event
            const driver = await prisma.driver.findUnique({
                where: { id: driverId },
                select: { activeRideId: true }
            });

            eventBus.emitDriverMoved({
                driverId,
                lat,
                lng,
                rideId: driver?.activeRideId || undefined
            });

            logger.debug('Driver location updated', { driverId, lat, lng });

            res.json({ success: true });
        } catch (error: any) {
            logger.error('Failed to update driver location', {
                error: error.message,
                driverId: req.body.driverId
            });

            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }

    /**
     * Update driver status (online/offline)
     * POST /driver/status
     * Body: { driverId, status: 'ONLINE' | 'OFFLINE' }
     */
    async updateStatus(req: Request, res: Response): Promise<void> {
        try {
            const { driverId, status } = req.body;

            if (!driverId || !status) {
                res.status(400).json({ error: 'Missing driverId or status' });
                return;
            }

            if (status !== 'ONLINE' && status !== 'OFFLINE') {
                res.status(400).json({ error: 'Invalid status. Must be ONLINE or OFFLINE' });
                return;
            }

            await prisma.driver.update({
                where: { id: driverId },
                data: { status }
            });

            // Emit event
            if (status === 'ONLINE') {
                eventBus.emitDriverOnline({ driverId, status });
            } else {
                eventBus.emitDriverOffline({ driverId, status });
            }

            logger.info('Driver status updated', { driverId, status });

            res.json({ success: true, status });
        } catch (error: any) {
            logger.error('Failed to update driver status', {
                error: error.message,
                driverId: req.body.driverId
            });

            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }
}

export const driverController = new DriverController();
