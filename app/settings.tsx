import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useRideStore } from '../store/useRideStore';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function SettingsScreen() {
    const router = useRouter();
    const { backendNumber, userName, setBackendNumber, setUserName } = useRideStore();
    const [number, setNumber] = useState(backendNumber);
    const [name, setName] = useState(userName);

    const handleSave = () => {
        setBackendNumber(number);
        setUserName(name);
        Alert.alert('Settings Saved');
        router.back();
    };

    return (
        <SafeAreaView style={styles.container}>
            <Text style={styles.title}>Settings</Text>

            <View style={styles.form}>
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

                <TouchableOpacity
                    onPress={handleSave}
                    style={styles.saveButton}
                >
                    <Text style={styles.saveButtonText}>Save Settings</Text>
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
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#1e293b',
        marginBottom: 24,
    },
    form: {
        gap: 16,
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
    saveButton: {
        backgroundColor: '#007AFF',
        padding: 16,
        borderRadius: 12,
        marginTop: 32,
    },
    saveButtonText: {
        color: '#fff',
        textAlign: 'center',
        fontWeight: 'bold',
        fontSize: 18,
    },
});
