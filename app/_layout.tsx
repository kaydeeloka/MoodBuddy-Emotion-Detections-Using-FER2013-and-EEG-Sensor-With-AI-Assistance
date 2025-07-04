// app/_layout.tsx
import { Stack } from 'expo-router';
import { Platform } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <Stack
        screenOptions={{
          // Default header styling for screens that show headers
          headerStyle: {
            backgroundColor: '#8d0140',
            ...Platform.select({
              android: {
                elevation: 4,
              },
              ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.25,
                shadowRadius: 3.84,
              },
            }),
          },
          headerTintColor: '#fff',
          headerTitleStyle: {
            fontWeight: 'bold',
            fontSize: 20,
            fontFamily: Platform.select({
              ios: 'System',
              android: 'Roboto',
            }),
          },
          headerTitleAlign: 'center',
        }}
      >
        {/* Screens that need headers */}
        <Stack.Screen name="index" options={{ title: 'Welcome to BuddyAI' }} />
        <Stack.Screen name="login" options={{ title: 'Welcome Back' }} />
        <Stack.Screen name="signup" options={{ title: 'Sign Up' }} />
        <Stack.Screen name="EditUser" options={{ title: 'Edit Profile' }} />
        <Stack.Screen name="eeg-connect" options={{ title: 'EEG Connection' }} />
        <Stack.Screen name="scan-face" options={{ title: 'Face Scanner' }} />
        <Stack.Screen name="scan-result" options={{ title: 'Mood Analysis' }} />
        
        {/* Screens that handle their own UI */}
        <Stack.Screen name="buddyAI" options={{ headerShown: false }} />
        <Stack.Screen 
          name="(tabs)" 
          options={{ 
            headerShown: false,
            // This ensures smooth navigation to tabs
            presentation: 'card',
          }} 
        />
      </Stack>
    </SafeAreaProvider>
  );
}
