import api from './api';

export interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  isEmailVerified: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface UsersResponse {
  results: User[];
  page: number;
  limit: number;
  totalPages: number;
  totalResults: number;
}

export interface CreateUserData {
  name: string;
  email: string;
  password: string;
  role?: string;
}

export interface UpdateUserData {
  name?: string;
  email?: string;
  password?: string;
  role?: string;
  isEmailVerified?: boolean;
}

// Lấy danh sách người dùng (admin only)
export const getUsers = async (params?: {
  name?: string;
  role?: string;
  sortBy?: string;
  limit?: number;
  page?: number;
}): Promise<UsersResponse> => {
  try {
    const response = await api.get<UsersResponse>('/users', { params });
    return response.data;
  } catch (error: any) {
    if (error.response) {
      throw new Error(error.response.data.message || 'Không thể tải danh sách người dùng');
    }
    throw new Error('Không thể kết nối đến server');
  }
};

// Lấy thông tin chi tiết một người dùng
export const getUserById = async (userId: string): Promise<User> => {
  try {
    const response = await api.get<User>(`/users/${userId}`);
    return response.data;
  } catch (error: any) {
    if (error.response) {
      throw new Error(error.response.data.message || 'Không thể tải thông tin người dùng');
    }
    throw new Error('Không thể kết nối đến server');
  }
};

// Tạo người dùng mới (admin only)
export const createUser = async (data: CreateUserData): Promise<User> => {
  try {
    const response = await api.post<User>('/users', data);
    return response.data;
  } catch (error: any) {
    if (error.response) {
      throw new Error(error.response.data.message || 'Không thể tạo người dùng');
    }
    throw new Error('Không thể kết nối đến server');
  }
};

// Cập nhật thông tin người dùng (admin only)
export const updateUser = async (userId: string, data: UpdateUserData): Promise<User> => {
  try {
    const response = await api.patch<User>(`/users/${userId}`, data);
    return response.data;
  } catch (error: any) {
    if (error.response) {
      throw new Error(error.response.data.message || 'Không thể cập nhật người dùng');
    }
    throw new Error('Không thể kết nối đến server');
  }
};

// Xóa người dùng (admin only)
export const deleteUser = async (userId: string): Promise<void> => {
  try {
    await api.delete(`/users/${userId}`);
  } catch (error: any) {
    if (error.response) {
      throw new Error(error.response.data.message || 'Không thể xóa người dùng');
    }
    throw new Error('Không thể kết nối đến server');
  }
};
