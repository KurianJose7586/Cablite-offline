import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Expanded ride status to include all 7 states
export type RideStatus =
    | 'IDLE'
    | 'REQUESTED'
    | 'BROADCASTING'
    | 'ACCEPTED'
    | 'EN_ROUTE'
    | 'ARRIVED'
    | 'COMPLETED'
    | 'CANCELLED';

export type UserRole = 'passenger' | 'driver' | null;

interface DriverDetails {
    name: string;
    car: string;
    eta: string;
    phone?: string;
}

interface IncomingRideRequest {
    rideId: string;
    pickupLocation: string;
    pickupCoords: { latitude: number; longitude: number };
    distanceFromDriver: number; // in km
    estimatedRideDistance: number; // in km
}

interface PassengerDetails {
    name: string;
    phone?: string;
}

interface RideState {
    // User profile
    userRole: UserRole;
    hasCompletedOnboarding: boolean;
    userName: string;
    backendNumber: string;

    // Ride state (shared)
    rideId: string | null;
    status: RideStatus;

    // Passenger-specific
    driverDetails: DriverDetails | null;
    updateCount: number; // Track number of location updates sent
    lastUpdateTime: number | null; // Timestamp of last update

    // Driver-specific
    isDriverOnline: boolean;
    currentRideAsDriver: string | null; // Ride ID when driver has accepted a ride
    incomingRideRequest: IncomingRideRequest | null;
    passengerDetails: PassengerDetails | null;

    // User profile actions
    setUserRole: (role: UserRole) => void;
    setOnboarding: (completed: boolean) => void;
    setUserName: (name: string) => void;
    setBackendNumber: (number: string) => void;

    // Passenger actions
    requestRide: (rideId: string) => void;
    updateStatus: (status: RideStatus) => void;
    setDriverDetails: (details: DriverDetails) => void;
    incrementUpdateCount: () => void;
    canSendUpdate: () => boolean;
    resetRide: () => void;

    // Driver actions
    toggleDriverOnline: () => void;
    receiveRideRequest: (request: IncomingRideRequest) => void;
    acceptRide: () => void;
    declineRide: () => void;
    setPassengerDetails: (details: PassengerDetails) => void;
    completeRideAsDriver: () => void;

    // Reset all
    resetApp: () => void;
}

const INITIAL_STATE = {
    userRole: null,
    hasCompletedOnboarding: false,
    userName: '',
    backendNumber: '',
    rideId: null,
    status: 'IDLE' as RideStatus,
    driverDetails: null,
    updateCount: 0,
    lastUpdateTime: null,
    isDriverOnline: false,
    currentRideAsDriver: null,
    incomingRideRequest: null,
    passengerDetails: null,
};

export const useRideStore = create<RideState>()(
    persist(
        (set, get) => ({
            ...INITIAL_STATE,

            // User profile actions
            setUserRole: (userRole) => set({ userRole }),
            setOnboarding: (hasCompletedOnboarding) => set({ hasCompletedOnboarding }),
            setUserName: (userName) => set({ userName }),
            setBackendNumber: (backendNumber) => set({ backendNumber }),

            // Passenger actions
            requestRide: (rideId) => set({
                rideId,
                status: 'BROADCASTING', // Start with broadcasting (searching for drivers)
                updateCount: 0,
                lastUpdateTime: null,
            }),
            updateStatus: (status) => set({ status }),
            setDriverDetails: (driverDetails) => set({ driverDetails }),
            incrementUpdateCount: () => {
                const state = get();
                set({
                    updateCount: state.updateCount + 1,
                    lastUpdateTime: Date.now(),
                });
            },
            canSendUpdate: () => {
                const state = get();
                const MAX_UPDATES = 5;
                const COOLDOWN_MS = 2 * 60 * 1000; // 2 minutes

                // Check if max updates reached
                if (state.updateCount >= MAX_UPDATES) {
                    return false;
                }

                // Check cooldown
                if (state.lastUpdateTime) {
                    const timeSinceLastUpdate = Date.now() - state.lastUpdateTime;
                    if (timeSinceLastUpdate < COOLDOWN_MS) {
                        return false;
                    }
                }

                return true;
            },
            resetRide: () => set({
                rideId: null,
                status: 'IDLE',
                driverDetails: null,
                updateCount: 0,
                lastUpdateTime: null,
            }),

            // Driver actions
            toggleDriverOnline: () => {
                const state = get();
                // Prevent going offline during active ride
                if (state.currentRideAsDriver) {
                    return; // Cannot toggle offline during active ride
                }
                set({ isDriverOnline: !state.isDriverOnline });
            },
            receiveRideRequest: (incomingRideRequest) => set({ incomingRideRequest }),
            acceptRide: () => {
                const state = get();
                if (!state.incomingRideRequest) return;

                set({
                    currentRideAsDriver: state.incomingRideRequest.rideId,
                    rideId: state.incomingRideRequest.rideId,
                    status: 'ACCEPTED',
                    incomingRideRequest: null,
                });
            },
            declineRide: () => set({ incomingRideRequest: null }),
            setPassengerDetails: (passengerDetails) => set({ passengerDetails }),
            completeRideAsDriver: () => set({
                currentRideAsDriver: null,
                rideId: null,
                status: 'IDLE',
                passengerDetails: null,
                incomingRideRequest: null,
            }),

            // Reset all
            resetApp: () => set(INITIAL_STATE),
        }),
        {
            name: 'ride-storage',
            storage: createJSONStorage(() => AsyncStorage),
        }
    )
);
