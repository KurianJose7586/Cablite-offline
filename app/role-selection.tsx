import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRideStore } from '../store/useRideStore';

export default function RoleSelectionScreen() {
    const router = useRouter();
    const { setUserRole, setOnboarding } = useRideStore();

    const handleSelectRole = (role: 'passenger' | 'driver') => {
        setUserRole(role);
        setOnboarding(true);

        // Navigate to appropriate home screen
        if (role === 'passenger') {
            router.replace('/');
        } else {
            router.replace('/driver-home');
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.content}>
                <Text style={styles.title}>Select Profile Type</Text>
                <Text style={styles.description}>Choose how you want to use CabLite</Text>

                <View style={styles.cardsContainer}>
                    {/* Passenger Card */}
                    <TouchableOpacity
                        style={styles.card}
                        onPress={() => handleSelectRole('passenger')}
                        activeOpacity={0.7}
                    >
                        <View style={styles.cardHeader}>
                            <Text style={styles.cardIcon}>🚕</Text>
                            <Text style={styles.cardTitle}>Passenger</Text>
                        </View>
                        <Text style={styles.cardDescription}>
                            Request rides via SMS when internet is unavailable
                        </Text>
                        <View style={styles.cardButton}>
                            <Text style={styles.cardButtonText}>Continue as Passenger</Text>
                        </View>
                    </TouchableOpacity>

                    {/* Driver Card */}
                    <TouchableOpacity
                        style={styles.card}
                        onPress={() => handleSelectRole('driver')}
                        activeOpacity={0.7}
                    >
                        <View style={styles.cardHeader}>
                            <Text style={styles.cardIcon}>🚘</Text>
                            <Text style={styles.cardTitle}>Driver</Text>
                        </View>
                        <Text style={styles.cardDescription}>
                            Accept nearby ride requests and share live location
                        </Text>
                        <View style={styles.cardButton}>
                            <Text style={styles.cardButtonText}>Continue as Driver</Text>
                        </View>
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
    },
    title: {
        fontSize: 32,
        fontWeight: 'bold',
        color: '#1e293b',
        marginBottom: 8,
    },
    description: {
        fontSize: 16,
        color: '#64748b',
        marginBottom: 32,
    },
    cardsContainer: {
        gap: 20,
    },
    card: {
        backgroundColor: '#f8fafc',
        borderRadius: 16,
        padding: 24,
        borderWidth: 2,
        borderColor: '#e2e8f0',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
        elevation: 3,
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    cardIcon: {
        fontSize: 32,
        marginRight: 12,
    },
    cardTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#1e293b',
    },
    cardDescription: {
        fontSize: 16,
        color: '#64748b',
        lineHeight: 24,
        marginBottom: 20,
    },
    cardButton: {
        backgroundColor: '#007AFF',
        paddingVertical: 14,
        borderRadius: 10,
    },
    cardButtonText: {
        color: '#fff',
        textAlign: 'center',
        fontSize: 16,
        fontWeight: '600',
    },
});
