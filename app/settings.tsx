import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, StyleSheet, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { useRideStore } from '../store/useRideStore';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function SettingsScreen() {
    const router = useRouter();
    const {
        backendNumber,
        userName,
        userRole,
        setBackendNumber,
        setUserName,
        setUserRole,
        resetApp
    } = useRideStore();

    const [number, setNumber] = useState(backendNumber);
    const [name, setName] = useState(userName);

    const handleSave = () => {
        setBackendNumber(number);
        setUserName(name);
        Alert.alert('Settings Saved');
        router.back();
    };

    const handleSwitchRole = () => {
        const newRole = userRole === 'passenger' ? 'driver' : 'passenger';
        const roleText = newRole === 'passenger' ? 'Passenger' : 'Driver';

        Alert.alert(
            'Switch Role',
            `Are you sure you want to switch to ${roleText} mode?`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Switch',
                    onPress: () => {
                        setUserRole(newRole);
                        Alert.alert('Role Switched', `You are now in ${roleText} mode`);
                        router.back();

                        // Navigate to appropriate home
                        setTimeout(() => {
                            if (newRole === 'passenger') {
                                router.replace('/passenger-home');
                            } else {
                                router.replace('/driver-home');
                            }
                        }, 100);
                    },
                },
            ]
        );
    };

    const handleResetApp = () => {
        Alert.alert(
            'Reset App',
            'This will clear all data and return to onboarding. Are you sure?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Reset',
                    style: 'destructive',
                    onPress: () => {
                        resetApp();
                        router.replace('/welcome');
                    },
                },
            ]
        );
    };

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView>
                <Text style={styles.title}>Settings</Text>

                {/* Current Role */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Current Role</Text>
                    <View style={styles.roleCard}>
                        <Text style={styles.roleText}>
                            {userRole === 'passenger' ? '🚕 Passenger Mode' : '🚘 Driver Mode'}
                        </Text>
                        <TouchableOpacity
                            onPress={handleSwitchRole}
                            style={styles.switchButton}
                        >
                            <Text style={styles.switchButtonText}>
                                Switch to {userRole === 'passenger' ? 'Driver' : 'Passenger'}
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Configuration */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Configuration</Text>

                    <View style={styles.field}>
                        <Text style={styles.label}>One-Way SMS Gateway Number</Text>
                        <TextInput
                            value={number}
                            onChangeText={setNumber}
                            style={styles.input}
                            placeholder="+1234567890"
                            keyboardType="phone-pad"
                        />
                        <Text style={styles.hint}>The Twilio number or backend service number.</Text>
                    </View>

                    <View style={styles.field}>
                        <Text style={styles.label}>Your Name</Text>
                        <TextInput
                            value={name}
                            onChangeText={setName}
                            style={styles.input}
                            placeholder="John Doe"
                        />
                    </View>
                </View>

                {/* Update Rate Limits */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Update Rate Limits</Text>
                    <View style={styles.infoCard}>
                        <Text style={styles.infoLabel}>Passenger:</Text>
                        <Text style={styles.infoText}>• Max 5 location updates per ride</Text>
                        <Text style={styles.infoText}>• 2 minute cooldown between updates</Text>

                        <Text style={[styles.infoLabel, { marginTop: 12 }]}>Driver:</Text>
                        <Text style={styles.infoText}>• GPS sent every 10-15 seconds during ride</Text>
                        <Text style={styles.infoText}>• Cannot accept multiple rides simultaneously</Text>
                    </View>
                </View>

                {/* Actions */}
                <TouchableOpacity
                    onPress={handleSave}
                    style={styles.saveButton}
                >
                    <Text style={styles.saveButtonText}>Save Settings</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    onPress={handleResetApp}
                    style={styles.resetButton}
                >
                    <Text style={styles.resetButtonText}>Reset App</Text>
                </TouchableOpacity>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
        padding: 16,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#1e293b',
        marginBottom: 24,
    },
    section: {
        marginBottom: 24,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#1e293b',
        marginBottom: 12,
    },
    roleCard: {
        backgroundColor: '#f8fafc',
        padding: 20,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#e2e8f0',
    },
    roleText: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#1e293b',
        marginBottom: 12,
    },
    switchButton: {
        backgroundColor: '#007AFF',
        paddingVertical: 12,
        borderRadius: 10,
    },
    switchButtonText: {
        color: '#fff',
        textAlign: 'center',
        fontSize: 16,
        fontWeight: '600',
    },
    field: {
        marginBottom: 16,
    },
    label: {
        color: '#64748b',
        marginBottom: 8,
        fontWeight: '600',
        fontSize: 16,
    },
    input: {
        backgroundColor: '#f8fafc',
        borderWidth: 1,
        borderColor: '#e2e8f0',
        padding: 16,
        borderRadius: 12,
        fontSize: 16,
    },
    hint: {
        color: '#94a3b8',
        fontSize: 12,
        marginTop: 4,
    },
    infoCard: {
        backgroundColor: '#f0fdf4',
        padding: 16,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#bbf7d0',
    },
    infoLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: '#1e293b',
        marginBottom: 4,
    },
    infoText: {
        fontSize: 14,
        color: '#64748b',
        marginLeft: 8,
    },
    saveButton: {
        backgroundColor: '#007AFF',
        padding: 16,
        borderRadius: 12,
        marginTop: 8,
    },
    saveButtonText: {
        color: '#fff',
        textAlign: 'center',
        fontWeight: 'bold',
        fontSize: 18,
    },
    resetButton: {
        padding: 16,
        marginTop: 16,
        marginBottom: 32,
    },
    resetButtonText: {
        color: '#ef4444',
        textAlign: 'center',
        fontSize: 16,
        fontWeight: '600',
    },
});
