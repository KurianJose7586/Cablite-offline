import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Switch, Alert, ActivityIndicator, Modal, Vibration } from 'react-native';
import { useRouter } from 'expo-router';
import * as Location from 'expo-location';
import { useRideStore } from '../store/useRideStore';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Car, Settings, MapPin, RefreshCw, BellRing, Route } from 'lucide-react-native';

export default function DriverHomeScreen() {
    const router = useRouter();
    const {
        isDriverOnline,
        toggleDriverOnline,
        incomingRideRequest,
        acceptRide,
        declineRide,
        receiveRideRequest,
        currentRideAsDriver
    } = useRideStore();

    const [location, setLocation] = useState<Location.LocationObject | null>(null);
    const [address, setAddress] = useState<string | null>(null);
    const [loadingLocation, setLoadingLocation] = useState(false);

    useEffect(() => {
        if (currentRideAsDriver) {
            router.replace('/driver-active-ride');
        }
    }, [currentRideAsDriver]);

    // Vibration feedback for incoming requests
    useEffect(() => {
        if (incomingRideRequest && isDriverOnline) {
            Vibration.vibrate([0, 500, 200, 500]);
        }
    }, [incomingRideRequest]);

    const fetchLocation = async () => {
        setLoadingLocation(true);
        let { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert('Permission to access location was denied');
            setLoadingLocation(false);
            return;
        }

        let location = await Location.getCurrentPositionAsync({});
        setLocation(location);

        try {
            let reverseGeocoded = await Location.reverseGeocodeAsync({
                latitude: location.coords.latitude,
                longitude: location.coords.longitude,
            });

            if (reverseGeocoded.length > 0) {
                const addr = reverseGeocoded[0];
                setAddress(`${addr.name || ''} ${addr.street || ''}, ${addr.city}`);
            }
        } catch (e) {
            console.log('Error reverse geocoding', e);
        }
        setLoadingLocation(false);
    };

    useEffect(() => {
        fetchLocation();
    }, []);

    const handleToggleOnline = () => toggleDriverOnline();
    const handleAccept = () => acceptRide();
    const handleDecline = () => declineRide();

    const simulateRideRequest = () => {
        if (!location) {
            Alert.alert('Location not available', 'Please wait for location to be fetched.');
            return;
        }

        const mockRequest = {
            rideId: Math.floor(100000 + Math.random() * 900000).toString(),
            pickupLocation: '123 Main St, Downtown',
            pickupCoords: {
                latitude: location.coords.latitude + 0.01,
                longitude: location.coords.longitude + 0.01,
            },
            distanceFromDriver: 2.3,
            estimatedRideDistance: 5.7,
        };

        receiveRideRequest(mockRequest);
    };

    return (
        <SafeAreaView className="flex-1 bg-slate-50 p-5">
            {/* Header */}
            <View className="flex-row justify-between items-start mb-6 mt-2">
                <View>
                    <Text className="text-3xl font-bold text-slate-800 mb-2">CabLite</Text>
                    <View className="bg-accent px-3 py-1.5 rounded-full self-start flex-row items-center">
                        <Car size={14} color="#ffffff" className="mr-1.5" />
                        <Text className="text-white text-xs font-semibold tracking-wide">DRIVER</Text>
                    </View>
                </View>
                <TouchableOpacity onPress={() => router.push('/settings')} className="p-2 border border-slate-200 rounded-full bg-white shadow-sm">
                    <Settings size={22} color="#64748b" />
                </TouchableOpacity>
            </View>

            {/* Online/Offline Toggle Card */}
            <View className="bg-white p-6 rounded-[20px] mb-6 shadow-sm border border-slate-100" style={{ elevation: 2 }}>
                <View className="flex-row justify-between items-center mb-2">
                    <Text className="text-2xl font-bold text-slate-800">
                        {isDriverOnline ? 'ONLINE' : 'OFFLINE'}
                    </Text>
                    <Switch
                        value={isDriverOnline}
                        onValueChange={handleToggleOnline}
                        trackColor={{ false: '#cbd5e1', true: '#10B981' }}
                        thumbColor="#fff"
                        ios_backgroundColor="#cbd5e1"
                    />
                </View>
                <Text className="text-sm text-slate-500">
                    {isDriverOnline
                        ? 'You are online and can receive ride requests'
                        : 'Toggle to start receiving ride requests'}
                </Text>
            </View>

            {/* Current Location */}
            <View className="bg-white p-6 rounded-[20px] mb-6 shadow-sm border border-slate-100" style={{ elevation: 2 }}>
                <View className="flex-row items-center mb-3">
                    <MapPin size={22} color="#4F46E5" className="mr-2.5" />
                    <Text className="text-lg font-semibold text-slate-800">Current Location</Text>
                </View>
                {loadingLocation ? (
                    <ActivityIndicator size="small" color="#4F46E5" className="mt-2 text-left self-start" />
                ) : (
                    <Text className="text-base text-slate-500 mt-1 leading-6">
                        {address || (location ? `${location.coords.latitude.toFixed(4)}, ${location.coords.longitude.toFixed(4)}` : 'Fetching location...')}
                    </Text>
                )}
                <TouchableOpacity onPress={fetchLocation} className="mt-6 flex-row items-center">
                    <RefreshCw size={16} color="#4F46E5" className="mr-2" />
                    <Text className="text-primary text-base font-semibold">Refresh Location</Text>
                </TouchableOpacity>
            </View>

            {/* Status Placeholder / Waiting */}
            {!isDriverOnline ? (
                <View className="bg-slate-100 p-8 rounded-[20px] items-center border border-slate-200 border-dashed">
                    <Text className="text-slate-500 text-base text-center">
                        You are offline. Toggle above to start receiving ride requests.
                    </Text>
                </View>
            ) : !incomingRideRequest && (
                <View className="bg-emerald-50 p-10 rounded-[20px] items-center border border-emerald-100 shadow-sm">
                    <ActivityIndicator size="large" color="#10B981" />
                    <Text className="mt-5 text-accent text-lg font-semibold">Waiting for Ride Requests...</Text>
                </View>
            )}

            {/* Dramatic Incoming Request Bottom Sheet (Simulated with Modal) */}
            <Modal
                visible={!!incomingRideRequest && isDriverOnline}
                animationType="slide"
                transparent={true}
                onRequestClose={handleDecline}
            >
                <View className="flex-1 justify-end bg-slate-900/40">
                    <View className="bg-white rounded-t-[32px] p-6 shadow-xl pt-8 pb-10" style={{ elevation: 24 }}>
                        <View className="flex-row items-center justify-between mb-6">
                            <Text className="text-3xl font-extrabold text-slate-800">New Request</Text>
                            <BellRing size={32} color="#F59E0B" />
                        </View>

                        {incomingRideRequest && (
                            <View className="mb-8 bg-slate-50 p-5 rounded-2xl border border-slate-100">
                                <View className="flex-row items-center mb-4">
                                    <View className="w-10 h-10 rounded-full bg-indigo-100 items-center justify-center mr-4">
                                        <MapPin size={20} color="#4F46E5" />
                                    </View>
                                    <View className="flex-1">
                                        <Text className="text-sm text-slate-500 font-semibold uppercase tracking-wider">Pickup</Text>
                                        <Text className="text-base font-bold text-slate-800">{incomingRideRequest.pickupLocation}</Text>
                                    </View>
                                </View>

                                <View className="h-[1px] bg-slate-200 mb-4" />

                                <View className="flex-row justify-between">
                                    <View className="flex-row items-center">
                                        <Route size={18} color="#64748b" className="mr-2" />
                                        <Text className="text-sm font-semibold text-slate-600">
                                            {incomingRideRequest.distanceFromDriver.toFixed(1)} km away
                                        </Text>
                                    </View>
                                    <Text className="text-sm font-medium text-slate-400">ID: {incomingRideRequest.rideId}</Text>
                                </View>
                            </View>
                        )}

                        <View className="flex-row gap-4">
                            <TouchableOpacity
                                className="flex-1 bg-slate-200 py-5 rounded-xl border border-slate-300"
                                onPress={handleDecline}
                            >
                                <Text className="text-slate-600 text-center text-lg font-bold">DECLINE</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                className="flex-1 bg-accent py-5 rounded-xl shadow-sm"
                                style={{ elevation: 4, shadowColor: '#10B981', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8 }}
                                onPress={handleAccept}
                            >
                                <Text className="text-white text-center text-lg font-bold">ACCEPT RIDE</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* DEBUG Button */}
            {isDriverOnline && !incomingRideRequest && (
                <View className="flex-1 justify-end pb-8 mt-5">
                    <TouchableOpacity
                        onPress={simulateRideRequest}
                        className="bg-slate-800 p-4 rounded-xl"
                    >
                        <Text className="text-white text-center font-bold text-base">DEBUG: Simulate Request</Text>
                    </TouchableOpacity>
                </View>
            )}
        </SafeAreaView>
    );
}
