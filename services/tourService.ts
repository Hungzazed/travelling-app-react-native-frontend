import api from './api';
import { Hotel } from './hotelService';
import { CacheService, CacheTTL, createCacheKey } from './cacheService';

export interface Tour {
  id: string;
  name: string;
  description?: string;
  destination: string;
  duration: string;
  pricePerPerson: number;
  itinerary: {
    day: number;
    activities: string[];
  }[];
  images: string[];
  includedServices: string[];
  hotels: string[] | Hotel[]; // Can be populated
  createdAt: string;
  updatedAt: string;
}

export interface GetToursParams {
  destination?: string;
  name?: string;
  minPrice?: number;
  maxPrice?: number;
  sortBy?: string;
  limit?: number;
  page?: number;
}

export interface ToursResponse {
  results: Tour[];
  page: number;
  limit: number;
  totalPages: number;
  totalResults: number;
}

/**
 * Get tours với caching (Stale-While-Revalidate)
 * @param params - Query parameters
 * @param onUpdate - Callback khi có data mới (để update UI)
 */
export const getTours = async (
  params?: GetToursParams,
  onUpdate?: (data: ToursResponse) => void
): Promise<ToursResponse> => {
  const cacheKey = createCacheKey.tours(params);
  
  return CacheService.getWithSWR<ToursResponse>(
    cacheKey,
    'tours_cache',
    async () => {
      const response = await api.get('/tours', { params });
      return response.data;
    },
    onUpdate,
    CacheTTL.TOURS
  );
};

/**
 * Get tour by ID với caching
 * @param tourId - Tour ID
 * @param onUpdate - Callback khi có data mới
 */
export const getTourById = async (
  tourId: string,
  onUpdate?: (data: Tour) => void
): Promise<Tour> => {
  const cacheKey = createCacheKey.tourDetail(tourId);
  
  return CacheService.getWithSWR<Tour>(
    cacheKey,
    'tours_cache',
    async () => {
      const response = await api.get(`/tours/${tourId}`);
      return response.data;
    },
    onUpdate,
    CacheTTL.TOUR_DETAIL
  );
};

/**
 * Search tours (không cache vì query thường thay đổi)
 */
export const searchTours = async (params: GetToursParams): Promise<ToursResponse> => {
  const response = await api.get('/tours/search', { params });
  return response.data;
};

/**
 * Prefetch tour detail (gọi trước khi user navigate)
 */
export const prefetchTourDetail = async (tourId: string): Promise<void> => {
  const cacheKey = createCacheKey.tourDetail(tourId);
  
  await CacheService.prefetch<Tour>(
    cacheKey,
    'tours_cache',
    async () => {
      const response = await api.get(`/tours/${tourId}`);
      return response.data;
    },
    CacheTTL.TOUR_DETAIL
  );
};
