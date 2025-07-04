// app/(tabs)/_layout.tsx
import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function TabLayout() {
  const insets = useSafeAreaInsets();
  
  // Calculate platform-specific dimensions
  const tabBarHeight = Platform.OS === 'ios' ? 60 : 56;
  const bottomPadding = Platform.select({
    ios: Math.max(insets.bottom, 4),
    android: Math.max(insets.bottom + 4, 8),
  });

  return (
    <Tabs
      screenOptions={{
        headerShown: false, // Disable headers for tab screens
        tabBarActiveTintColor: '#8d0140',
        tabBarInactiveTintColor: '#999',
        tabBarStyle: {
          backgroundColor: '#fff',
          paddingBottom: bottomPadding,
          height: tabBarHeight + (insets.bottom || 0),
          borderTopWidth: 1,
          borderTopColor: '#e0e0e0',
          ...Platform.select({
            android: {
              elevation: 8,
            },
            ios: {
              shadowColor: '#000',
              shadowOffset: { width: 0, height: -2 },
              shadowOpacity: 0.1,
              shadowRadius: 4,
            },
          }),
        },
        tabBarLabelStyle: {
          fontSize: Platform.select({
            ios: 12,
            android: 11,
          }),
          fontFamily: Platform.select({
            ios: 'System',
            android: 'Roboto',
          }),
        },
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="calendar"
        options={{
          title: 'Calendar',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="calendar-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="insights" 
        options={{
          title: 'Insights', 
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="stats-chart-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person-outline" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
