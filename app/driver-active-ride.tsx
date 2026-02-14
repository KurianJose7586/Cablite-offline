import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, Alert, Linking, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import * as Location from 'expo-location';
import { useRideStore } from '../store/useRideStore';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function DriverActiveRideScreen() {
    const router = useRouter();
    const {
        currentRideAsDriver,
        status,
        updateStatus,
        passengerDetails,
        setPassengerDetails,
        completeRideAsDriver,
        backendNumber
    } = useRideStore();

    const [location, setLocation] = useState<Location.LocationObject | null>(null);
    const gpsIntervalRef = useRef<NodeJS.Timeout | null>(null);

    // Redirect if no active ride
    useEffect(() => {
        if (!currentRideAsDriver) {
            router.replace('/driver-home');
        }
    }, [currentRideAsDriver]);

    // Set mock passenger details on mount
    useEffect(() => {
        if (!passengerDetails) {
            setPassengerDetails({
                name: 'John Passenger',
                phone: backendNumber || '+1234567890',
            });
        }
    }, []);

    // GPS Tracking - Send location every 10-15 seconds
    useEffect(() => {
        const startGPSTracking = async () => {
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert('Location permission denied');
                return;
            }

            // Initial location
            const initialLocation = await Location.getCurrentPositionAsync({});
            setLocation(initialLocation);
            console.log('[GPS] Initial location:', initialLocation.coords);

            // Set up interval for continuous tracking
            gpsIntervalRef.current = setInterval(async () => {
                try {
                    const currentLocation = await Location.getCurrentPositionAsync({});
                    setLocation(currentLocation);

                    // Log to console (placeholder for backend upload)
                    console.log('[GPS] Location update:', {
                        rideId: currentRideAsDriver,
                        latitude: currentLocation.coords.latitude,
                        longitude: currentLocation.coords.longitude,
                        timestamp: new Date().toISOString(),
                    });
                } catch (error) {
                    console.error('[GPS] Error fetching location:', error);
                }
            }, 12000); // 12 seconds
        };

        if (currentRideAsDriver) {
            startGPSTracking();
        }

        // Cleanup on unmount
        return () => {
            if (gpsIntervalRef.current) {
                clearInterval(gpsIntervalRef.current);
                console.log('[GPS] Tracking stopped');
            }
        };
    }, [currentRideAsDriver]);

    const handleNavigate = () => {
        // Open default maps app with pickup location
        const coords = '37.7749,-122.4194'; // Mock coordinates
        const url = `https://www.google.com/maps/dir/?api=1&destination=${coords}`;
        Linking.openURL(url);
    };

    const handleCallPassenger = () => {
        if (passengerDetails?.phone) {
            Linking.openURL(`tel:${passengerDetails.phone}`);
        } else {
            Alert.alert('No phone number', 'Passenger phone number not available');
        }
    };

    const handleMarkAsArrived = () => {
        updateStatus('ARRIVED');
        Alert.alert('Status Updated', 'You have arrived at the pickup location');
    };

    const handleStartTrip = () => {
        updateStatus('EN_ROUTE');
        Alert.alert('Trip Started', 'Trip is now in progress');
    };

    const handleCompleteTrip = () => {
        Alert.alert(
            'Complete Trip',
            'Are you sure you want to complete this trip?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Complete',
                    onPress: () => {
                        completeRideAsDriver();
                        router.replace('/driver-home');
                    },
                },
            ]
        );
    };

    const getStatusColor = () => {
        switch (status) {
            case 'ACCEPTED': return '#3b82f6';
            case 'ARRIVED': return '#22c55e';
            case 'EN_ROUTE': return '#a855f7';
            default: return '#64748b';
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

    return (
        <SafeAreaView style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <Text style={styles.title}>Active Ride</Text>
                <Text style={styles.subtitle}>Ride ID: {currentRideAsDriver}</Text>
            </View>

            {/* Status Badge */}
            <View style={[styles.statusBadge, { backgroundColor: getStatusColor() }]}>
                <Text style={styles.statusText}>{getStatusText()}</Text>
            </View>

            {/* Passenger Info Card */}
            {passengerDetails && (
                <View style={styles.card}>
                    <Text style={styles.cardTitle}>👤 Passenger Information</Text>
                    <Text style={styles.passengerName}>{passengerDetails.name}</Text>
                    <TouchableOpacity
                        style={styles.callButton}
                        onPress={handleCallPassenger}
                    >
                        <Text style={styles.callButtonText}>📞 Call Passenger</Text>
                    </TouchableOpacity>
                </View>
            )}

            {/* Pickup Location Card */}
            <View style={styles.card}>
                <Text style={styles.cardTitle}>📍 Pickup Location</Text>
                <Text style={styles.locationText}>123 Main St, Downtown</Text>
                <Text style={styles.distanceText}>Distance: 2.3 km</Text>
                <TouchableOpacity
                    style={styles.navigateButton}
                    onPress={handleNavigate}
                >
                    <Text style={styles.navigateButtonText}>🗺️ Navigate to Pickup</Text>
                </TouchableOpacity>
            </View>

            {/* GPS Tracking Status */}
            <View style={styles.gpsCard}>
                <Text style={styles.gpsTitle}>📡 GPS Tracking Active</Text>
                <Text style={styles.gpsText}>
                    Location updates every 10-15 seconds
                </Text>
                {location && (
                    <Text style={styles.gpsCoords}>
                        {location.coords.latitude.toFixed(4)}, {location.coords.longitude.toFixed(4)}
                    </Text>
                )}
            </View>

            {/* Action Buttons */}
            <View style={styles.actions}>
                {status === 'ACCEPTED' && (
                    <TouchableOpacity
                        style={styles.actionButton}
                        onPress={handleMarkAsArrived}
                    >
                        <Text style={styles.actionButtonText}>Mark as Arrived</Text>
                    </TouchableOpacity>
                )}

                {status === 'ARRIVED' && (
                    <TouchableOpacity
                        style={styles.actionButton}
                        onPress={handleStartTrip}
                    >
                        <Text style={styles.actionButtonText}>Start Trip</Text>
                    </TouchableOpacity>
                )}

                {status === 'EN_ROUTE' && (
                    <TouchableOpacity
                        style={[styles.actionButton, styles.completeButton]}
                        onPress={handleCompleteTrip}
                    >
                        <Text style={styles.actionButtonText}>Complete Trip</Text>
                    </TouchableOpacity>
                )}
            </View>
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
        marginBottom: 20,
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#1e293b',
        marginBottom: 4,
    },
    subtitle: {
        fontSize: 14,
        color: '#64748b',
    },
    statusBadge: {
        alignSelf: 'flex-start',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        marginBottom: 24,
    },
    statusText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 14,
    },
    card: {
        backgroundColor: '#f8fafc',
        padding: 20,
        borderRadius: 12,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: '#e2e8f0',
    },
    cardTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1e293b',
        marginBottom: 12,
    },
    passengerName: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#1e293b',
        marginBottom: 12,
    },
    callButton: {
        backgroundColor: '#22c55e',
        paddingVertical: 12,
        borderRadius: 10,
    },
    callButtonText: {
        color: '#fff',
        textAlign: 'center',
        fontSize: 16,
        fontWeight: 'bold',
    },
    locationText: {
        fontSize: 16,
        color: '#1e293b',
        marginBottom: 4,
    },
    distanceText: {
        fontSize: 14,
        color: '#64748b',
        marginBottom: 12,
    },
    navigateButton: {
        backgroundColor: '#007AFF',
        paddingVertical: 12,
        borderRadius: 10,
    },
    navigateButtonText: {
        color: '#fff',
        textAlign: 'center',
        fontSize: 16,
        fontWeight: 'bold',
    },
    gpsCard: {
        backgroundColor: '#f0fdf4',
        padding: 16,
        borderRadius: 12,
        marginBottom: 24,
        borderWidth: 1,
        borderColor: '#bbf7d0',
    },
    gpsTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#22c55e',
        marginBottom: 4,
    },
    gpsText: {
        fontSize: 14,
        color: '#64748b',
        marginBottom: 4,
    },
    gpsCoords: {
        fontSize: 12,
        color: '#94a3b8',
        fontFamily: 'monospace',
    },
    actions: {
        gap: 12,
    },
    actionButton: {
        backgroundColor: '#007AFF',
        paddingVertical: 16,
        borderRadius: 12,
    },
    completeButton: {
        backgroundColor: '#22c55e',
    },
    actionButtonText: {
        color: '#fff',
        textAlign: 'center',
        fontSize: 18,
        fontWeight: 'bold',
    },
});
