import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import * as Location from 'expo-location';
import * as SMS from 'expo-sms';
import { useRideStore } from '../store/useRideStore';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MapPin, RefreshCw, Car, Settings } from 'lucide-react-native';

export default function PassengerHomeScreen() {
    const router = useRouter();
    const { requestRide, backendNumber, status } = useRideStore();
    const [location, setLocation] = useState<Location.LocationObject | null>(null);
    const [address, setAddress] = useState<string | null>(null);
    const [loadingLocation, setLoadingLocation] = useState(false);

    useEffect(() => {
        if (status !== 'IDLE') {
            router.replace('/status');
        }
    }, [status]);

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

    const handleRequestRide = async () => {
        if (!location) {
            Alert.alert('Location not available', 'Please wait for location to be fetched.');
            return;
        }

        if (!backendNumber) {
            Alert.alert('Configuration Missing', 'Please set the backend number in Settings.');
            router.push('/settings');
            return;
        }

        const isAvailable = await SMS.isAvailableAsync();
        if (isAvailable) {
            // Generate ride ID
            const newRideId = 'R' + Math.floor(100000 + Math.random() * 900000).toString();
            const destination = address || 'Current Location';
            const message = `RIDEREQ|${newRideId}|${location.coords.latitude}|${location.coords.longitude}|${destination}`;

            const { result } = await SMS.sendSMSAsync(
                [backendNumber],
                message
            );

            if (result === 'sent' || result === 'unknown') {
                requestRide(newRideId);
                router.push('/status');
            }
        } else {
            Alert.alert('SMS not available', 'This device does not support SMS.');
        }
    };

    return (
        <SafeAreaView className="flex-1 bg-slate-50 p-5">
            {/* Header */}
            <View className="flex-row justify-between items-start mb-6 mt-2">
                <View>
                    <Text className="text-3xl font-bold text-slate-800 mb-2">CabLite</Text>
                    <View className="bg-primary px-3 py-1.5 rounded-full self-start flex-row items-center">
                        <Car size={14} color="#ffffff" className="mr-1.5" />
                        <Text className="text-white text-xs font-semibold tracking-wide">PASSENGER</Text>
                    </View>
                </View>
                <TouchableOpacity onPress={() => router.push('/settings')} className="p-2 border border-slate-200 rounded-full bg-white shadow-sm">
                    <Settings size={22} color="#64748b" />
                </TouchableOpacity>
            </View>

            {/* Connection Status */}
            <View className="flex-row items-center mb-6">
                <View className="w-3 h-3 rounded-full bg-accent mr-3" />
                <Text className="text-base text-slate-500 font-medium">System Ready</Text>
            </View>

            {/* Location Card */}
            <View className="bg-white p-6 rounded-[20px] mb-8 shadow-sm border border-slate-100" style={{ elevation: 2 }}>
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

            {/* Request Button */}
            <View className="flex-1 justify-end pb-8">
                <TouchableOpacity
                    onPress={handleRequestRide}
                    className="bg-primary py-5 rounded-2xl shadow-sm"
                    style={{ elevation: 6, shadowColor: '#4F46E5', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 12 }}
                >
                    <Text className="text-white text-center text-xl font-bold">Request Ride</Text>
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
}
