import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, Alert, StatusBar, Platform, Keyboard, Animated, Dimensions, Modal, ScrollView as NativeScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ArrowLeft, MapPin, Navigation, XCircle, RefreshCw, Car, Terminal, X } from 'lucide-react-native';
import io, { Socket } from 'socket.io-client';
import * as Location from 'expo-location';
import Constants, { AppOwnership } from 'expo-constants';
import MapView, { Marker } from 'react-native-maps';
import { BlurView } from 'expo-blur';

const isExpoGo = Constants.appOwnership === AppOwnership.Expo;

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://192.168.1.8:3000';
const SIMULATED_PHONE = '+1234567890';
const { height: SCREEN_HEIGHT } = Dimensions.get('window');

type AppState = 'BOOKING' | 'WAITING' | 'CONFIRMED';
type SMSLog = { type: 'OUTGOING' | 'INCOMING'; text: string; time: string };

export default function SimulatorScreen() {
    const router = useRouter();
    
    const [appState, setAppState] = useState<AppState>('BOOKING');
    const [pickup, setPickup] = useState('Fetching location...');
    const [dropoff, setDropoff] = useState('');
    const [locationCoords, setLocationCoords] = useState<{lat: number, lng: number} | null>(null);
    const [rideId, setRideId] = useState<string>('');
    const [driverInfo, setDriverInfo] = useState<string>('');
    const [isUpdating, setIsUpdating] = useState(false);
    
    const [socket, setSocket] = useState<Socket | null>(null);

    // Keyboard & Animation state
    const [keyboardHeight, setKeyboardHeight] = useState(0);
    const [outgoingSMS, setOutgoingSMS] = useState<string | null>(null);
    const smsFadeAnim = useRef(new Animated.Value(0)).current;

    // SMS History State
    const [smsHistory, setSmsHistory] = useState<SMSLog[]>([]);
    const [isHistoryModalVisible, setIsHistoryModalVisible] = useState(false);

    useEffect(() => {
        const keyboardWillShow = Keyboard.addListener(
            Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
            (e) => setKeyboardHeight(e.endCoordinates.height)
        );
        const keyboardWillHide = Keyboard.addListener(
            Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
            () => setKeyboardHeight(0)
        );

        (async () => {
            try {
                // Small delay to prevent OS dialog conflicts
                await new Promise(resolve => setTimeout(resolve, 500));

                let { status: locStatus } = await Location.requestForegroundPermissionsAsync();
                if (locStatus !== 'granted') {
                    setPickup('Times Square (Default)');
                    setLocationCoords({ lat: 40.7580, lng: -73.9855 });
                    return;
                }
                
                try {
                    let loc = await Location.getCurrentPositionAsync({
                        accuracy: Location.Accuracy.Balanced,
                    });
                    setLocationCoords({ lat: loc.coords.latitude, lng: loc.coords.longitude });
                    setPickup(`Current Location (${loc.coords.latitude.toFixed(2)}, ${loc.coords.longitude.toFixed(2)})`);
                } catch (e) {
                    console.error('Error getting current position in simulator:', e);
                    setPickup('Central Station (Default)');
                    setLocationCoords({ lat: 40.7527, lng: -73.9772 });
                }
            } catch (err) {
                console.error('Error in simulator initialization:', err);
            }
        })();

        const newSocket = io(API_URL);
        
        newSocket.on('connect', () => {
            console.log('Connected to backend');
            newSocket.emit('register_simulator', { phoneNumber: SIMULATED_PHONE });
        });

        newSocket.on('incoming_sms', async (data: { message: string, timestamp: string }) => {
            const msg = data.message;
            
            // Log incoming SMS
            setSmsHistory(prev => [...prev, { type: 'INCOMING', text: msg, time: new Date().toLocaleTimeString() }]);

            if (msg.includes('accepted') || msg.includes('on the way')) {
                setAppState('CONFIRMED');
                setDriverInfo('Driver assigned and en route.');
                triggerNotification('Ride Confirmed! 🚕', 'Your driver is on the way.');
            } else if (msg.includes('cancelled')) {
                setAppState('BOOKING');
                triggerNotification('Ride Cancelled', 'Your request has been cancelled.');
                Alert.alert('Ride Cancelled', msg);
            } else if (msg.includes('ETA') || msg.includes('away') || msg.includes('Location updated')) {
                setIsUpdating(false);
                setDriverInfo(msg);
                triggerNotification('Ride Update', msg);
            } else {
                // Mock fallback if other updates are received
                setIsUpdating(false);
                setDriverInfo(msg);
                triggerNotification('CabLite Update', msg);
            }
        });

        setSocket(newSocket);

        return () => {
            keyboardWillShow.remove();
            keyboardWillHide.remove();
            newSocket.disconnect();
        };
    }, []);

    const triggerNotification = (title: string, body: string) => {
        // Fallback to Alert for Expo Go / Simulator
        // This is more stable than expo-notifications in modern Expo Go (SDK 53+)
        console.log(`[Notification] ${title}: ${body}`);
        if (appState !== 'BOOKING') {
          // Only show alerts if we're not in the middle of typing
          // but we'll log it regardless
        }
    };

    const displaySMSOverlay = (payload: string) => {
        setOutgoingSMS(payload);
        
        // Log outgoing SMS
        setSmsHistory(prev => [...prev, { type: 'OUTGOING', text: payload, time: new Date().toLocaleTimeString() }]);

        // Reset animation before starting (in case it was already running)
        smsFadeAnim.setValue(0);
        
        // Extended display time (8 seconds)
        Animated.sequence([
            Animated.timing(smsFadeAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
            Animated.delay(8000),
            Animated.timing(smsFadeAnim, { toValue: 0, duration: 500, useNativeDriver: true })
        ]).start(() => setOutgoingSMS(null));
    };

    const sendSMSPayload = async (bodyText: string) => {
        displaySMSOverlay(bodyText);
        try {
            await fetch(`${API_URL}/webhook/sms`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    From: SIMULATED_PHONE,
                    Body: bodyText,
                    MessageSid: `sim_${Math.random().toString(36).substring(7)}`
                })
            });
        } catch (error) {
            console.error('Failed to send payload', error);
            // We simulate successful send even if network fails for offline feel
            setSmsHistory(prev => [...prev, { type: 'INCOMING', text: 'Simulated Network Error. Ensure backend is running.', time: new Date().toLocaleTimeString() }]);
            setAppState('BOOKING');
        }
    };

    const handleBook = async () => {
        if (!dropoff.trim()) {
            Alert.alert('Error', 'Please enter a dropoff location.');
            return;
        }
        if (!locationCoords) {
            Alert.alert('Error', 'Location not acquired yet.');
            return;
        }

        const newRideId = Math.random().toString(36).substring(7).toUpperCase();
        setRideId(newRideId);
        setAppState('WAITING');

        await triggerNotification('Booking Started 📡', 'Broadcasting ride request via SMS...');

        const payload = `RIDEREQ|${newRideId}|${locationCoords.lat}|${locationCoords.lng}|${dropoff.trim()}`;
        sendSMSPayload(payload);
    };

    const handleCancel = async () => {
        const payload = `CANCEL|${rideId}`;
        sendSMSPayload(payload);
        setAppState('BOOKING');
    };

    const handleUpdate = () => {
        if (!locationCoords) return;
        setIsUpdating(true);
        setDriverInfo('Fetching an update for you...');
        const payload = `UPDATE|${rideId}|${locationCoords.lat}|${locationCoords.lng}`;
        sendSMSPayload(payload);
    };

    return (
        <SafeAreaView className="flex-1 bg-white" edges={['top', 'left', 'right']}>
            <StatusBar barStyle="dark-content" />
            
            {/* SMS Glass Overlay - Clickable */}
            {outgoingSMS && (
                <Animated.View 
                    style={{ opacity: smsFadeAnim, position: 'absolute', top: 50, left: 16, right: 16, zIndex: 100 }}
                >
                    <TouchableOpacity activeOpacity={0.8} onPress={() => setIsHistoryModalVisible(true)}>
                        <BlurView intensity={80} tint="dark" className="p-4 rounded-2xl overflow-hidden border border-white/20 flex-row items-center justify-between">
                            <View className="flex-1">
                                <Text className="text-white font-bold text-xs uppercase mb-1 tracking-widest text-emerald-400">Outgoing SMS</Text>
                                <Text className="text-white font-mono text-sm leading-5">{outgoingSMS}</Text>
                            </View>
                            <Terminal color="#34d399" size={20} className="ml-2" />
                        </BlurView>
                    </TouchableOpacity>
                </Animated.View>
            )}

            {/* SMS History Modal */}
            <Modal
                visible={isHistoryModalVisible}
                animationType="slide"
                presentationStyle="pageSheet"
                onRequestClose={() => setIsHistoryModalVisible(false)}
            >
                <SafeAreaView className="flex-1 bg-gray-900">
                    <View className="flex-row items-center justify-between p-4 border-b border-gray-800">
                        <View className="flex-row items-center">
                            <Terminal color="#34d399" size={24} className="mr-3" />
                            <Text className="text-white text-xl font-bold">SMS Console Log</Text>
                        </View>
                        <TouchableOpacity onPress={() => setIsHistoryModalVisible(false)} className="p-2 bg-gray-800 rounded-full">
                            <X color="#fff" size={20} />
                        </TouchableOpacity>
                    </View>
                    
                    <NativeScrollView className="flex-1 p-4">
                        {smsHistory.length === 0 ? (
                            <Text className="text-gray-500 text-center mt-10 italic">No SMS payloads sent yet.</Text>
                        ) : (
                            smsHistory.map((log, index) => (
                                <View key={index} className={`mb-4 max-w-[85%] ${log.type === 'OUTGOING' ? 'self-end' : 'self-start'}`}>
                                    <Text className="text-xs text-gray-500 mb-1 px-1">
                                        {log.type === 'OUTGOING' ? 'To: CabLite Gateway' : 'From: CabLite Gateway'} • {log.time}
                                    </Text>
                                    <View className={`p-3 rounded-2xl ${log.type === 'OUTGOING' ? 'bg-emerald-600 rounded-tr-sm' : 'bg-gray-800 rounded-tl-sm border border-gray-700'}`}>
                                        <Text className={`font-mono text-sm ${log.type === 'OUTGOING' ? 'text-white' : 'text-emerald-400'}`}>
                                            {log.text}
                                        </Text>
                                    </View>
                                </View>
                            ))
                        )}
                        <View className="h-10" />
                    </NativeScrollView>
                </SafeAreaView>
            </Modal>

            {/* Header */}
            <View className="flex-row items-center p-4 border-b border-gray-200 bg-white z-10">
                <TouchableOpacity onPress={() => router.replace('/welcome')} className="p-2 mr-2">
                    <ArrowLeft color="#000" size={24} />
                </TouchableOpacity>
                <View>
                    <Text className="text-black text-xl font-bold tracking-tight">Cab<Text className="text-emerald-600">Lite</Text></Text>
                </View>
                <TouchableOpacity onPress={() => setIsHistoryModalVisible(true)} className="ml-auto p-2">
                    <Terminal color="#059669" size={20} />
                </TouchableOpacity>
            </View>

            {/* Welcome Banner */}
            {appState === 'BOOKING' && (
                <View className="bg-emerald-50 p-4 items-center justify-center border-b border-emerald-100 z-10">
                    <Text className="text-emerald-800 font-bold text-base mb-1">Welcome to CabLite! 👋</Text>
                    <Text className="text-emerald-600 text-center px-4 text-xs">No network? No problem. Book via SMS.</Text>
                </View>
            )}

            {/* Map Area */}
            <View className="flex-1 relative">
                {locationCoords ? (
                    <MapView 
                        style={{ flex: 1 }}
                        initialRegion={{
                            latitude: locationCoords.lat,
                            longitude: locationCoords.lng,
                            latitudeDelta: 0.05,
                            longitudeDelta: 0.05,
                        }}
                    >
                        <Marker coordinate={{ latitude: locationCoords.lat, longitude: locationCoords.lng }} />
                    </MapView>
                ) : (
                    <View className="flex-1 bg-gray-100 items-center justify-center">
                        <ActivityIndicator color="#059669" />
                        <Text className="text-gray-400 mt-2">Loading Map...</Text>
                    </View>
                )}
            </View>

            {/* Bottom UI */}
            <Animated.View 
                className="bg-white p-6 shadow-2xl border-t border-gray-200" 
                style={{ 
                    paddingBottom: Platform.OS === 'ios' ? 40 : 20,
                    marginBottom: keyboardHeight 
                }}
            >
                {appState === 'BOOKING' && (
                    <View>
                        <Text className="text-xl font-bold mb-4">Where to?</Text>
                        
                        <View className="relative mb-6">
                            <View className="absolute left-[11px] top-5 bottom-5 w-0.5 bg-gray-300" />
                            
                            <View className="flex-row items-center mb-4">
                                <View className="w-6 h-6 rounded-full bg-blue-100 items-center justify-center mr-3 z-10">
                                    <View className="w-2 h-2 rounded-full bg-blue-600" />
                                </View>
                                <TextInput
                                    value={pickup}
                                    editable={false}
                                    className="flex-1 bg-gray-100 text-gray-600 rounded-lg px-4 py-3 font-medium"
                                />
                            </View>

                            <View className="flex-row items-center">
                                <View className="w-6 h-6 rounded-full bg-emerald-100 items-center justify-center mr-3 z-10">
                                    <MapPin color="#059669" size={12} />
                                </View>
                                <TextInput
                                    value={dropoff}
                                    onChangeText={setDropoff}
                                    placeholder="Enter dropoff location"
                                    placeholderTextColor="#9CA3AF"
                                    className="flex-1 bg-gray-100 text-black rounded-lg px-4 py-3 font-medium border border-gray-200"
                                    autoCapitalize="words"
                                />
                            </View>
                        </View>

                        <TouchableOpacity 
                            onPress={handleBook}
                            className="bg-black py-4 rounded-xl flex-row justify-center items-center"
                        >
                            <Text className="text-white text-lg font-bold mr-2">Book Offline Ride</Text>
                            <Navigation color="#fff" size={18} />
                        </TouchableOpacity>
                    </View>
                )}

                {appState === 'WAITING' && (
                    <View className="items-center py-4">
                        <ActivityIndicator size="large" color="#059669" className="mb-4" />
                        <Text className="text-xl font-bold mb-2">Finding your driver</Text>
                        <Text className="text-gray-500 text-center px-4">Broadcasting your request to nearby drivers via SMS Gateway...</Text>
                        
                        <TouchableOpacity 
                            onPress={handleCancel}
                            className="mt-6 py-3 px-6 rounded-full border border-red-200 bg-red-50"
                        >
                            <Text className="text-red-600 font-bold">Cancel Request</Text>
                        </TouchableOpacity>
                    </View>
                )}

                {appState === 'CONFIRMED' && (
                    <View>
                        <View className="flex-row justify-between items-center mb-6 border-b border-gray-100 pb-4">
                            <View className="flex-1 mr-4">
                                <Text className="text-emerald-600 font-bold uppercase tracking-wider text-xs mb-1">Ride Confirmed</Text>
                                <Text className="text-xl font-black text-black leading-6">{driverInfo}</Text>
                            </View>
                            <View className="bg-gray-100 p-3 rounded-full">
                                <Car color="#000" size={24} />
                            </View>
                        </View>

                        <View className="flex-row gap-4">
                            <TouchableOpacity 
                                onPress={handleCancel}
                                disabled={isUpdating}
                                className="flex-1 py-4 rounded-xl bg-gray-100 flex-row justify-center items-center opacity-90"
                            >
                                <XCircle color="#ef4444" size={18} className="mr-2" />
                                <Text className="text-red-500 font-bold">Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity 
                                onPress={handleUpdate}
                                disabled={isUpdating}
                                className="flex-1 py-4 rounded-xl bg-black flex-row justify-center items-center"
                            >
                                {isUpdating ? (
                                    <ActivityIndicator color="#fff" size="small" />
                                ) : (
                                    <>
                                        <RefreshCw color="#fff" size={18} className="mr-2" />
                                        <Text className="text-white font-bold">Get Update</Text>
                                    </>
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>
                )}
            </Animated.View>
        </SafeAreaView>
    );
}
