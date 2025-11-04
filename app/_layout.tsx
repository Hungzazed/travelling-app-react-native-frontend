import { Stack } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useEffect } from 'react';
import { initDatabase } from '../services/database';
import { CacheService } from '../services/cacheService';

export default function RootLayout() {
  // Khởi tạo database khi app start
  useEffect(() => {
    const setupDatabase = async () => {
      try {
        await initDatabase();
        // Clear stale cache khi app start
        await CacheService.clearStaleCache();
      } catch (error) {
        console.error('Error setting up database:', error);
      }
    };

    setupDatabase();
  }, []);

  return (
    <SafeAreaProvider>
      <Stack
        screenOptions={{
          headerShown: false,
        }}
      >
      <Stack.Screen 
        name="index" 
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen 
        name="login" 
        options={{
          headerShown: false,
          animation: 'slide_from_right',
        }}
      />
      <Stack.Screen 
        name="register" 
        options={{
          headerShown: false,
          animation: 'slide_from_right',
        }}
      />
      <Stack.Screen 
        name="forgot-password" 
        options={{
          headerShown: false,
          animation: 'slide_from_bottom',
        }}
      />
      <Stack.Screen 
        name="reset-password" 
        options={{
          headerShown: false,
          animation: 'fade',
        }}
      />
      <Stack.Screen 
        name="tour-detail" 
        options={{
          headerShown: false,
          animation: 'slide_from_right',
        }}
      />
      <Stack.Screen 
        name="hotel-detail" 
        options={{
          headerShown: false,
          animation: 'slide_from_right',
        }}
      />
      <Stack.Screen 
        name="booking-form" 
        options={{
          headerShown: false,
          animation: 'slide_from_bottom',
        }}
      />
      <Stack.Screen 
        name="(tabs)" 
        options={{
          headerShown: false,
        }}
      />
    </Stack>
    </SafeAreaProvider>
  );
}
