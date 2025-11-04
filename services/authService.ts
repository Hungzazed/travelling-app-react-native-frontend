import api from './api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CacheService } from './cacheService';

export interface RegisterData {
  name: string;
  email: string;
  password: string;
}

export interface LoginData {
  email: string;
  password: string;
}

export interface AuthResponse {
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
    isEmailVerified: boolean;
  };
  tokens: {
    access: {
      token: string;
      expires: string;
    };
    refresh: {
      token: string;
      expires: string;
    };
  };
}

// Đăng ký tài khoản mới
export const register = async (data: RegisterData): Promise<AuthResponse> => {
  try {
    const response = await api.post<AuthResponse>('/auth/register', data);
    
    // Lưu tokens vào AsyncStorage
    if (response.data.tokens) {
      await AsyncStorage.setItem('accessToken', response.data.tokens.access.token);
      await AsyncStorage.setItem('refreshToken', response.data.tokens.refresh.token);
      await AsyncStorage.setItem('user', JSON.stringify(response.data.user));
    }
    
    return response.data;
  } catch (error: any) {
    if (error.response) {
      throw new Error(error.response.data.message || 'Đăng ký thất bại');
    }
    throw new Error('Không thể kết nối đến server');
  }
};

// Đăng nhập
export const login = async (data: LoginData): Promise<AuthResponse> => {
  try {
    const response = await api.post<AuthResponse>('/auth/login', data);
    
    // Lưu tokens vào AsyncStorage
    if (response.data.tokens) {
      await AsyncStorage.setItem('accessToken', response.data.tokens.access.token);
      await AsyncStorage.setItem('refreshToken', response.data.tokens.refresh.token);
      await AsyncStorage.setItem('user', JSON.stringify(response.data.user));
    }
    
    return response.data;
  } catch (error: any) {
    if (error.response) {
      throw new Error(error.response.data.message || 'Đăng nhập thất bại');
    }
    throw new Error('Không thể kết nối đến server');
  }
};

// Đăng xuất
export const logout = async (): Promise<void> => {
  try {
    console.log('Logout: Getting refresh token...');
    const refreshToken = await AsyncStorage.getItem('refreshToken');
    console.log('Logout: Refresh token:', refreshToken ? 'Found' : 'Not found');
    
    if (refreshToken) {
      console.log('Logout: Calling API...');
      await api.post('/auth/logout', { refreshToken });
      console.log('Logout: API call successful');
    }
  } catch (error) {
    console.error('Logout error:', error);
  } finally {
    console.log('Logout: Removing tokens from AsyncStorage...');
    // Xóa tất cả dữ liệu đã lưu
    await AsyncStorage.removeItem('accessToken');
    await AsyncStorage.removeItem('refreshToken');
    await AsyncStorage.removeItem('user');
    console.log('Logout: Tokens removed successfully');
    
    // Clear all cache khi logout
    console.log('Logout: Clearing all cache...');
    await CacheService.clearAllCache();
    console.log('Logout: Cache cleared successfully');
  }
};

// Kiểm tra xem người dùng đã đăng nhập chưa
export const isAuthenticated = async (): Promise<boolean> => {
  const token = await AsyncStorage.getItem('accessToken');
  return !!token;
};

// Lấy thông tin người dùng hiện tại (từ cache)
export const getCurrentUser = async () => {
  const userStr = await AsyncStorage.getItem('user');
  return userStr ? JSON.parse(userStr) : null;
};

// Lấy thông tin người dùng từ server (luôn lấy dữ liệu mới nhất)
export const fetchCurrentUser = async () => {
  try {
    const response = await api.get('/auth/me');
    // Cập nhật cache
    await AsyncStorage.setItem('user', JSON.stringify(response.data));
    return response.data;
  } catch (error: any) {
    console.error('Error fetching current user:', error);
    // Fallback to cached user if API fails
    return getCurrentUser();
  }
};

// Cập nhật user trong cache (gọi sau khi update profile)
export const updateCachedUser = async (userData: any) => {
  await AsyncStorage.setItem('user', JSON.stringify(userData));
};
