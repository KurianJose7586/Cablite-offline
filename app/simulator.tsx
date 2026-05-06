import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, KeyboardAvoidingView, Platform, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ArrowLeft, Send } from 'lucide-react-native';
import io, { Socket } from 'socket.io-client';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://10.0.2.2:3000'; // Default for Android emulator
const SIMULATED_PHONE = '+1234567890'; // Fixed phone for simulator

interface Message {
    id: string;
    text: string;
    sender: 'user' | 'system';
    timestamp: Date;
}

export default function SimulatorScreen() {
    const router = useRouter();
    const [input, setInput] = useState('');
    const [messages, setMessages] = useState<Message[]>([
        {
            id: 'init',
            text: 'CabLite SMS Gateway. Send RIDEREQ|RideID|Lat|Lng|Destination to request a ride.',
            sender: 'system',
            timestamp: new Date()
        }
    ]);
    const [socket, setSocket] = useState<Socket | null>(null);
    const scrollViewRef = useRef<ScrollView>(null);

    useEffect(() => {
        // Connect to Socket.io
        const newSocket = io(API_URL);
        
        newSocket.on('connect', () => {
            console.log('Connected to backend');
            newSocket.emit('register_simulator', { phoneNumber: SIMULATED_PHONE });
        });

        newSocket.on('incoming_sms', (data: { message: string, timestamp: string }) => {
            setMessages(prev => [...prev, {
                id: Math.random().toString(36).substring(7),
                text: data.message,
                sender: 'system',
                timestamp: new Date(data.timestamp)
            }]);
        });

        setSocket(newSocket);

        return () => {
            newSocket.disconnect();
        };
    }, []);

    useEffect(() => {
        // Auto scroll to bottom
        setTimeout(() => {
            scrollViewRef.current?.scrollToEnd({ animated: true });
        }, 100);
    }, [messages]);

    const handleSend = async () => {
        if (!input.trim()) return;

        const messageText = input.trim();
        setInput('');

        // Add user message to UI
        const newUserMsg: Message = {
            id: Math.random().toString(36).substring(7),
            text: messageText,
            sender: 'user',
            timestamp: new Date()
        };
        setMessages(prev => [...prev, newUserMsg]);

        try {
            // Send to webhook directly
            await fetch(`${API_URL}/webhook/sms`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    From: SIMULATED_PHONE,
                    Body: messageText,
                    MessageSid: `sim_${Math.random().toString(36).substring(7)}`
                })
            });
        } catch (error) {
            console.error('Failed to send simulated SMS', error);
            setMessages(prev => [...prev, {
                id: Math.random().toString(36).substring(7),
                text: 'Error: Failed to connect to backend simulation.',
                sender: 'system',
                timestamp: new Date()
            }]);
        }
    };

    return (
        <SafeAreaView className="flex-1 bg-neutral-900">
            <StatusBar barStyle="light-content" />
            
            {/* Header */}
            <View className="flex-row items-center p-4 border-b border-neutral-800 bg-neutral-900">
                <TouchableOpacity onPress={() => router.replace('/welcome')} className="p-2 mr-2">
                    <ArrowLeft color="#fff" size={24} />
                </TouchableOpacity>
                <View>
                    <Text className="text-white text-lg font-bold">CabLite Gateway</Text>
                    <Text className="text-emerald-500 text-xs font-medium">● Connected (Simulation)</Text>
                </View>
            </View>

            {/* Chat Area */}
            <KeyboardAvoidingView 
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                className="flex-1"
            >
                <ScrollView 
                    ref={scrollViewRef}
                    className="flex-1 px-4 py-6"
                    contentContainerStyle={{ paddingBottom: 20 }}
                >
                    {messages.map((msg) => (
                        <View 
                            key={msg.id} 
                            className={`mb-4 max-w-[80%] rounded-lg p-3 ${
                                msg.sender === 'user' 
                                    ? 'bg-emerald-600 self-end rounded-tr-none' 
                                    : 'bg-neutral-800 self-start border border-neutral-700 rounded-tl-none'
                            }`}
                        >
                            <Text className={`text-base ${msg.sender === 'user' ? 'text-white' : 'text-neutral-200'}`}>
                                {msg.text}
                            </Text>
                            <Text className={`text-[10px] mt-1 ${msg.sender === 'user' ? 'text-emerald-200' : 'text-neutral-500'}`}>
                                {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </Text>
                        </View>
                    ))}
                </ScrollView>

                {/* Input Area */}
                <View className="p-4 border-t border-neutral-800 bg-neutral-900 flex-row items-center">
                    <TextInput
                        value={input}
                        onChangeText={setInput}
                        placeholder="Type SMS command (e.g. RIDEREQ|...)"
                        placeholderTextColor="#737373"
                        className="flex-1 bg-neutral-800 text-white border border-neutral-700 rounded-full px-4 py-3 mr-3 font-mono text-sm"
                        autoCapitalize="none"
                        autoCorrect={false}
                    />
                    <TouchableOpacity 
                        onPress={handleSend}
                        disabled={!input.trim()}
                        className={`p-3 rounded-full ${input.trim() ? 'bg-emerald-600' : 'bg-neutral-800'}`}
                    >
                        <Send color={input.trim() ? '#fff' : '#525252'} size={20} />
                    </TouchableOpacity>
                </View>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}
