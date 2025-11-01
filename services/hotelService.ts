import api from './api';

export interface Hotel {
  id: string;
  name: string;
  address: string;
  city: string;
  description?: string;
  rating: number;
  pricePerNight: number;
  amenities: string[];
  images: string[];
  contactInfo?: {
    phone?: string;
    email?: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface GetHotelsParams {
  city?: string;
  name?: string;
  minPrice?: number;
  maxPrice?: number;
  minRating?: number;
  sortBy?: string;
  limit?: number;
  page?: number;
}

export interface HotelsResponse {
  results: Hotel[];
  page: number;
  limit: number;
  totalPages: number;
  totalResults: number;
}

export const getHotels = async (params?: GetHotelsParams): Promise<HotelsResponse> => {
  const response = await api.get('/hotels', { params });
  return response.data;
};

export const getHotelById = async (hotelId: string): Promise<Hotel> => {
  const response = await api.get(`/hotels/${hotelId}`);
  return response.data;
};

export const searchHotels = async (params: GetHotelsParams): Promise<HotelsResponse> => {
  const response = await api.get('/hotels/search', { params });
  return response.data;
};

// Tạo khách sạn mới (admin only)
export const createHotel = async (data: Partial<Hotel>): Promise<Hotel> => {
  try {
    const response = await api.post<Hotel>('/hotels', data);
    return response.data;
  } catch (error: any) {
    if (error.response) {
      throw new Error(error.response.data.message || 'Không thể tạo khách sạn');
    }
    throw new Error('Không thể kết nối đến server');
  }
};

// Cập nhật thông tin khách sạn (admin only)
export const updateHotel = async (hotelId: string, data: Partial<Hotel>): Promise<Hotel> => {
  try {
    const response = await api.patch<Hotel>(`/hotels/${hotelId}`, data);
    return response.data;
  } catch (error: any) {
    if (error.response) {
      throw new Error(error.response.data.message || 'Không thể cập nhật khách sạn');
    }
    throw new Error('Không thể kết nối đến server');
  }
};

// Xóa khách sạn (admin only)
export const deleteHotel = async (hotelId: string): Promise<void> => {
  try {
    await api.delete(`/hotels/${hotelId}`);
  } catch (error: any) {
    if (error.response) {
      throw new Error(error.response.data.message || 'Không thể xóa khách sạn');
    }
    throw new Error('Không thể kết nối đến server');
  }
};
