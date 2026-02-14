import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function WelcomeScreen() {
    const router = useRouter();

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.content}>
                <View style={styles.header}>
                    <Text style={styles.appName}>CabLite</Text>
                    <Text style={styles.subtitle}>Offline-Ready Ride Booking</Text>
                </View>

                <View style={styles.buttonContainer}>
                    <TouchableOpacity
                        onPress={() => router.push('/role-selection')}
                        style={styles.getStartedButton}
                    >
                        <Text style={styles.getStartedText}>Get Started</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
    content: {
        flex: 1,
        padding: 24,
        justifyContent: 'space-between',
    },
    header: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    appName: {
        fontSize: 48,
        fontWeight: 'bold',
        color: '#007AFF',
        marginBottom: 16,
    },
    subtitle: {
        fontSize: 18,
        color: '#64748b',
        textAlign: 'center',
    },
    buttonContainer: {
        paddingBottom: 32,
    },
    getStartedButton: {
        backgroundColor: '#007AFF',
        paddingVertical: 20,
        borderRadius: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
        elevation: 6,
    },
    getStartedText: {
        color: '#fff',
        textAlign: 'center',
        fontSize: 20,
        fontWeight: 'bold',
    },
});
