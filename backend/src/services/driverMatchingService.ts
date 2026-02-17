import { prisma } from '../db/prisma';
import { logger } from '../utils/logger';

export interface NearbyDriver {
    id: string;
    userId: string;
    currentLat: number;
    currentLng: number;
    distanceMeters: number;
    distanceKm: number;
}

export class DriverMatchingService {
    /**
     * Find online drivers within radius using PostGIS
     * @param lat Pickup latitude
     * @param lng Pickup longitude
     * @param radiusKm Search radius in kilometers (default: 3km)
     * @param limit Maximum number of drivers to return
     */
    async findNearbyDrivers(
        lat: number,
        lng: number,
        radiusKm: number = 3,
        limit: number = 10
    ): Promise<NearbyDriver[]> {
        try {
            // Use PostGIS ST_DWithin for efficient spatial query
            // ST_MakePoint creates a point from lng, lat (note: longitude first!)
            // ST_DWithin uses meters for geography type
            const radiusMeters = radiusKm * 1000;

            const result = await prisma.$queryRaw<any[]>`
        SELECT 
          d.id,
          d."userId",
          d."currentLat",
          d."currentLng",
          ST_Distance(
            d.location,
            ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)::geography
          ) as "distanceMeters"
        FROM "Driver" d
        WHERE 
          d.status = 'ONLINE'
          AND d."activeRideId" IS NULL
          AND d.location IS NOT NULL
          AND ST_DWithin(
            d.location,
            ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)::geography,
            ${radiusMeters}
          )
        ORDER BY "distanceMeters" ASC
        LIMIT ${limit}
      `;

            const drivers: NearbyDriver[] = result.map((row) => ({
                id: row.id,
                userId: row.userId,
                currentLat: parseFloat(row.currentLat),
                currentLng: parseFloat(row.currentLng),
                distanceMeters: parseFloat(row.distanceMeters),
                distanceKm: parseFloat(row.distanceMeters) / 1000
            }));

            logger.info('Found nearby drivers', {
                pickup: { lat, lng },
                radiusKm,
                count: drivers.length
            });

            return drivers;
        } catch (error: any) {
            logger.error('Failed to find nearby drivers', {
                error: error.message,
                pickup: { lat, lng }
            });
            throw error;
        }
    }

    /**
     * Find the closest available driver
     */
    async findClosestDriver(lat: number, lng: number): Promise<NearbyDriver | null> {
        const drivers = await this.findNearbyDrivers(lat, lng, 3, 1);
        return drivers.length > 0 ? drivers[0] : null;
    }

    /**
     * Check if there are any available drivers in the area
     */
    async hasAvailableDrivers(lat: number, lng: number, radiusKm: number = 3): Promise<boolean> {
        const drivers = await this.findNearbyDrivers(lat, lng, radiusKm, 1);
        return drivers.length > 0;
    }
}

export const driverMatchingService = new DriverMatchingService();
