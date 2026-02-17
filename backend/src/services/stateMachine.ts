import { RideState } from '@prisma/client';
import { prisma } from '../db/prisma';
import { logger } from '../utils/logger';

/**
 * Valid state transitions for the ride state machine
 */
const VALID_TRANSITIONS: Record<RideState, RideState[]> = {
    REQUESTED: ['BROADCASTING'],
    BROADCASTING: ['ACCEPTED', 'EXPIRED', 'CANCELLED'],
    ACCEPTED: ['EN_ROUTE', 'CANCELLED'],
    EN_ROUTE: ['ARRIVED', 'CANCELLED'],
    ARRIVED: ['COMPLETED', 'CANCELLED'],
    COMPLETED: [],
    CANCELLED: [],
    EXPIRED: [],
};

export class StateMachine {
    /**
     * Check if a state transition is valid
     */
    canTransition(from: RideState, to: RideState): boolean {
        const allowedTransitions = VALID_TRANSITIONS[from];
        return allowedTransitions.includes(to);
    }

    /**
     * Transition a ride to a new state
     * @throws Error if transition is invalid
     */
    async transition(rideId: string, newState: RideState): Promise<void> {
        const ride = await prisma.ride.findUnique({
            where: { id: rideId },
            select: { state: true }
        });

        if (!ride) {
            throw new Error(`Ride ${rideId} not found`);
        }

        if (!this.canTransition(ride.state, newState)) {
            throw new Error(
                `Invalid state transition: ${ride.state} -> ${newState}`
            );
        }

        await prisma.ride.update({
            where: { id: rideId },
            data: { state: newState }
        });

        logger.info('Ride state transition', {
            rideId,
            from: ride.state,
            to: newState
        });
    }

    /**
     * Get all valid next states for a given state
     */
    getValidNextStates(currentState: RideState): RideState[] {
        return VALID_TRANSITIONS[currentState];
    }
}

export const stateMachine = new StateMachine();
