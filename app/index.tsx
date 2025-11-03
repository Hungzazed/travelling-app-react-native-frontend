import { useEffect, useState } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { isAuthenticated, getCurrentUser } from '../services/authService';

export default function Index() {
  const router = useRouter();
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const authenticated = await isAuthenticated();
      console.log('Index: isAuthenticated =', authenticated);
      
      if (authenticated) {
        // Lấy thông tin user để kiểm tra role
        const user = await getCurrentUser();
        console.log('Index: User role =', user?.role);
        
        if (user?.role === 'admin') {
          // Nếu là admin, chuyển đến trang admin
          console.log('🔑 Admin detected, redirecting to admin dashboard...');
          router.replace('/admin');
        } else {
          // Nếu là user thường, chuyển đến trang tabs
          console.log('👤 User detected, redirecting to tabs...');
          router.replace('/(tabs)');
        }
      } else {
        // Không yêu cầu đăng nhập, cho phép truy cập trang chủ
        console.log('📱 Guest user, redirecting to home...');
        router.replace('/(tabs)');
      }
    } catch (error) {
      console.error('Auth check error:', error);
      // Khi có lỗi, vẫn cho phép truy cập trang chủ
      router.replace('/(tabs)');
    } finally {
      setIsChecking(false);
    }
  };

  // Hiển thị loading screen
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' }}>
      <ActivityIndicator size="large" color="#2196F3" />
    </View>
  );
}
