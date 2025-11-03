import { Tabs, useFocusEffect } from "expo-router";
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { useState, useEffect, useCallback } from 'react';
import { getCurrentUser } from '../../services/authService';

export default function TabLayout() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const checkAuth = useCallback(async () => {
    try {
      const user = await getCurrentUser();
      setIsAuthenticated(!!user);
    } catch (error) {
      setIsAuthenticated(false);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  // Kiểm tra lại trạng thái đăng nhập mỗi khi tab được focus
  useFocusEffect(
    useCallback(() => {
      checkAuth();
    }, [checkAuth])
  );

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#2196F3',
        tabBarInactiveTintColor: '#999999',
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopWidth: 1,
          borderTopColor: '#E0E0E0',
          paddingBottom: 8,
          paddingTop: 8,
          height: 65,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.1,
          shadowRadius: 8,
          elevation: 8,
        },
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '500',
          marginTop: 4,
        },
        tabBarIconStyle: {
          marginTop: 4,
        },
      }}
    >
      <Tabs.Screen 
        name="index" 
        options={{ 
          title: "Trang chủ",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons 
              name={focused ? "home" : "home-outline"} 
              size={24} 
              color={color} 
            />
          ),
        }} 
      />
      <Tabs.Screen 
        name="services" 
        options={{ 
          title: "Dịch vụ",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons 
              name={focused ? "grid" : "grid-outline"} 
              size={24} 
              color={color} 
            />
          ),
        }} 
      />
      <Tabs.Screen 
        name="bookings" 
        options={{ 
          title: "Đặt chỗ của tôi",
          tabBarIcon: ({ color, focused }) => (
            <MaterialCommunityIcons 
              name={focused ? "text-box-multiple" : "text-box-multiple-outline"} 
              size={24} 
              color={color} 
            />
          ),
          href: isAuthenticated ? undefined : null, // Ẩn tab nếu chưa đăng nhập
        }} 
      />
      <Tabs.Screen 
        name="notifications" 
        options={{ 
          title: "Thông tin",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons 
              name={focused ? "mail" : "mail-outline"} 
              size={24} 
              color={color} 
            />
          ),
          href: isAuthenticated ? undefined : null, // Ẩn tab nếu chưa đăng nhập
        }} 
      />
      <Tabs.Screen 
        name="profile" 
        options={{ 
          title: "Tài khoản",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons 
              name={focused ? "person" : "person-outline"} 
              size={24} 
              color={color} 
            />
          ),
        }} 
      />
    </Tabs>
  );
}
