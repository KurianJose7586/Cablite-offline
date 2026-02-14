import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Switch, Alert, ActivityIndicator, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import * as Location from 'expo-location';
import { useRideStore } from '../store/useRideStore';
import { SafeAreaView } from 'react-native-safe-area-context';

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

    // Redirect to active ride screen if driver has accepted a ride
    useEffect(() => {
        if (currentRideAsDriver) {
            router.replace('/driver-active-ride');
        }
    }, [currentRideAsDriver]);

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

    const handleToggleOnline = () => {
        toggleDriverOnline();
    };

    const handleAccept = () => {
        acceptRide();
        // Navigation happens automatically via useEffect
    };

    const handleDecline = () => {
        declineRide();
    };

    // DEBUG: Simulate incoming ride request
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
        <SafeAreaView style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <View>
                    <Text style={styles.title}>CabLite</Text>
                    <View style={styles.badge}>
                        <Text style={styles.badgeText}>🚘 Driver Mode</Text>
                    </View>
                </View>
                <TouchableOpacity onPress={() => router.push('/settings')}>
                    <Text style={styles.linkText}>Settings</Text>
                </TouchableOpacity>
            </View>

            {/* Online/Offline Toggle */}
            <View style={styles.toggleCard}>
                <View style={styles.toggleHeader}>
                    <Text style={styles.toggleLabel}>
                        {isDriverOnline ? 'ONLINE' : 'OFFLINE'}
                    </Text>
                    <Switch
                        value={isDriverOnline}
                        onValueChange={handleToggleOnline}
                        trackColor={{ false: '#cbd5e1', true: '#22c55e' }}
                        thumbColor="#fff"
                        ios_backgroundColor="#cbd5e1"
                    />
                </View>
                <Text style={styles.toggleHint}>
                    {isDriverOnline
                        ? 'You are online and can receive ride requests'
                        : 'Toggle to start receiving ride requests'}
                </Text>
            </View>

            {/* Current Location */}
            <View style={styles.card}>
                <Text style={styles.cardTitle}>📍 Current Location</Text>
                {loadingLocation ? (
                    <ActivityIndicator size="small" color="#007AFF" />
                ) : (
                    <Text style={styles.locationText}>
                        {address || (location ? `${location.coords.latitude.toFixed(4)}, ${location.coords.longitude.toFixed(4)}` : 'Fetching location...')}
                    </Text>
                )}
                <TouchableOpacity onPress={fetchLocation} style={styles.refreshButton}>
                    <Text style={styles.linkText}>Refresh Location</Text>
                </TouchableOpacity>
            </View>

            {/* Status / Incoming Request */}
            {!isDriverOnline ? (
                <View style={styles.offlineCard}>
                    <Text style={styles.offlineText}>
                        You are offline. Toggle above to start receiving ride requests.
                    </Text>
                </View>
            ) : incomingRideRequest ? (
                <View style={styles.requestCard}>
                    <Text style={styles.requestTitle}>🚕 Incoming Ride Request</Text>
                    <View style={styles.requestDetails}>
                        <View style={styles.requestRow}>
                            <Text style={styles.requestLabel}>Pickup:</Text>
                            <Text style={styles.requestValue}>{incomingRideRequest.pickupLocation}</Text>
                        </View>
                        <View style={styles.requestRow}>
                            <Text style={styles.requestLabel}>Distance from you:</Text>
                            <Text style={styles.requestValue}>{incomingRideRequest.distanceFromDriver.toFixed(1)} km</Text>
                        </View>
                        <View style={styles.requestRow}>
                            <Text style={styles.requestLabel}>Estimated ride:</Text>
                            <Text style={styles.requestValue}>{incomingRideRequest.estimatedRideDistance.toFixed(1)} km</Text>
                        </View>
                        <View style={styles.requestRow}>
                            <Text style={styles.requestLabel}>Ride ID:</Text>
                            <Text style={styles.requestValue}>{incomingRideRequest.rideId}</Text>
                        </View>
                    </View>
                    <View style={styles.requestActions}>
                        <TouchableOpacity
                            style={styles.acceptButton}
                            onPress={handleAccept}
                        >
                            <Text style={styles.acceptButtonText}>ACCEPT</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={styles.declineButton}
                            onPress={handleDecline}
                        >
                            <Text style={styles.declineButtonText}>DECLINE</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            ) : (
                <View style={styles.waitingCard}>
                    <ActivityIndicator size="large" color="#22c55e" />
                    <Text style={styles.waitingText}>Waiting for Ride Requests...</Text>
                </View>
            )}

            {/* DEBUG Button */}
            {isDriverOnline && !incomingRideRequest && (
                <TouchableOpacity
                    onPress={simulateRideRequest}
                    style={styles.debugButton}
                >
                    <Text style={styles.debugButtonText}>DEBUG: Simulate Ride Request</Text>
                </TouchableOpacity>
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
        padding: 16,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 24,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#1e293b',
        marginBottom: 8,
    },
    badge: {
        backgroundColor: '#22c55e',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 16,
        alignSelf: 'flex-start',
    },
    badgeText: {
        color: '#fff',
        fontSize: 12,
        fontWeight: '600',
    },
    linkText: {
        color: '#007AFF',
        fontSize: 16,
    },
    toggleCard: {
        backgroundColor: '#f8fafc',
        padding: 20,
        borderRadius: 12,
        marginBottom: 20,
        borderWidth: 2,
        borderColor: '#e2e8f0',
    },
    toggleHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    toggleLabel: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#1e293b',
    },
    toggleHint: {
        fontSize: 14,
        color: '#64748b',
    },
    card: {
        backgroundColor: '#f8fafc',
        padding: 20,
        borderRadius: 12,
        marginBottom: 20,
    },
    cardTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#1e293b',
        marginBottom: 8,
    },
    locationText: {
        color: '#64748b',
        fontSize: 16,
        marginTop: 8,
    },
    refreshButton: {
        marginTop: 12,
    },
    offlineCard: {
        backgroundColor: '#f1f5f9',
        padding: 32,
        borderRadius: 12,
        alignItems: 'center',
    },
    offlineText: {
        color: '#64748b',
        fontSize: 16,
        textAlign: 'center',
    },
    waitingCard: {
        backgroundColor: '#f0fdf4',
        padding: 48,
        borderRadius: 12,
        alignItems: 'center',
        borderWidth: 2,
        borderColor: '#bbf7d0',
    },
    waitingText: {
        marginTop: 16,
        color: '#22c55e',
        fontSize: 18,
        fontWeight: '600',
    },
    requestCard: {
        backgroundColor: '#fef3c7',
        padding: 20,
        borderRadius: 12,
        borderWidth: 2,
        borderColor: '#fbbf24',
    },
    requestTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#1e293b',
        marginBottom: 16,
    },
    requestDetails: {
        marginBottom: 20,
    },
    requestRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 8,
    },
    requestLabel: {
        fontSize: 14,
        color: '#64748b',
        fontWeight: '600',
    },
    requestValue: {
        fontSize: 14,
        color: '#1e293b',
        fontWeight: '600',
    },
    requestActions: {
        flexDirection: 'row',
        gap: 12,
    },
    acceptButton: {
        flex: 1,
        backgroundColor: '#22c55e',
        paddingVertical: 16,
        borderRadius: 10,
    },
    acceptButtonText: {
        color: '#fff',
        textAlign: 'center',
        fontSize: 18,
        fontWeight: 'bold',
    },
    declineButton: {
        flex: 1,
        backgroundColor: '#94a3b8',
        paddingVertical: 16,
        borderRadius: 10,
    },
    declineButtonText: {
        color: '#fff',
        textAlign: 'center',
        fontSize: 18,
        fontWeight: 'bold',
    },
    debugButton: {
        backgroundColor: '#1e293b',
        padding: 16,
        borderRadius: 12,
        marginTop: 20,
    },
    debugButtonText: {
        color: '#fff',
        textAlign: 'center',
        fontWeight: 'bold',
        fontSize: 16,
    },
});
