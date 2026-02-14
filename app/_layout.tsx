import { Stack } from "expo-router";
import "../global.css";

export default function RootLayout() {
    return (
        <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="welcome" />
            <Stack.Screen name="role-selection" />
            <Stack.Screen name="index" />
            <Stack.Screen name="passenger-home" />
            <Stack.Screen name="driver-home" />
            <Stack.Screen name="driver-active-ride" />
            <Stack.Screen name="status" />
            <Stack.Screen name="settings" options={{ presentation: 'modal' }} />
        </Stack>
    );
}
