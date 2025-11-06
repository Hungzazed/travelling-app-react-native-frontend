import api from './api';
import { Tour } from './tourService';
import { CacheService, CacheTTL, createCacheKey } from './cacheService';

export interface Booking {
  id?: string;
  _id?: string;
  userId: string | any;
  tourId: string | Tour | any;
  hotelId?: string | any;
  services?: string[] | any[];
  numberOfPeople: number;
  startDate: string;
  endDate: string;
  totalPrice: number;
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed';
  paymentStatus: 'unpaid' | 'paid' | 'refunded';
  createdAt: string;
  updatedAt: string;
  tour?: any;
  hotel?: any;
  user?: any;
}

export interface CreateBookingData {
  tourId: string;
  hotelId?: string;
  services?: string[];
  numberOfPeople: number;
  startDate: string;
  endDate: string;
  totalPrice: number;
}

export interface GetBookingsParams {
  userId?: string;
  tourId?: string;
  status?: string;
  paymentStatus?: string;
  sortBy?: string;
  limit?: number;
  page?: number;
}

export interface BookingsResponse {
  results: Booking[];
  page: number;
  limit: number;
  totalPages: number;
  totalResults: number;
}

/**
 * Create booking - Invalidate cache sau khi tạo
 */
export const createBooking = async (data: CreateBookingData): Promise<Booking> => {
  const response = await api.post('/bookings', data);
  
  // Invalidate bookings cache
  await CacheService.invalidatePattern('bookings_cache');
  
  return response.data;
};

/**
 * Get my bookings với caching
 */
export const getMyBookings = async (
  params?: GetBookingsParams,
  onUpdate?: (data: BookingsResponse) => void
): Promise<BookingsResponse> => {
  const cacheKey = createCacheKey.bookings(params?.userId, params?.status);
  
  return CacheService.getWithSWR<BookingsResponse>(
    cacheKey,
    'bookings_cache',
    async () => {
      const response = await api.get('/bookings/my-bookings', { params });
      return response.data;
    },
    onUpdate,
    CacheTTL.BOOKINGS
  );
};

/**
 * Get booking by ID với caching
 */
export const getBookingById = async (
  bookingId: string,
  onUpdate?: (data: Booking) => void
): Promise<Booking> => {
  const cacheKey = createCacheKey.bookingDetail(bookingId);
  
  return CacheService.getWithSWR<Booking>(
    cacheKey,
    'bookings_cache',
    async () => {
      const response = await api.get(`/bookings/${bookingId}`);
      return response.data;
    },
    onUpdate,
    CacheTTL.BOOKINGS
  );
};

/**
 * Cancel booking - Invalidate cache
 */
export const cancelBooking = async (bookingId: string): Promise<Booking> => {
  const response = await api.patch(`/bookings/${bookingId}/cancel`);
  
  // Invalidate specific booking and all bookings list
  await CacheService.invalidate(createCacheKey.bookingDetail(bookingId), 'bookings_cache');
  await CacheService.invalidatePattern('bookings_cache');
  
  return response.data;
};

/**
 * Update booking - Invalidate cache
 */
export const updateBooking = async (bookingId: string, data: Partial<CreateBookingData>): Promise<Booking> => {
  const response = await api.patch(`/bookings/${bookingId}`, data);
  
  // Invalidate specific booking and all bookings list
  await CacheService.invalidate(createCacheKey.bookingDetail(bookingId), 'bookings_cache');
  await CacheService.invalidatePattern('bookings_cache');
  
  return response.data;
};

// Admin APIs
/**
 * Get all bookings (Admin) với caching
 */
export const getAllBookings = async (
  params?: GetBookingsParams,
  onUpdate?: (data: BookingsResponse) => void
): Promise<BookingsResponse> => {
  const cacheKey = `admin:${createCacheKey.bookings('admin', params?.status)}`;
  
  return CacheService.getWithSWR<BookingsResponse>(
    cacheKey,
    'bookings_cache',
    async () => {
      const response = await api.get('/bookings', { params });
      return response.data;
    },
    onUpdate,
    CacheTTL.BOOKINGS
  );
};

/**
 * Confirm booking (Admin) - Invalidate cache
 */
export const confirmBooking = async (bookingId: string): Promise<Booking> => {
  const response = await api.patch(`/bookings/${bookingId}/confirm`);
  
  // Invalidate all bookings cache
  await CacheService.invalidate(createCacheKey.bookingDetail(bookingId), 'bookings_cache');
  await CacheService.invalidatePattern('bookings_cache');
  
  return response.data;
};

/**
 * Reject booking (Admin) - Invalidate cache
 */
export const rejectBooking = async (bookingId: string): Promise<Booking> => {
  const response = await api.patch(`/bookings/${bookingId}`, { status: 'cancelled' });
  
  // Invalidate all bookings cache
  await CacheService.invalidate(createCacheKey.bookingDetail(bookingId), 'bookings_cache');
  await CacheService.invalidatePattern('bookings_cache');
  
  return response.data;
};

/**
 * Delete booking (Admin) - Invalidate cache
 */
export const deleteBooking = async (bookingId: string): Promise<void> => {
  await api.delete(`/bookings/${bookingId}`);
  
  // Invalidate all bookings cache
  await CacheService.invalidate(createCacheKey.bookingDetail(bookingId), 'bookings_cache');
  await CacheService.invalidatePattern('bookings_cache');
};
