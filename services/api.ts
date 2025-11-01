import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Cấu hình base URL cho API
const API_BASE_URL = 'http://localhost:3000/v1';

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
  (response) => response,
  (error) => {
    try {
      if (error && error.response) {
        // Server trả về lỗi
        const { status, data } = error.response;
        const msg = (data && (data.message || (typeof data === 'string' ? data : JSON.stringify(data)))) || 'Unknown error';
        console.error(`API Error [${status}]: ${msg}`);
      } else if (error && error.request) {
        // Request được gửi nhưng không nhận được response
        console.error('Network Error:', String(error.message));
      } else {
        // Lỗi khác
        console.error('Error:', String(error && error.message));
      }
    } catch (logErr) {
      // Ensure logging never throws
      try {
        console.error('Logging failure in API interceptor', String(logErr));
      } catch (_e) {
        // swallow
      }
    }
    return Promise.reject(error);
  }
);

export default api;
