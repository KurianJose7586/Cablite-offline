import { EventEmitter } from 'events';
import { logger } from '../utils/logger';

/**
 * Event types for the system
 */
export enum EventType {
    RIDE_REQUESTED = 'RIDE_REQUESTED',
    RIDE_ACCEPTED = 'RIDE_ACCEPTED',
    RIDE_CANCELLED = 'RIDE_CANCELLED',
    RIDE_COMPLETED = 'RIDE_COMPLETED',
    RIDE_EXPIRED = 'RIDE_EXPIRED',
    DRIVER_MOVED = 'DRIVER_MOVED',
    DRIVER_ONLINE = 'DRIVER_ONLINE',
    DRIVER_OFFLINE = 'DRIVER_OFFLINE'
}

/**
 * Event payloads
 */
export interface RideRequestedEvent {
    rideId: string;
    passengerId: string;
    pickupLat: number;
    pickupLng: number;
    destination: string;
}

export interface RideAcceptedEvent {
    rideId: string;
    driverId: string;
    passengerId: string;
}

export interface RideCancelledEvent {
    rideId: string;
    cancelledBy: 'passenger' | 'driver' | 'system';
}

export interface RideCompletedEvent {
    rideId: string;
    driverId: string;
    passengerId: string;
}

export interface RideExpiredEvent {
    rideId: string;
    reason: string;
}

export interface DriverMovedEvent {
    driverId: string;
    lat: number;
    lng: number;
    rideId?: string;
}

export interface DriverStatusEvent {
    driverId: string;
    status: 'ONLINE' | 'OFFLINE';
}

/**
 * Central event bus for decoupling services
 */
class EventBus extends EventEmitter {
    constructor() {
        super();
        this.setMaxListeners(50); // Increase for multiple listeners
    }

    /**
     * Emit a ride requested event
     */
    emitRideRequested(event: RideRequestedEvent): void {
        logger.info('Event: RIDE_REQUESTED', event);
        this.emit(EventType.RIDE_REQUESTED, event);
    }

    /**
     * Emit a ride accepted event
     */
    emitRideAccepted(event: RideAcceptedEvent): void {
        logger.info('Event: RIDE_ACCEPTED', event);
        this.emit(EventType.RIDE_ACCEPTED, event);
    }

    /**
     * Emit a ride cancelled event
     */
    emitRideCancelled(event: RideCancelledEvent): void {
        logger.info('Event: RIDE_CANCELLED', event);
        this.emit(EventType.RIDE_CANCELLED, event);
    }

    /**
     * Emit a ride completed event
     */
    emitRideCompleted(event: RideCompletedEvent): void {
        logger.info('Event: RIDE_COMPLETED', event);
        this.emit(EventType.RIDE_COMPLETED, event);
    }

    /**
     * Emit a ride expired event
     */
    emitRideExpired(event: RideExpiredEvent): void {
        logger.info('Event: RIDE_EXPIRED', event);
        this.emit(EventType.RIDE_EXPIRED, event);
    }

    /**
     * Emit a driver moved event
     */
    emitDriverMoved(event: DriverMovedEvent): void {
        logger.debug('Event: DRIVER_MOVED', event);
        this.emit(EventType.DRIVER_MOVED, event);
    }

    /**
     * Emit driver online event
     */
    emitDriverOnline(event: DriverStatusEvent): void {
        logger.info('Event: DRIVER_ONLINE', event);
        this.emit(EventType.DRIVER_ONLINE, event);
    }

    /**
     * Emit driver offline event
     */
    emitDriverOffline(event: DriverStatusEvent): void {
        logger.info('Event: DRIVER_OFFLINE', event);
        this.emit(EventType.DRIVER_OFFLINE, event);
    }

    /**
     * Subscribe to ride requested events
     */
    onRideRequested(handler: (event: RideRequestedEvent) => void): void {
        this.on(EventType.RIDE_REQUESTED, handler);
    }

    /**
     * Subscribe to ride accepted events
     */
    onRideAccepted(handler: (event: RideAcceptedEvent) => void): void {
        this.on(EventType.RIDE_ACCEPTED, handler);
    }

    /**
     * Subscribe to driver moved events
     */
    onDriverMoved(handler: (event: DriverMovedEvent) => void): void {
        this.on(EventType.DRIVER_MOVED, handler);
    }
}

export const eventBus = new EventBus();
