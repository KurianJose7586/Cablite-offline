import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { useRideStore } from '../store/useRideStore';
import { SafeAreaView } from 'react-native-safe-area-context';
import { User, Car, Save, Trash2, Repeat, Info } from 'lucide-react-native';

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
                        setTimeout(() => {
                            if (newRole === 'passenger') router.replace('/passenger-home');
                            else router.replace('/driver-home');
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
        <SafeAreaView className="flex-1 bg-slate-50">
            <ScrollView className="px-5 py-2">
                <Text className="text-3xl font-bold text-slate-800 mb-6">Settings</Text>

                {/* Current Role */}
                <View className="mb-6">
                    <Text className="text-lg font-semibold text-slate-800 mb-3">Current Role</Text>
                    <View className="bg-white p-6 rounded-[20px] shadow-sm border border-slate-100" style={{ elevation: 2 }}>
                        <View className="flex-row items-center mb-4">
                            {userRole === 'passenger' ? <User size={28} color="#4F46E5" className="mr-3" /> : <Car size={28} color="#10B981" className="mr-3" />}
                            <Text className="text-xl font-bold text-slate-800">
                                {userRole === 'passenger' ? 'Passenger Mode' : 'Driver Mode'}
                            </Text>
                        </View>
                        <TouchableOpacity
                            onPress={handleSwitchRole}
                            className="bg-primary flex-row items-center justify-center py-4 rounded-xl"
                        >
                            <Repeat size={18} color="#fff" className="mr-2" />
                            <Text className="text-white text-base font-bold">
                                Switch to {userRole === 'passenger' ? 'Driver' : 'Passenger'}
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Configuration */}
                <View className="mb-6">
                    <Text className="text-lg font-semibold text-slate-800 mb-3">Configuration</Text>

                    <Text className="text-base font-semibold text-slate-500 mb-2">Your Name</Text>
                    <TextInput
                        className="bg-white border border-slate-200 p-4 rounded-xl text-base text-slate-800 mb-4"
                        value={name}
                        onChangeText={setName}
                        placeholder="Enter your name"
                        placeholderTextColor="#94a3b8"
                    />

                    <Text className="text-base font-semibold text-slate-500 mb-1">Backend Number (Twilio)</Text>
                    <Text className="text-xs text-slate-400 mb-2">
                        Format: +1234567890 (include country code)
                    </Text>
                    <TextInput
                        className="bg-white border border-slate-200 p-4 rounded-xl text-base text-slate-800 mb-2"
                        value={number}
                        onChangeText={setNumber}
                        placeholder="+1234567890"
                        placeholderTextColor="#94a3b8"
                        keyboardType="phone-pad"
                    />
                </View>

                {/* Update Rate Limits */}
                <View className="mb-8">
                    <Text className="text-lg font-semibold text-slate-800 mb-3">System Information</Text>
                    <View className="bg-blue-50 p-5 rounded-[20px] border border-blue-100 flex-row">
                        <Info size={24} color="#3B82F6" className="mr-3 mt-1" />
                        <View className="flex-1">
                            <Text className="text-sm font-bold text-slate-800 mb-1">Passenger Rules:</Text>
                            <Text className="text-sm text-slate-600 mb-3">• Max 5 location updates per ride{"\n"}• 2 min cooldown</Text>

                            <Text className="text-sm font-bold text-slate-800 mb-1">Driver Rules:</Text>
                            <Text className="text-sm text-slate-600">• GPS sent every 10s{"\n"}• Atomic ride locking</Text>
                        </View>
                    </View>
                </View>

                {/* Actions */}
                <TouchableOpacity
                    onPress={handleSave}
                    className="bg-accent py-5 rounded-2xl flex-row justify-center items-center shadow-sm mb-4"
                    style={{ elevation: 4 }}
                >
                    <Save size={20} color="#fff" className="mr-2" />
                    <Text className="text-white font-bold text-lg">Save Settings</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    onPress={handleResetApp}
                    className="py-5 flex-row justify-center items-center mb-8"
                >
                    <Trash2 size={20} color="#EF4444" className="mr-2" />
                    <Text className="text-danger font-bold text-base">Reset App Data</Text>
                </TouchableOpacity>
            </ScrollView>
        </SafeAreaView>
    );
}
