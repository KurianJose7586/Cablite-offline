import React from 'react';
import { View, Text, TouchableOpacity, StatusBar } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRideStore } from '../store/useRideStore';

export default function WelcomeScreen() {
    const router = useRouter();
    const { setUserRole, setOnboarding } = useRideStore();

    const handleSelectRole = (role: 'passenger' | 'driver') => {
        setUserRole(role);
        setOnboarding(true);

        if (role === 'passenger') {
            router.replace('/simulator'); // We will create this screen
        } else {
            router.replace('/driver-home');
        }
    };

    return (
        <SafeAreaView className="flex-1 bg-neutral-900">
            <StatusBar barStyle="light-content" />
            <View className="flex-1 px-8 justify-center">
                <View className="mb-16">
                    <Text className="text-white text-5xl font-black tracking-tight mb-2">CAB<Text className="text-emerald-500">LITE</Text></Text>
                    <Text className="text-neutral-400 text-lg font-medium tracking-wide uppercase">System Simulation</Text>
                </View>

                <View className="space-y-6 gap-4">
                    <TouchableOpacity
                        onPress={() => handleSelectRole('driver')}
                        className="bg-neutral-800 border border-neutral-700 p-6 rounded-none active:bg-neutral-700"
                    >
                        <Text className="text-white text-xl font-bold tracking-wide uppercase mb-2">Enter Driver Mode</Text>
                        <Text className="text-neutral-400 text-sm">Access the real-time map interface and accept dispatch broadcasts.</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        onPress={() => handleSelectRole('passenger')}
                        className="bg-emerald-600 p-6 rounded-none active:bg-emerald-700"
                    >
                        <Text className="text-white text-xl font-bold tracking-wide uppercase mb-2">Launch Passenger Simulator</Text>
                        <Text className="text-emerald-100 text-sm">Simulate offline SMS booking flow using the virtual terminal.</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </SafeAreaView>
    );
}
