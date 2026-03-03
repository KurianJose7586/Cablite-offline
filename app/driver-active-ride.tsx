import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, Alert, Linking } from 'react-native';
import { useRouter } from 'expo-router';
import * as Location from 'expo-location';
import { useRideStore } from '../store/useRideStore';
import { SafeAreaView } from 'react-native-safe-area-context';
import { User, Phone, MapPin, Navigation, Map } from 'lucide-react-native';

export default function DriverActiveRideScreen() {
    const router = useRouter();
    const {
        currentRideAsDriver, status, updateStatus, passengerDetails,
        setPassengerDetails, completeRideAsDriver, backendNumber
    } = useRideStore();

    const [location, setLocation] = useState<Location.LocationObject | null>(null);
    const gpsIntervalRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        if (!currentRideAsDriver) {
            router.replace('/driver-home');
        }
    }, [currentRideAsDriver]);

    useEffect(() => {
        if (!passengerDetails) {
            setPassengerDetails({ name: 'John Passenger', phone: backendNumber || '+1234567890' });
        }
    }, []);

    useEffect(() => {
        const startGPSTracking = async () => {
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') return;

            const initialLocation = await Location.getCurrentPositionAsync({});
            setLocation(initialLocation);

            gpsIntervalRef.current = setInterval(async () => {
                try {
                    const currentLocation = await Location.getCurrentPositionAsync({});
                    setLocation(currentLocation);
                } catch (error) {
                    console.error('[GPS] Error fetching location:', error);
                }
            }, 12000);
        };

        if (currentRideAsDriver) startGPSTracking();

        return () => {
            if (gpsIntervalRef.current) clearInterval(gpsIntervalRef.current);
        };
    }, [currentRideAsDriver]);

    const handleNavigate = () => {
        const coords = '37.7749,-122.4194';
        const url = `https://www.google.com/maps/dir/?api=1&destination=${coords}`;
        Linking.openURL(url);
    };

    const handleCallPassenger = () => {
        if (passengerDetails?.phone) Linking.openURL(`tel:${passengerDetails.phone}`);
    };

    const handleMarkAsArrived = () => updateStatus('ARRIVED');
    const handleStartTrip = () => updateStatus('EN_ROUTE');
    const handleCompleteTrip = () => {
        Alert.alert('Complete Trip', 'Are you sure you want to complete this trip?', [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Complete', onPress: () => { completeRideAsDriver(); router.replace('/driver-home'); } },
        ]);
    };

    const getStatusStyle = () => {
        switch (status) {
            case 'ACCEPTED': return { bg: 'bg-indigo-100', text: 'text-indigo-700' };
            case 'ARRIVED': return { bg: 'bg-emerald-100', text: 'text-emerald-700' };
            case 'EN_ROUTE': return { bg: 'bg-indigo-100', text: 'text-indigo-700' };
            default: return { bg: 'bg-slate-100', text: 'text-slate-700' };
        }
    };

    const getStatusText = () => {
        switch (status) {
            case 'ACCEPTED': return 'En Route to Pickup';
            case 'ARRIVED': return 'Arrived at Pickup';
            case 'EN_ROUTE': return 'Trip in Progress';
            default: return status;
        }
    };

    const st = getStatusStyle();

    return (
        <SafeAreaView className="flex-1 bg-slate-50 p-5">
            <View className="mb-6 mt-2 flex-row justify-between items-center">
                <View>
                    <Text className="text-3xl font-bold text-slate-800 mb-1">Active Ride</Text>
                    <Text className="text-sm font-semibold text-slate-500 tracking-wide uppercase">ID: {currentRideAsDriver}</Text>
                </View>
                <View className={`px-4 py-2 rounded-full ${st.bg}`}>
                    <Text className={`font-bold text-xs ${st.text}`}>{getStatusText()}</Text>
                </View>
            </View>

            {/* Static Map Placeholder Component */}
            <View className="h-40 bg-slate-200 rounded-[20px] mb-6 items-center justify-center border border-slate-300 overflow-hidden shadow-sm" style={{ backgroundColor: '#e2e8f0' }}>
                <Map size={48} color="#94a3b8" className="mb-3 opacity-50" />
                <Text className="text-slate-500 font-semibold text-sm tracking-wide">MAP VIEW COMMING SOON</Text>
            </View>

            {/* Passenger Info */}
            {passengerDetails && (
                <View className="bg-white p-5 rounded-[20px] mb-5 shadow-sm border border-slate-100" style={{ elevation: 2 }}>
                    <View className="flex-row items-center justify-between">
                        <View className="flex-row items-center flex-1">
                            <View className="w-12 h-12 bg-indigo-100 rounded-full items-center justify-center mr-4">
                                <User size={24} color="#4F46E5" />
                            </View>
                            <View>
                                <Text className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Passenger</Text>
                                <Text className="text-xl font-bold text-slate-800">{passengerDetails.name}</Text>
                            </View>
                        </View>
                        <TouchableOpacity onPress={handleCallPassenger} className="bg-emerald-100 p-3 rounded-full">
                            <Phone size={24} color="#10B981" />
                        </TouchableOpacity>
                    </View>
                </View>
            )}

            {/* Pickup Location */}
            <View className="bg-white p-5 rounded-[20px] mb-5 shadow-sm border border-slate-100" style={{ elevation: 2 }}>
                <View className="flex-row items-start justify-between">
                    <View className="flex-1">
                        <Text className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Location</Text>
                        <Text className="text-lg font-bold text-slate-800 mb-1">123 Main St, Downtown</Text>
                        <Text className="text-sm text-slate-500 font-semibold">Distance: 2.3 km</Text>
                    </View>
                    <MapPin size={24} color="#4F46E5" className="mt-2" />
                </View>
                <TouchableOpacity onPress={handleNavigate} className="bg-slate-100 flex-row items-center justify-center py-4 mt-5 rounded-xl border border-slate-200">
                    <Navigation size={18} color="#4F46E5" className="mr-2" />
                    <Text className="text-primary font-bold text-base">Navigate to Pickup</Text>
                </TouchableOpacity>
            </View>

            {/* Actions */}
            <View className="flex-1 justify-end pb-8">
                {status === 'ACCEPTED' && (
                    <TouchableOpacity onPress={handleMarkAsArrived} className="bg-primary py-5 rounded-xl shadow-sm">
                        <Text className="text-white text-center text-lg font-bold">Mark as Arrived</Text>
                    </TouchableOpacity>
                )}

                {status === 'ARRIVED' && (
                    <TouchableOpacity onPress={handleStartTrip} className="bg-primary py-5 rounded-xl shadow-sm">
                        <Text className="text-white text-center text-lg font-bold">Start Trip</Text>
                    </TouchableOpacity>
                )}

                {status === 'EN_ROUTE' && (
                    <TouchableOpacity onPress={handleCompleteTrip} className="bg-accent py-5 rounded-xl shadow-sm">
                        <Text className="text-white text-center text-lg font-bold">Complete Trip</Text>
                    </TouchableOpacity>
                )}
            </View>
        </SafeAreaView>
    );
}
