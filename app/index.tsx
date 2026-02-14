import React, { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useRouter, useSegments } from 'expo-router';
import { useRideStore } from '../store/useRideStore';

export default function InitialRoute() {
    const router = useRouter();
    const segments = useSegments();
    const { hasCompletedOnboarding, userRole } = useRideStore();

    useEffect(() => {
        // Only redirect if we're on the root segment
        const isIndexRoute = segments.length === 0 || (segments.length === 1 && segments[0] === 'index');

        if (isIndexRoute) {
            if (!hasCompletedOnboarding) {
                router.replace('/welcome');
            } else if (userRole === 'passenger') {
                router.replace('/passenger-home');
            } else if (userRole === 'driver') {
                router.replace('/driver-home');
            } else {
                router.replace('/role-selection');
            }
        }
    }, [hasCompletedOnboarding, userRole, segments]);

    return (
        <View style={styles.container}>
            <ActivityIndicator size="large" color="#007AFF" />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
        justifyContent: 'center',
        alignItems: 'center',
    },
});
