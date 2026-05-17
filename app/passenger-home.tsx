import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Alert, ActivityIndicator, TextInput, FlatList } from 'react-native';
import { useRouter } from 'expo-router';
import * as Location from 'expo-location';
import * as SMS from 'expo-sms';
import { useRideStore } from '../store/useRideStore';
import { useSearchStore, POI } from '../store/useSearchStore';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MapPin, RefreshCw, Car, Settings, Search, X } from 'lucide-react-native';

export default function PassengerHomeScreen() {
    const router = useRouter();
    const { requestRide, backendNumber, status } = useRideStore();
    const { initialize, search, searchResults, searchQuery, setQuery } = useSearchStore();
    
    const [location, setLocation] = useState<Location.LocationObject | null>(null);
    const [address, setAddress] = useState<string | null>(null);
    const [loadingLocation, setLoadingLocation] = useState(false);
    const [destination, setDestination] = useState<POI | null>(null);

    useEffect(() => {
        initialize();
    }, []);

    useEffect(() => {
        if (status !== 'IDLE') {
            router.replace('/status');
        }
    }, [status]);

    useEffect(() => {
        const delaySearch = setTimeout(() => {
            search(searchQuery, location?.coords.latitude, location?.coords.longitude);
        }, 300);
        return () => clearTimeout(delaySearch);
    }, [searchQuery]);

    const fetchLocation = async () => {
        setLoadingLocation(true);
        try {
            let { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert('Permission Denied', 'Permission to access location was denied. Please enable it in settings.');
                setLoadingLocation(false);
                return;
            }

            // Try to get last known position first for faster initial load
            const lastKnown = await Location.getLastKnownPositionAsync({});
            if (lastKnown && !location) {
                setLocation(lastKnown);
            }

            // Get current position with timeout and accuracy
            let locationResult = await Location.getCurrentPositionAsync({
                accuracy: Location.Accuracy.Balanced,
                timeInterval: 5000,
                mayShowUserSettingsDialog: true,
            });
            
            setLocation(locationResult);

            // Attempt reverse geocoding (requires internet)
            try {
                let reverseGeocoded = await Location.reverseGeocodeAsync({
                    latitude: locationResult.coords.latitude,
                    longitude: locationResult.coords.longitude,
                });

                if (reverseGeocoded.length > 0) {
                    const addr = reverseGeocoded[0];
                    const name = addr.name || addr.street || '';
                    const city = addr.city || addr.region || '';
                    setAddress(`${name}${name && city ? ', ' : ''}${city}`);
                }
            } catch (e) {
                console.log('Error reverse geocoding (likely offline):', e);
            }
        } catch (error) {
            console.error('Error fetching location:', error);
            Alert.alert('Location Error', 'Could not fetch your current location. Please check your GPS settings.');
        } finally {
            setLoadingLocation(false);
        }
    };

    useEffect(() => {
        fetchLocation();
    }, []);

    const handleSelectDestination = (poi: POI) => {
        setDestination(poi);
        setQuery('');
    };

    const handleDeepSearch = async () => {
        if (!backendNumber) {
            Alert.alert('Configuration Missing', 'Please set the backend number in Settings.');
            router.push('/settings');
            return;
        }

        const isAvailable = await SMS.isAvailableAsync();
        if (isAvailable) {
            const message = `SRCH|${searchQuery}`;
            const { result } = await SMS.sendSMSAsync([backendNumber], message);
            if (result === 'sent' || result === 'unknown') {
                Alert.alert(
                    'Search Sent', 
                    'Your search request has been sent via SMS. You will receive a reply with matching locations shortly.',
                    [{ text: 'OK' }]
                );
            }
        } else {
            Alert.alert('SMS not available', 'This device does not support SMS.');
        }
    };

    const handleRequestRide = async () => {
        if (!location) {
            Alert.alert('Location not available', 'Please wait for location to be fetched.');
            return;
        }

        if (!destination) {
            Alert.alert('No Destination', 'Please search and select a destination.');
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
            const destName = destination.name;
            const message = `RIDEREQ|${newRideId}|${location.coords.latitude}|${location.coords.longitude}|${destName}`;

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

            {/* Location Section */}
            <View className="bg-white p-5 rounded-[20px] mb-4 shadow-sm border border-slate-100" style={{ elevation: 2 }}>
                <View className="flex-row items-center mb-2">
                    <View className="w-2 h-2 rounded-full bg-blue-500 mr-2" />
                    <Text className="text-xs font-bold text-slate-400 uppercase tracking-widest">Current Location</Text>
                </View>
                {loadingLocation ? (
                    <ActivityIndicator size="small" color="#4F46E5" className="self-start" />
                ) : (
                    <Text className="text-base text-slate-800 font-semibold" numberOfLines={1}>
                        {address || (location ? `${location.coords.latitude.toFixed(4)}, ${location.coords.longitude.toFixed(4)}` : 'Fetching...')}
                    </Text>
                )}
            </View>

            {/* Destination Search Section */}
            <View className="bg-white p-5 rounded-[20px] mb-4 shadow-sm border border-slate-100 flex-1" style={{ elevation: 2 }}>
                <View className="flex-row items-center mb-3">
                    <View className="w-2 h-2 rounded-full bg-emerald-500 mr-2" />
                    <Text className="text-xs font-bold text-slate-400 uppercase tracking-widest">Destination</Text>
                </View>

                {destination ? (
                    <View className="flex-row items-center justify-between bg-slate-50 p-3 rounded-xl border border-slate-100">
                        <View className="flex-1 mr-2">
                            <Text className="text-base text-slate-800 font-bold" numberOfLines={1}>{destination.name}</Text>
                            <Text className="text-xs text-slate-500 uppercase">{destination.category}</Text>
                        </View>
                        <TouchableOpacity onPress={() => setDestination(null)}>
                            <X size={20} color="#94a3b8" />
                        </TouchableOpacity>
                    </View>
                ) : (
                    <View className="flex-row items-center bg-slate-100 px-4 py-3 rounded-xl">
                        <Search size={18} color="#94a3b8" className="mr-2" />
                        <TextInput
                            placeholder="Where to?"
                            placeholderTextColor="#94a3b8"
                            className="flex-1 text-slate-800 font-semibold"
                            value={searchQuery}
                            onChangeText={setQuery}
                        />
                    </View>
                )}

                {/* Search Results */}
                {!destination && searchQuery.length >= 2 && (
                    <>
                        <FlatList
                            data={searchResults}
                            keyExtractor={(item) => item.id.toString()}
                            className="mt-4"
                            ListEmptyComponent={() => (
                                <View className="py-10 items-center">
                                    <Text className="text-slate-400 text-center mb-4">No local results found.</Text>
                                    <TouchableOpacity 
                                        onPress={handleDeepSearch}
                                        className="bg-slate-100 px-6 py-3 rounded-full border border-slate-200"
                                    >
                                        <Text className="text-primary font-bold">Deep Search via SMS</Text>
                                    </TouchableOpacity>
                                </View>
                            )}
                            renderItem={({ item }) => (
                                <TouchableOpacity 
                                    onPress={() => handleSelectDestination(item)}
                                    className="py-4 border-b border-slate-50 flex-row items-center"
                                >
                                    <MapPin size={18} color="#4F46E5" className="mr-3" />
                                    <View>
                                        <Text className="text-slate-800 font-bold">{item.name}</Text>
                                        <Text className="text-xs text-slate-500 uppercase">{item.category}</Text>
                                    </View>
                                </TouchableOpacity>
                            )}
                        />
                    </>
                )}
            </View>

            {/* Request Button */}
            <View className="pb-8">
                <TouchableOpacity
                    onPress={handleRequestRide}
                    disabled={!destination}
                    className={`py-5 rounded-2xl shadow-sm ${destination ? 'bg-primary' : 'bg-slate-300'}`}
                    style={destination ? { elevation: 6, shadowColor: '#4F46E5', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 12 } : {}}
                >
                    <Text className="text-white text-center text-xl font-bold">Request Ride</Text>
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
}
