import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Alert, Linking, ActivityIndicator, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import * as SMS from 'expo-sms';
import { useRideStore, RideStatus } from '../store/useRideStore';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function RideStatusScreen() {
    const router = useRouter();
    const {
        rideId,
        status,
        driverDetails,
        backendNumber,
        updateStatus,
        setDriverDetails,
        resetRide,
        updateCount,
        canSendUpdate,
        incrementUpdateCount
    } = useRideStore();

    const [cooldown, setCooldown] = useState(0);

    // Calculate remaining cooldown
    useEffect(() => {
        const checkCooldown = () => {
            if (!canSendUpdate()) {
                // Set cooldown to 120 seconds (2 minutes)
                setCooldown(120);
                const timer = setInterval(() => {
                    setCooldown((prev) => {
                        if (prev <= 1) {
                            clearInterval(timer);
                            return 0;
                        }
                        return prev - 1;
                    });
                }, 1000);
            }
        };
        checkCooldown();
    }, [updateCount]);

    const getStatusColor = (s: RideStatus) => {
        switch (s) {
            case 'REQUESTED': return '#eab308';
            case 'BROADCASTING': return '#f59e0b';
            case 'ACCEPTED': return '#3b82f6';
            case 'EN_ROUTE': return '#8b5cf6';
            case 'ARRIVED': return '#22c55e';
            case 'COMPLETED': return '#10b981';
            case 'CANCELLED': return '#ef4444';
            default: return '#64748b';
        }
    };

    const getStatusDisplay = (s: RideStatus) => {
        switch (s) {
            case 'BROADCASTING': return 'Searching for Drivers...';
            case 'ACCEPTED': return 'Driver Assigned';
            case 'EN_ROUTE': return 'Driver En Route';
            case 'ARRIVED': return 'Driver Arrived';
            case 'COMPLETED': return 'Trip Completed';
            case 'CANCELLED': return 'Ride Cancelled';
            default: return s;
        }
    };

    const handleCallDriver = () => {
        if (status === 'ACCEPTED' || status === 'EN_ROUTE' || status === 'ARRIVED') {
            Linking.openURL(`tel:${backendNumber}`);
        } else {
            Alert.alert('No Driver', 'Driver is not assigned yet.');
        }
    };

    const handleUpdateLocation = async () => {
        if (!canSendUpdate()) {
            Alert.alert('Update Limit Reached', 'You have reached the maximum number of updates or need to wait for cooldown.');
            return;
        }

        const isAvailable = await SMS.isAvailableAsync();
        if (isAvailable) {
            const message = `UPDATE ${rideId}`;
            const { result } = await SMS.sendSMSAsync(
                [backendNumber],
                message
            );
            if (result === 'sent' || result === 'unknown') {
                incrementUpdateCount();
                Alert.alert('Location Update Sent', 'Your location update has been sent to the driver.');
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
                        updateStatus('ACCEPTED');
                        setDriverDetails({ name: 'John Doe', car: 'Toyota Prius (Red)', eta: '5 mins' });
                    }
                },
                {
                    text: "Driver En Route",
                    onPress: () => updateStatus('EN_ROUTE')
                },
                {
                    text: "Driver Arrived",
                    onPress: () => updateStatus('ARRIVED')
                },
                {
                    text: "Trip Completed",
                    onPress: () => {
                        updateStatus('COMPLETED');
                        setTimeout(() => {
                            resetRide();
                            router.replace('/passenger-home');
                        }, 2000);
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
                <Text style={styles.statusText}>{getStatusDisplay(status)}</Text>
            </View>

            {/* Broadcasting State */}
            {status === 'BROADCASTING' && (
                <View style={styles.broadcastingCard}>
                    <ActivityIndicator size="large" color="#f59e0b" />
                    <Text style={styles.broadcastingText}>Searching for available drivers...</Text>
                    <Text style={styles.broadcastingHint}>This may take a few moments</Text>
                </View>
            )}

            {/* Driver Card */}
            {(status === 'ACCEPTED' || status === 'EN_ROUTE' || status === 'ARRIVED') && driverDetails ? (
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
            ) : status !== 'BROADCASTING' && status !== 'COMPLETED' && status !== 'CANCELLED' && (
                <View style={styles.waitingCard}>
                    <ActivityIndicator size="large" color="#007AFF" />
                    <Text style={styles.waitingText}>Waiting for driver...</Text>
                </View>
            )}

            {/* Actions */}
            <View style={styles.actions}>
                {/* Update Location Button with Anti-Abuse */}
                {status !== 'COMPLETED' && status !== 'CANCELLED' && (
                    <View>
                        <TouchableOpacity
                            onPress={handleUpdateLocation}
                            disabled={!canSendUpdate()}
                            style={[styles.actionButton, !canSendUpdate() && styles.actionButtonDisabled]}
                        >
                            <Text style={[styles.actionButtonText, !canSendUpdate() && styles.actionButtonTextDisabled]}>
                                {cooldown > 0
                                    ? `Update Location (${cooldown}s)`
                                    : '🔄 Request Location Update'}
                            </Text>
                        </TouchableOpacity>
                        <Text style={styles.updateCounter}>
                            Updates: {updateCount}/5 remaining
                        </Text>
                    </View>
                )}

                <TouchableOpacity
                    onPress={simulateIncomingSMS}
                    style={styles.debugButton}
                >
                    <Text style={styles.debugButtonText}>DEBUG: Simulate Incoming SMS</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    onPress={() => {
                        resetRide();
                        router.replace('/passenger-home');
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
    broadcastingCard: {
        backgroundColor: '#fef3c7',
        padding: 48,
        borderRadius: 12,
        marginBottom: 24,
        alignItems: 'center',
        borderWidth: 2,
        borderColor: '#fbbf24',
    },
    broadcastingText: {
        marginTop: 16,
        color: '#f59e0b',
        fontSize: 18,
        fontWeight: '600',
    },
    broadcastingHint: {
        marginTop: 8,
        color: '#92400e',
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
    updateCounter: {
        marginTop: 8,
        fontSize: 12,
        color: '#64748b',
        textAlign: 'center',
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
