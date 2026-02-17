import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Alert, ActivityIndicator, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import * as Location from 'expo-location';
import * as SMS from 'expo-sms';
import { useRideStore } from '../store/useRideStore';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function PassengerHomeScreen() {
    const router = useRouter();
    const { rideId, requestRide, backendNumber, status } = useRideStore();
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
            // Generate ride ID (6-20 alphanumeric characters)
            const newRideId = 'R' + Math.floor(100000 + Math.random() * 900000).toString();

            // Format: RIDEREQ|RIDEID|LAT|LNG|DESTINATION
            // Backend expects: parseSMS(Body) -> { type: 'RIDEREQ', rideId, data: { lat, lng, destination } }
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
        <SafeAreaView style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <View>
                    <Text style={styles.title}>CabLite</Text>
                    <View style={styles.badge}>
                        <Text style={styles.badgeText}>🚕 Passenger Mode</Text>
                    </View>
                </View>
                <TouchableOpacity onPress={() => router.push('/settings')}>
                    <Text style={styles.linkText}>Settings</Text>
                </TouchableOpacity>
            </View>

            {/* Connection Status */}
            <View style={styles.statusRow}>
                <View style={styles.statusDot} />
                <Text style={styles.statusText}>Online</Text>
            </View>

            {/* Location Card */}
            <View style={styles.card}>
                <View style={styles.cardHeader}>
                    <Text style={styles.cardTitle}>📍 Current Location</Text>
                </View>
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

            {/* Request Button */}
            <View style={styles.buttonContainer}>
                <TouchableOpacity
                    onPress={handleRequestRide}
                    style={styles.requestButton}
                >
                    <Text style={styles.requestButtonText}>
                        Request Ride via SMS
                    </Text>
                </TouchableOpacity>
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
        backgroundColor: '#007AFF',
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
    statusRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 24,
    },
    statusDot: {
        width: 12,
        height: 12,
        borderRadius: 6,
        backgroundColor: '#22c55e',
        marginRight: 8,
    },
    statusText: {
        color: '#64748b',
        fontSize: 16,
    },
    card: {
        backgroundColor: '#f8fafc',
        padding: 24,
        borderRadius: 12,
        marginBottom: 32,
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
    },
    cardTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#1e293b',
    },
    locationText: {
        color: '#64748b',
        fontSize: 16,
        marginTop: 8,
    },
    refreshButton: {
        marginTop: 16,
    },
    buttonContainer: {
        flex: 1,
        justifyContent: 'center',
    },
    requestButton: {
        backgroundColor: '#007AFF',
        paddingVertical: 20,
        borderRadius: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 4,
    },
    requestButtonText: {
        color: '#fff',
        textAlign: 'center',
        fontSize: 20,
        fontWeight: 'bold',
    },
});
