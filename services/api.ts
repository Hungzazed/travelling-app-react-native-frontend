import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert } from 'react-native';
import { router } from 'expo-router';

// Cấu hình base URL cho API
const API_BASE_URL = 'https://travel-app-backend-55739a9dcb00.herokuapp.com/v1';

// Tạo instance axios
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000,
});

// Interceptor để thêm token vào header
api.interceptors.request.use(
  async (config) => {
    // Lấy token từ AsyncStorage và thêm vào header
    const token = await AsyncStorage.getItem('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Interceptor để xử lý response và 401 errors
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    // Kiểm tra nếu lỗi 401 (Unauthorized)
    if (error.response && error.response.status === 401) {
      // Xóa token và user data
      await AsyncStorage.removeItem('accessToken');
      await AsyncStorage.removeItem('refreshToken');
      await AsyncStorage.removeItem('user');
      
      // Hiển thị thông báo yêu cầu đăng nhập
      Alert.alert(
        'Phiên đăng nhập hết hạn',
        'Vui lòng đăng nhập lại để tiếp tục sử dụng.',
        [
          {
            text: 'Bỏ qua',
            style: 'cancel',
            onPress: () => {
              // Chuyển về trang chủ chưa đăng nhập
              router.replace('/');
            }
          },
          {
            text: 'Đăng nhập',
            onPress: () => {
              // Chuyển đến trang đăng nhập
              router.replace('/login');
            }
          }
        ]
      );
    }
    
    return Promise.reject(error);
  }
);

export default api;
