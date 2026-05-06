import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Switch, Alert, ActivityIndicator, Modal, Vibration, StatusBar } from 'react-native';
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
            Alert.alert('Location Denied', 'Permission to access location was denied');
            setLoadingLocation(false);
            return;
        }

        let loc = await Location.getCurrentPositionAsync({});
        setLocation(loc);
        setLoadingLocation(false);
    };

    useEffect(() => {
        fetchLocation();
    }, []);

    const simulateRideRequest = () => {
        if (!location) {
            Alert.alert('Location not available', 'Please wait for location to be fetched.');
            return;
        }

        const mockRequest = {
            rideId: Math.random().toString(36).substring(7).toUpperCase(),
            pickupLocation: 'Central Station Terminal',
            pickupCoords: {
                latitude: location.coords.latitude + 0.01,
                longitude: location.coords.longitude + 0.01,
            },
            distanceFromDriver: 1.2,
            estimatedRideDistance: 5.7,
        };

        receiveRideRequest(mockRequest);
    };

    return (
        <SafeAreaView className="flex-1 bg-neutral-950">
            <StatusBar barStyle="light-content" />
            
            {/* Header */}
            <View className="px-6 py-4 flex-row justify-between items-center z-10 bg-neutral-900 border-b border-neutral-800">
                <View className="flex-row items-center">
                    <Text className="text-white text-xl font-bold tracking-widest uppercase mr-3">CabLite</Text>
                    <View className="bg-neutral-800 px-2 py-1 rounded">
                        <Text className="text-neutral-400 text-[10px] font-bold tracking-wider">DRIVER OP</Text>
                    </View>
                </View>
                <TouchableOpacity onPress={() => router.replace('/welcome')} className="p-2">
                    <Text className="text-neutral-500 text-xs font-bold uppercase tracking-wider">Exit</Text>
                </TouchableOpacity>
            </View>

            {/* Realistic Dashboard Area (Background) */}
            <View className="absolute top-0 left-0 right-0 bottom-0 pt-24 px-6 opacity-30">
                <View className="flex-row justify-between mb-4">
                    <View className="bg-neutral-800/50 p-4 rounded flex-1 mr-2 border border-neutral-800">
                        <Text className="text-neutral-500 text-[10px] font-bold uppercase tracking-widest mb-1">Earnings Today</Text>
                        <Text className="text-white text-2xl font-black font-mono">$142.50</Text>
                    </View>
                    <View className="bg-neutral-800/50 p-4 rounded flex-1 ml-2 border border-neutral-800">
                        <Text className="text-neutral-500 text-[10px] font-bold uppercase tracking-widest mb-1">Acceptance Rate</Text>
                        <Text className="text-white text-2xl font-black font-mono text-emerald-500">98%</Text>
                    </View>
                </View>
                
                <View className="w-full border border-neutral-800/50 p-4 rounded flex items-center justify-center mt-2">
                    <Text className="text-neutral-600 font-mono text-[10px] uppercase tracking-widest">[ ROUTING ENGINE ACTIVE ]</Text>
                    {location && (
                        <Text className="text-neutral-500 font-mono text-xs mt-2">
                            LAT: {location.coords.latitude.toFixed(4)} | LNG: {location.coords.longitude.toFixed(4)}
                        </Text>
                    )}
                </View>
            </View>

            {/* Main Content Area */}
            <View className="flex-1 px-6 pt-6 z-10 justify-end pb-8">
                
                {/* Status Toggle Card */}
                <View className="bg-neutral-900 border border-neutral-800 p-6 rounded-none mb-6">
                    <View className="flex-row justify-between items-center mb-2">
                        <View className="flex-row items-center">
                            <View className={`w-3 h-3 rounded-full mr-3 ${isDriverOnline ? 'bg-emerald-500' : 'bg-neutral-600'}`} />
                            <Text className={`text-2xl font-black uppercase tracking-wider ${isDriverOnline ? 'text-emerald-500' : 'text-neutral-500'}`}>
                                {isDriverOnline ? 'ONLINE' : 'OFFLINE'}
                            </Text>
                        </View>
                        <Switch
                            value={isDriverOnline}
                            onValueChange={toggleDriverOnline}
                            trackColor={{ false: '#262626', true: '#047857' }}
                            thumbColor="#fff"
                        />
                    </View>
                    <Text className="text-neutral-500 text-sm font-medium">
                        {isDriverOnline ? 'Awaiting dispatch broadcasts.' : 'System standby.'}
                    </Text>
                </View>

                {/* Status Indicator */}
                {isDriverOnline && !incomingRideRequest && (
                    <View className="bg-neutral-900 border border-neutral-800 p-6 rounded-none flex-row items-center justify-center">
                        <ActivityIndicator size="small" color="#10B981" />
                        <Text className="ml-3 text-neutral-400 text-sm font-bold uppercase tracking-wider">Syncing Location...</Text>
                    </View>
                )}

            </View>

            {/* Incoming Request Modal */}
            <Modal
                visible={!!incomingRideRequest && isDriverOnline}
                animationType="slide"
                transparent={true}
            >
                <View className="flex-1 justify-end bg-black/80">
                    <View className="bg-neutral-900 border-t border-neutral-800 p-6 pt-8 pb-10">
                        <View className="flex-row items-center justify-between mb-8">
                            <Text className="text-emerald-500 text-sm font-black tracking-widest uppercase">New Dispatch</Text>
                            <Text className="text-neutral-500 font-mono text-xs">ID: {incomingRideRequest?.rideId}</Text>
                        </View>

                        {incomingRideRequest && (
                            <View className="mb-10">
                                <Text className="text-neutral-400 text-xs font-bold uppercase tracking-widest mb-2">Pickup Location</Text>
                                <Text className="text-white text-3xl font-black leading-tight mb-4">{incomingRideRequest.pickupLocation}</Text>
                                
                                <View className="flex-row items-center">
                                    <View className="bg-neutral-800 px-3 py-1 mr-3">
                                        <Text className="text-neutral-300 font-mono text-sm">{incomingRideRequest.distanceFromDriver.toFixed(1)} KM</Text>
                                    </View>
                                    <Text className="text-neutral-500 font-mono text-sm">EST DIST: {incomingRideRequest.estimatedRideDistance} KM</Text>
                                </View>
                            </View>
                        )}

                        <View className="flex-row gap-4">
                            <TouchableOpacity
                                className="flex-1 bg-neutral-800 py-6 border border-neutral-700"
                                onPress={declineRide}
                            >
                                <Text className="text-neutral-400 text-center text-lg font-black tracking-widest uppercase">Decline</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                className="flex-1 bg-emerald-600 py-6"
                                onPress={acceptRide}
                            >
                                <Text className="text-white text-center text-lg font-black tracking-widest uppercase">Accept</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
}
