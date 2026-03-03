import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRideStore } from '../store/useRideStore';
import { User, Car } from 'lucide-react-native';

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
        <SafeAreaView className="flex-1 bg-white">
            <View className="flex-1 p-6">
                <Text className="text-3xl font-bold text-slate-800 mb-2">Select Profile Type</Text>
                <Text className="text-base text-slate-500 mb-8">Choose how you want to use CabLite</Text>

                <View className="gap-5">
                    {/* Passenger Card */}
                    <TouchableOpacity
                        className="bg-white p-6 rounded-[20px] border border-slate-100 shadow-sm"
                        style={{ elevation: 3, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8 }}
                        onPress={() => handleSelectRole('passenger')}
                        activeOpacity={0.7}
                    >
                        <View className="flex-row items-center mb-3">
                            <User size={32} color="#4F46E5" className="mr-3" />
                            <Text className="text-2xl font-bold text-slate-800">Passenger</Text>
                        </View>
                        <Text className="text-base text-slate-500 leading-6 mb-5">
                            Request rides via SMS when internet is unavailable
                        </Text>
                        <View className="bg-primary py-4 rounded-xl">
                            <Text className="text-white text-center text-base font-semibold">Continue as Passenger</Text>
                        </View>
                    </TouchableOpacity>

                    {/* Driver Card */}
                    <TouchableOpacity
                        className="bg-white p-6 rounded-[20px] border border-slate-100 shadow-sm"
                        style={{ elevation: 3, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8 }}
                        onPress={() => handleSelectRole('driver')}
                        activeOpacity={0.7}
                    >
                        <View className="flex-row items-center mb-3">
                            <Car size={32} color="#4F46E5" className="mr-3" />
                            <Text className="text-2xl font-bold text-slate-800">Driver</Text>
                        </View>
                        <Text className="text-base text-slate-500 leading-6 mb-5">
                            Accept nearby ride requests and share live location
                        </Text>
                        <View className="bg-primary py-4 rounded-xl">
                            <Text className="text-white text-center text-base font-semibold">Continue as Driver</Text>
                        </View>
                    </TouchableOpacity>
                </View>
            </View>
        </SafeAreaView>
    );
}
