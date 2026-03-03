import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function WelcomeScreen() {
    const router = useRouter();

    return (
        <SafeAreaView className="flex-1 bg-white">
            <View className="flex-1 p-6 justify-between">
                <View className="flex-1 justify-center items-center">
                    <Text className="text-5xl font-bold text-primary mb-4">CabLite</Text>
                    <Text className="text-lg text-slate-500 text-center">Book a ride — even without internet.</Text>
                </View>

                <View className="pb-8">
                    <TouchableOpacity
                        onPress={() => router.push('/role-selection')}
                        className="bg-primary py-5 rounded-2xl shadow-sm"
                        style={{ elevation: 6, shadowColor: '#4F46E5', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 12 }}
                    >
                        <Text className="text-white text-center text-xl font-bold">Get Started</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </SafeAreaView>
    );
}
