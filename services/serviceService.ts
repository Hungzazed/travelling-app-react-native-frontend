import api from './api';

export type ServiceType = 'transport' | 'food' | 'guide' | 'ticket' | 'other';

export interface Service {
  id: string;
  name: string;
  description?: string;
  price: number;
  type: ServiceType;
  createdAt: string;
  updatedAt: string;
}

export interface GetServicesParams {
  type?: ServiceType;
  name?: string;
  minPrice?: number;
  maxPrice?: number;
  sortBy?: string;
  limit?: number;
  page?: number;
}

export interface ServicesResponse {
  results: Service[];
  page: number;
  limit: number;
  totalPages: number;
  totalResults: number;
}

export const getServices = async (params?: GetServicesParams): Promise<ServicesResponse> => {
  try {
    const response = await api.get('/services', { params });
    return response.data;
  } catch (error) {
    console.error('Error fetching services:', error);
    throw error;
  }
};

export const getServiceById = async (id: string): Promise<Service> => {
  try {
    const response = await api.get(`/services/${id}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching service:', error);
    throw error;
  }
};

export const searchServices = async (params: GetServicesParams): Promise<ServicesResponse> => {
  try {
    const response = await api.get('/services/search', { params });
    return response.data;
  } catch (error) {
    console.error('Error searching services:', error);
    throw error;
  }
};

export const getServiceTypeLabel = (type: ServiceType): string => {
  const labels: Record<ServiceType, string> = {
    transport: '🚗 Vận chuyển',
    food: '🍽️ Ăn uống',
    guide: '👨‍🏫 Hướng dẫn viên',
    ticket: '🎫 Vé tham quan',
    other: '📦 Khác',
  };
  return labels[type] || labels.other;
};

export const getServiceTypeIcon = (type: ServiceType): string => {
  const icons: Record<ServiceType, string> = {
    transport: '🚗',
    food: '🍽️',
    guide: '👨‍🏫',
    ticket: '🎫',
    other: '📦',
  };
  return icons[type] || icons.other;
};

// Tạo dịch vụ mới (admin only)
export const createService = async (data: Partial<Service>): Promise<Service> => {
  try {
    const response = await api.post<Service>('/services', data);
    return response.data;
  } catch (error: any) {
    if (error.response) {
      throw new Error(error.response.data.message || 'Không thể tạo dịch vụ');
    }
    throw new Error('Không thể kết nối đến server');
  }
};

// Cập nhật dịch vụ (admin only)
export const updateService = async (serviceId: string, data: Partial<Service>): Promise<Service> => {
  try {
    const response = await api.patch<Service>(`/services/${serviceId}`, data);
    return response.data;
  } catch (error: any) {
    if (error.response) {
      throw new Error(error.response.data.message || 'Không thể cập nhật dịch vụ');
    }
    throw new Error('Không thể kết nối đến server');
  }
};

// Xóa dịch vụ (admin only)
export const deleteService = async (serviceId: string): Promise<void> => {
  try {
    await api.delete(`/services/${serviceId}`);
  } catch (error: any) {
    if (error.response) {
      throw new Error(error.response.data.message || 'Không thể xóa dịch vụ');
    }
    throw new Error('Không thể kết nối đến server');
  }
};
