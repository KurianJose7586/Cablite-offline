import { prisma } from '../db/prisma';
import { logger } from '../utils/logger';
import { eventBus } from './eventBus';
import { rideService } from './rideService';

// Default city center (e.g., Bangalore)
const CENTER_LAT = 12.9716;
const CENTER_LNG = 77.5946;

class SimulationService {
    private ghostDriverIds: string[] = [];
    private movementInterval: NodeJS.Timeout | null = null;
    private initialized = false;

    async init() {
        if (this.initialized) return;
        this.initialized = true;

        logger.info('Initializing Ghost Drivers for Simulation');

        try {
            // Create or find ghost drivers
            for (let i = 1; i <= 3; i++) {
                const phone = `+91000000000${i}`;
                
                // Find or create user
                let user = await prisma.user.findUnique({ where: { phone } });
                if (!user) {
                    user = await prisma.user.create({
                        data: {
                            phone,
                            role: 'DRIVER',
                            name: `Ghost Driver ${i}`,
                        }
                    });
                }

                // Find or create driver profile
                let driver = await prisma.driver.findUnique({ where: { userId: user.id } });
                if (!driver) {
                    // Randomize position slightly around center
                    const lat = CENTER_LAT + (Math.random() - 0.5) * 0.05;
                    const lng = CENTER_LNG + (Math.random() - 0.5) * 0.05;
                    
                    driver = await prisma.driver.create({
                        data: {
                            userId: user.id,
                            status: 'ONLINE',
                            currentLat: lat,
                            currentLng: lng,
                            lastLocationUpdate: new Date()
                        }
                    });
                } else {
                    // Ensure they are ONLINE
                    await prisma.driver.update({
                        where: { id: driver.id },
                        data: { status: 'ONLINE' }
                    });
                }

                this.ghostDriverIds.push(driver.id);
            }

            this.startMovement();
            this.listenToBroadcasts();

            logger.info(`Simulation started with ${this.ghostDriverIds.length} ghost drivers`);
        } catch (error) {
            logger.error('Failed to initialize simulation service', error);
        }
    }

    private startMovement() {
        // Move drivers slightly every 5 seconds
        this.movementInterval = setInterval(async () => {
            for (const driverId of this.ghostDriverIds) {
                try {
                    const driver = await prisma.driver.findUnique({ where: { id: driverId } });
                    if (!driver || !driver.currentLat || !driver.currentLng) continue;

                    // Move randomly by a very small amount
                    const latDelta = (Math.random() - 0.5) * 0.001;
                    const lngDelta = (Math.random() - 0.5) * 0.001;

                    await prisma.driver.update({
                        where: { id: driverId },
                        data: {
                            currentLat: driver.currentLat + latDelta,
                            currentLng: driver.currentLng + lngDelta,
                            lastLocationUpdate: new Date()
                        }
                    });

                    // Emit event if we want the map to update smoothly
                    eventBus.emitDriverMoved({
                        driverId,
                        lat: driver.currentLat + latDelta,
                        lng: driver.currentLng + lngDelta,
                        rideId: driver.activeRideId || undefined
                    });
                } catch (err) {
                    logger.error(`Error moving ghost driver ${driverId}`, err);
                }
            }
        }, 5000);
    }

    private listenToBroadcasts() {
        // When a ride is requested and broadcasted, have a ghost driver accept it
        eventBus.onRideRequested(async (event) => {
            logger.info('Simulation Service detected a new ride request', { rideId: event.rideId });
            
            // Wait 3 seconds to simulate driver reaction time
            setTimeout(async () => {
                try {
                    const ride = await prisma.ride.findUnique({ where: { id: event.rideId } });
                    if (!ride || ride.state !== 'BROADCASTING') return;

                    // Find an available ghost driver
                    for (const driverId of this.ghostDriverIds) {
                        const driver = await prisma.driver.findUnique({ where: { id: driverId } });
                        if (driver && driver.status === 'ONLINE' && !driver.activeRideId) {
                            
                            // Accept the ride using the service
                            // Actually, rideService doesn't have acceptRide, driverController does.
                            // We need to trigger the same logic or just update the DB directly, but we should use the proper method.
                            // To bypass HTTP, we'll do the DB transaction here or move the logic from driverController to driverService.
                            
                            // For simulation, we'll directly do the transaction here to simulate accept.
                            await prisma.$transaction(async (tx) => {
                                const lockedRide = await tx.$queryRaw<any[]>`SELECT id FROM "Ride" WHERE id = ${ride.id} AND state = 'BROADCASTING' FOR UPDATE`;
                                if (lockedRide.length === 0) throw new Error('Ride taken');

                                await tx.ride.update({
                                    where: { id: ride.id },
                                    data: { driverId: driver.id, state: 'ACCEPTED', acceptedAt: new Date() }
                                });

                                await tx.driver.update({
                                    where: { id: driver.id },
                                    data: { activeRideId: ride.id }
                                });
                            });

                            eventBus.emitRideAccepted({
                                rideId: ride.id,
                                driverId: driver.id,
                                passengerId: ride.passengerId
                            });

                            logger.info(`Ghost driver ${driver.id} accepted ride ${ride.id}`);

                            // Also simulate SMS to the passenger
                            const { socketService } = require('./socketService');
                            const passenger = await prisma.user.findUnique({ where: { id: ride.passengerId } });
                            if (passenger) {
                                socketService.sendSimulatedSMS(passenger.phone, `CabLite: Ride accepted. Ghost Driver is on the way.`);
                            }
                            break;
                        }
                    }
                } catch (error) {
                    logger.warn('Ghost driver failed to accept ride', error);
                }
            }, 3000);
        });
    }
}

export const simulationService = new SimulationService();
