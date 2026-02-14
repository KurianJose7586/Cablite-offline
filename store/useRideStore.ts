import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type RideStatus = 'IDLE' | 'REQUESTED' | 'ASSIGNED' | 'ARRIVED' | 'ON_TRIP';

interface DriverDetails {
    name: string;
    car: string;
    eta: string;
}

interface RideState {
    rideId: string | null;
    status: RideStatus;
    driverDetails: DriverDetails | null;
    backendNumber: string;
    userName: string;
    requestRide: (rideId: string) => void;
    updateStatus: (status: RideStatus) => void;
    setDriverDetails: (details: DriverDetails) => void;
    setBackendNumber: (number: string) => void;
    setUserName: (name: string) => void;
    resetRide: () => void;
}

export const useRideStore = create<RideState>()(
    persist(
        (set) => ({
            rideId: null,
            status: 'IDLE',
            driverDetails: null,
            backendNumber: '', // Default or user set
            userName: '',
            requestRide: (rideId) => set({ rideId, status: 'REQUESTED' }),
            updateStatus: (status) => set({ status }),
            setDriverDetails: (driverDetails) => set({ driverDetails }),
            setBackendNumber: (backendNumber) => set({ backendNumber }),
            setUserName: (userName) => set({ userName }),
            resetRide: () => set({ rideId: null, status: 'IDLE', driverDetails: null }),
        }),
        {
            name: 'ride-storage',
            storage: createJSONStorage(() => AsyncStorage),
        }
    )
);
