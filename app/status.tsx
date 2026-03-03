import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, Alert, Linking, ActivityIndicator, Animated } from 'react-native';
import { useRouter } from 'expo-router';
import * as SMS from 'expo-sms';
import { useRideStore, RideStatus } from '../store/useRideStore';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Search, MapPin, CheckCircle, Phone, XCircle, RotateCcw, Crosshair } from 'lucide-react-native';

export default function RideStatusScreen() {
    const router = useRouter();
    const {
        rideId, status, driverDetails, backendNumber, updateStatus,
        setDriverDetails, resetRide, updateCount, canSendUpdate, incrementUpdateCount
    } = useRideStore();

    const [cooldown, setCooldown] = useState(0);
    const pulseAnim = useRef(new Animated.Value(1)).current;

    // Pulse animation securely implemented with native Animated API
    useEffect(() => {
        if (status === 'BROADCASTING') {
            Animated.loop(
                Animated.sequence([
                    Animated.timing(pulseAnim, {
                        toValue: 1.05,
                        duration: 800,
                        useNativeDriver: true,
                    }),
                    Animated.timing(pulseAnim, {
                        toValue: 1,
                        duration: 800,
                        useNativeDriver: true,
                    })
                ])
            ).start();
        } else {
            pulseAnim.setValue(1);
        }
    }, [status]);

    useEffect(() => {
        const checkCooldown = () => {
            if (!canSendUpdate()) {
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

    const getStatusStyle = (s: RideStatus): { bg: string, text: string, border: string } => {
        switch (s) {
            case 'REQUESTED': return { bg: 'bg-yellow-100', text: 'text-yellow-700', border: 'border-yellow-200' };
            case 'BROADCASTING': return { bg: 'bg-amber-100', text: 'text-amber-700', border: 'border-amber-200' };
            case 'ACCEPTED': return { bg: 'bg-indigo-100', text: 'text-indigo-700', border: 'border-indigo-200' };
            case 'EN_ROUTE': return { bg: 'bg-purple-100', text: 'text-purple-700', border: 'border-purple-200' };
            case 'ARRIVED': return { bg: 'bg-emerald-100', text: 'text-emerald-700', border: 'border-emerald-200' };
            case 'COMPLETED': return { bg: 'bg-green-100', text: 'text-green-700', border: 'border-green-200' };
            case 'CANCELLED': return { bg: 'bg-red-100', text: 'text-red-700', border: 'border-red-200' };
            default: return { bg: 'bg-slate-100', text: 'text-slate-700', border: 'border-slate-200' };
        }
    };

    const getStatusText = (s: RideStatus) => {
        switch (s) {
            case 'BROADCASTING': return 'Searching for Drivers';
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

    // Re-implemented SMS update location method:
    const handleUpdateLocationFull = async () => {
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
                { text: "Driver Assigned", onPress: () => { updateStatus('ACCEPTED'); setDriverDetails({ name: 'Jane Driver', car: 'Toyota Prius (Red)', eta: '5 mins' }); } },
                { text: "Driver En Route", onPress: () => updateStatus('EN_ROUTE') },
                { text: "Driver Arrived", onPress: () => updateStatus('ARRIVED') },
                { text: "Trip Completed", onPress: () => { updateStatus('COMPLETED'); setTimeout(() => { resetRide(); router.replace('/passenger-home'); }, 2000); } },
                { text: "Cancel", style: "cancel" }
            ]
        );
    };

    const st = getStatusStyle(status);

    return (
        <SafeAreaView className="flex-1 bg-slate-50 p-5">
            <View className="mb-8 mt-2">
                <Text className="text-3xl font-bold text-slate-800 mb-1">Ride Status</Text>
                <Text className="text-sm font-semibold text-slate-500 tracking-wide uppercase">ID: {rideId}</Text>
            </View>

            {/* Pill Status Badge */}
            <View className={`self-start px-5 py-2.5 rounded-full border mb-8 flex-row items-center ${st.bg} ${st.border}`}>
                {status === 'BROADCASTING' && <Search size={16} color="#B45309" className="mr-2" />}
                {status === 'COMPLETED' && <CheckCircle size={16} color="#15803D" className="mr-2" />}
                {status === 'CANCELLED' && <XCircle size={16} color="#B91C1C" className="mr-2" />}
                {status === 'ACCEPTED' && <CheckCircle size={16} color="#4338CA" className="mr-2" />}
                <Text className={`font-bold text-sm ${st.text}`}>{getStatusText(status)}</Text>
            </View>

            {/* Content Cards */}
            {status === 'BROADCASTING' && (
                <Animated.View style={{ transform: [{ scale: pulseAnim }] }} className="bg-amber-50 p-10 rounded-[24px] mb-8 items-center border border-amber-200 shadow-sm">
                    <ActivityIndicator size="large" color="#F59E0B" />
                    <Text className="mt-6 color-amber-600 text-xl font-bold text-center">Searching for available drivers...</Text>
                    <Text className="mt-2 color-amber-700 text-sm opacity-80">This may take a few moments</Text>
                </Animated.View>
            )}

            {(status === 'ACCEPTED' || status === 'EN_ROUTE' || status === 'ARRIVED') && driverDetails ? (
                <View className="bg-white p-6 rounded-[24px] mb-8 shadow-sm border border-slate-100" style={{ elevation: 2 }}>
                    <Text className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4">Driver Details</Text>
                    <View className="flex-row items-center justify-between mb-2">
                        <Text className="text-2xl font-bold text-slate-800">{driverDetails.name}</Text>
                    </View>
                    <Text className="text-base text-slate-500 mb-6">{driverDetails.car}</Text>
                    <View className="h-px bg-slate-100 mb-5" />
                    <View className="flex-row justify-between items-center">
                        <Text className="text-lg font-bold text-slate-800">ETA: {driverDetails.eta}</Text>
                        <TouchableOpacity onPress={handleCallDriver} className="bg-accent px-5 py-3 rounded-xl flex-row items-center shadow-sm">
                            <Phone size={18} color="#fff" className="mr-2" />
                            <Text className="text-white font-bold text-base">Call</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            ) : status !== 'BROADCASTING' && status !== 'COMPLETED' && status !== 'CANCELLED' && (
                <View className="bg-slate-100 p-12 rounded-[24px] mb-8 items-center justify-center border border-slate-200 border-dashed">
                    <ActivityIndicator size="large" color="#4F46E5" />
                    <Text className="mt-4 text-slate-500 text-base font-semibold">Waiting for updates...</Text>
                </View>
            )}

            {/* Actions */}
            <View className="gap-4 flex-1 justify-end pb-8">
                {status !== 'COMPLETED' && status !== 'CANCELLED' && (
                    <View>
                        <TouchableOpacity
                            onPress={handleUpdateLocationFull}
                            disabled={!canSendUpdate()}
                            className={`flex-row items-center justify-center py-4 rounded-xl border ${canSendUpdate() ? 'bg-white border-primary' : 'bg-slate-100 border-slate-300'}`}
                        >
                            <Crosshair size={18} color={canSendUpdate() ? "#4F46E5" : "#94a3b8"} className="mr-2" />
                            <Text className={`font-bold text-base ${canSendUpdate() ? 'text-primary' : 'text-slate-400'}`}>
                                {cooldown > 0 ? `Update Location (${cooldown}s)` : 'Request Location Update'}
                            </Text>
                        </TouchableOpacity>
                        <Text className="mt-2 text-xs font-semibold text-slate-400 text-center">
                            Updates: {updateCount}/5 remaining
                        </Text>
                    </View>
                )}

                <TouchableOpacity onPress={simulateIncomingSMS} className="py-4 rounded-xl bg-slate-800">
                    <Text className="text-white text-center font-bold text-base">DEBUG: Simulate App SMS</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    onPress={() => { resetRide(); router.replace('/passenger-home'); }}
                    className="py-4"
                >
                    <Text className="text-danger text-center text-base font-bold">Cancel Ride</Text>
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
}
