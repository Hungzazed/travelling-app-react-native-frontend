import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

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

// Interceptor để xử lý response
api.interceptors.response.use(
  (response) => response
);

export default api;
