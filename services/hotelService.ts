import api from './api';
import { CacheService, CacheTTL, createCacheKey } from './cacheService';

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

export const getHotels = async (
  params?: GetHotelsParams,
  onUpdate?: (data: HotelsResponse) => void
): Promise<HotelsResponse> => {
  const cacheKey = createCacheKey.hotels(params);
  
  return CacheService.getWithSWR(
    cacheKey,
    'generic_cache',
    async () => {
      const response = await api.get('/hotels', { params });
      return response.data;
    },
    onUpdate,
    CacheTTL.HOTELS
  );
};

export const getHotelById = async (
  hotelId: string,
  onUpdate?: (data: Hotel) => void
): Promise<Hotel> => {
  const cacheKey = createCacheKey.hotelDetail(hotelId);
  
  return CacheService.getWithSWR(
    cacheKey,
    'generic_cache',
    async () => {
      const response = await api.get(`/hotels/${hotelId}`);
      return response.data;
    },
    onUpdate,
    CacheTTL.HOTEL_DETAIL
  );
};

export const searchHotels = async (
  params: GetHotelsParams,
  onUpdate?: (data: HotelsResponse) => void
): Promise<HotelsResponse> => {
  const cacheKey = createCacheKey.hotels({ ...params, search: true });
  
  return CacheService.getWithSWR(
    cacheKey,
    'generic_cache',
    async () => {
      const response = await api.get('/hotels/search', { params });
      return response.data;
    },
    onUpdate,
    CacheTTL.HOTELS
  );
};

// Tạo khách sạn mới (admin only)
export const createHotel = async (data: Partial<Hotel>): Promise<Hotel> => {
  try {
    const response = await api.post<Hotel>('/hotels', data);
    
    // Invalidate hotels list cache
    await CacheService.invalidatePattern('generic_cache');
    
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
    
    // Invalidate specific hotel cache and all hotels list
    await CacheService.invalidate(createCacheKey.hotelDetail(hotelId), 'generic_cache');
    await CacheService.invalidatePattern('generic_cache');
    
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
    
    // Invalidate specific hotel cache and all hotels list
    await CacheService.invalidate(createCacheKey.hotelDetail(hotelId), 'generic_cache');
    await CacheService.invalidatePattern('generic_cache');
  } catch (error: any) {
    if (error.response) {
      throw new Error(error.response.data.message || 'Không thể xóa khách sạn');
    }
    throw new Error('Không thể kết nối đến server');
  }
};

// Prefetch hotel detail (để tăng performance)
export const prefetchHotelDetail = async (hotelId: string): Promise<void> => {
  const cacheKey = createCacheKey.hotelDetail(hotelId);
  
  await CacheService.prefetch(
    cacheKey,
    'generic_cache',
    async () => {
      const response = await api.get(`/hotels/${hotelId}`);
      return response.data;
    },
    CacheTTL.HOTEL_DETAIL
  );
};
