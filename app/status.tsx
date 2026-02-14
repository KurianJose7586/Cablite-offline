import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Alert, Linking, ScrollView, ActivityIndicator, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import * as SMS from 'expo-sms';
import { useRideStore, RideStatus } from '../store/useRideStore';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function RideStatusScreen() {
    const router = useRouter();
    const { rideId, status, driverDetails, backendNumber, updateStatus, setDriverDetails, resetRide } = useRideStore();
    const [cooldown, setCooldown] = useState(0);

    const getStatusColor = (s: RideStatus) => {
        switch (s) {
            case 'REQUESTED': return '#eab308';
            case 'ASSIGNED': return '#3b82f6';
            case 'ARRIVED': return '#22c55e';
            case 'ON_TRIP': return '#a855f7';
            default: return '#64748b';
        }
    };

    const handleCallDriver = () => {
        if (status === 'ASSIGNED' || status === 'ARRIVED' || status === 'ON_TRIP') {
            Linking.openURL(`tel:${backendNumber}`);
        } else {
            Alert.alert('No Driver', 'Driver is not assigned yet.');
        }
    };

    const handleUpdateLocation = async () => {
        if (cooldown > 0) return;

        const isAvailable = await SMS.isAvailableAsync();
        if (isAvailable) {
            const message = `UPDATE ${rideId}`;
            const { result } = await SMS.sendSMSAsync(
                [backendNumber],
                message
            );
            if (result === 'sent' || result === 'unknown') {
                setCooldown(60);
                const timer = setInterval(() => {
                    setCooldown((prev: number) => {
                        if (prev <= 1) {
                            clearInterval(timer);
                            return 0;
                        }
                        return prev - 1;
                    });
                }, 1000);
            }
        }
    };

    const simulateIncomingSMS = () => {
        Alert.alert(
            "Simulate SMS",
            "Choose an incoming message type",
            [
                {
                    text: "Driver Assigned",
                    onPress: () => {
                        updateStatus('ASSIGNED');
                        setDriverDetails({ name: 'John Doe', car: 'Toyota Prius (Red)', eta: '5 mins' });
                    }
                },
                {
                    text: "Driver Arrived",
                    onPress: () => updateStatus('ARRIVED')
                },
                {
                    text: "Trip Started",
                    onPress: () => updateStatus('ON_TRIP')
                },
                {
                    text: "Trip Completed",
                    onPress: () => {
                        resetRide();
                        router.replace('/');
                    }
                },
                { text: "Cancel", style: "cancel" }
            ]
        );
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>Ride Status</Text>
                <Text style={styles.subtitle}>Ride ID: {rideId}</Text>
            </View>

            {/* Status Badge */}
            <View style={[styles.statusBadge, { backgroundColor: getStatusColor(status) }]}>
                <Text style={styles.statusText}>{status}</Text>
            </View>

            {/* Driver Card */}
            {(status === 'ASSIGNED' || status === 'ARRIVED' || status === 'ON_TRIP') && driverDetails ? (
                <View style={styles.driverCard}>
                    <View style={styles.driverInfo}>
                        <Text style={styles.driverName}>🚗 {driverDetails.name}</Text>
                        <Text style={styles.driverCar}>{driverDetails.car}</Text>
                    </View>
                    <View style={styles.driverFooter}>
                        <Text style={styles.eta}>ETA: {driverDetails.eta}</Text>
                        <TouchableOpacity onPress={handleCallDriver} style={styles.callButton}>
                            <Text style={styles.callButtonText}>📞 Call</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            ) : (
                <View style={styles.waitingCard}>
                    <ActivityIndicator size="large" color="#007AFF" />
                    <Text style={styles.waitingText}>Waiting for driver...</Text>
                </View>
            )}

            {/* Actions */}
            <View style={styles.actions}>
                <TouchableOpacity
                    onPress={handleUpdateLocation}
                    disabled={cooldown > 0}
                    style={[styles.actionButton, cooldown > 0 && styles.actionButtonDisabled]}
                >
                    <Text style={[styles.actionButtonText, cooldown > 0 && styles.actionButtonTextDisabled]}>
                        {cooldown > 0 ? `Update Location (${cooldown}s)` : '🔄 Request Location Update'}
                    </Text>
                </TouchableOpacity>

                <TouchableOpacity
                    onPress={simulateIncomingSMS}
                    style={styles.debugButton}
                >
                    <Text style={styles.debugButtonText}>DEBUG: Simulate Incoming SMS</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    onPress={() => {
                        resetRide();
                        router.replace('/');
                    }}
                    style={styles.cancelButton}
                >
                    <Text style={styles.cancelButtonText}>Cancel Ride</Text>
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
        marginBottom: 24,
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#1e293b',
        marginBottom: 8,
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
        marginBottom: 32,
    },
    statusText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 14,
    },
    driverCard: {
        backgroundColor: '#f8fafc',
        padding: 24,
        borderRadius: 12,
        marginBottom: 24,
        borderWidth: 1,
        borderColor: '#e2e8f0',
    },
    driverInfo: {
        marginBottom: 16,
    },
    driverName: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#1e293b',
        marginBottom: 4,
    },
    driverCar: {
        fontSize: 16,
        color: '#64748b',
    },
    driverFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 16,
        paddingTop: 16,
        borderTopWidth: 1,
        borderTopColor: '#e2e8f0',
    },
    eta: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1e293b',
    },
    callButton: {
        backgroundColor: '#22c55e',
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 20,
    },
    callButtonText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 16,
    },
    waitingCard: {
        backgroundColor: '#f8fafc',
        padding: 48,
        borderRadius: 12,
        marginBottom: 24,
        alignItems: 'center',
        justifyContent: 'center',
    },
    waitingText: {
        marginTop: 16,
        color: '#64748b',
        fontSize: 16,
    },
    actions: {
        gap: 16,
    },
    actionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
        borderRadius: 12,
        backgroundColor: '#fff',
        borderWidth: 2,
        borderColor: '#007AFF',
    },
    actionButtonDisabled: {
        backgroundColor: '#f1f5f9',
        borderColor: '#cbd5e1',
    },
    actionButtonText: {
        fontWeight: '600',
        color: '#007AFF',
        fontSize: 16,
    },
    actionButtonTextDisabled: {
        color: '#94a3b8',
    },
    debugButton: {
        padding: 16,
        borderRadius: 12,
        backgroundColor: '#1e293b',
    },
    debugButtonText: {
        color: '#fff',
        textAlign: 'center',
        fontWeight: 'bold',
        fontSize: 16,
    },
    cancelButton: {
        padding: 16,
    },
    cancelButtonText: {
        color: '#ef4444',
        textAlign: 'center',
        fontSize: 16,
    },
});
