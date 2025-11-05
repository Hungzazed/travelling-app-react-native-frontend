import { CacheDB } from './database';

export const CacheTTL = {
  TOURS: 300 * 60 * 1000, 
  TOUR_DETAIL: 300 * 60 * 1000, 
  BOOKINGS: 30 * 60 * 1000, 
  NOTIFICATIONS: 30 * 1000, 
  USER_PROFILE: 30 * 60 * 1000,
};

type FetchCallback<T> = () => Promise<T>;
type UpdateCallback<T> = (data: T) => void;

export const CacheService = {
  /**
   * Get data với SWR pattern
   * @param cacheKey - Unique key cho cache
   * @param table - Bảng cache sử dụng
   * @param fetchFn - Function để fetch data từ backend
   * @param onUpdate - Callback khi có data mới (dùng để update UI)
   * @param ttl - Time to live (ms)
   */
  async getWithSWR<T>(
    cacheKey: string,
    table: 'tours_cache' | 'bookings_cache' | 'notifications_cache' | 'generic_cache',
    fetchFn: FetchCallback<T>,
    onUpdate?: UpdateCallback<T>,
    ttl: number = CacheTTL.TOURS
  ): Promise<T> {
    try {
      const cached = await CacheDB.get<T>(table, cacheKey);
      if (cached) {
        if (cached.isStale) {
          this.revalidate(cacheKey, table, fetchFn, onUpdate, ttl)
            .catch(error => {
              console.error(`Error revalidating cache for ${cacheKey}:`, error);
            });
        }
        return cached.data;
      }

      const freshData = await fetchFn();

      await CacheDB.set(table, cacheKey, freshData, ttl);
      return freshData;
    } catch (error) {
      const cached = await CacheDB.get<T>(table, cacheKey);
      if (cached) {
        return cached.data;
      }
      throw error;
    }
  },

  /**
   * Revalidate cache trong background
   */
  async revalidate<T>(
    cacheKey: string,
    table: 'tours_cache' | 'bookings_cache' | 'notifications_cache' | 'generic_cache',
    fetchFn: FetchCallback<T>,
    onUpdate?: UpdateCallback<T>,
    ttl: number = CacheTTL.TOURS
  ): Promise<void> {
    try {
      const freshData = await fetchFn();
      await CacheDB.set(table, cacheKey, freshData, ttl);
      if (onUpdate) {
        onUpdate(freshData);
      }
    } catch (error) {

    }
  },

  /**
   * Invalidate cache (xóa cache khi có mutation)
   * Sử dụng khi: create, update, delete
   */
  async invalidate(
    cacheKey: string,
    table: 'tours_cache' | 'bookings_cache' | 'notifications_cache' | 'generic_cache'
  ): Promise<void> {
    try {
      await CacheDB.delete(table, cacheKey);

    } catch (error) {

    }
  },

  /**
   * Invalidate multiple cache keys (dùng pattern matching)
   */
  async invalidatePattern(
    table: 'tours_cache' | 'bookings_cache' | 'notifications_cache' | 'generic_cache'
  ): Promise<void> {
    try {
      await CacheDB.clear(table);
    } catch (error) {
    }
  },

  /**
   * Prefetch data và lưu vào cache
   * Sử dụng để tăng performance cho các trang tiếp theo
   */
  async prefetch<T>(
    cacheKey: string,
    table: 'tours_cache' | 'bookings_cache' | 'notifications_cache' | 'generic_cache',
    fetchFn: FetchCallback<T>,
    ttl: number = CacheTTL.TOURS
  ): Promise<void> {
    try {
      // Kiểm tra cache đã tồn tại chưa
      const cached = await CacheDB.get<T>(table, cacheKey);
      
      if (cached && !cached.isStale) {
        return;
      }

      const data = await fetchFn();
      await CacheDB.set(table, cacheKey, data, ttl);

    } catch (error) {

    }
  },

  /**
   * Clear stale cache periodically
   * Nên gọi khi app start hoặc định kỳ
   */
  async clearStaleCache(): Promise<void> {
    try {
      await Promise.all([
        CacheDB.clearStale('tours_cache'),
        CacheDB.clearStale('bookings_cache'),
        CacheDB.clearStale('notifications_cache'),
        CacheDB.clearStale('generic_cache'),
      ]);
    } catch (error) {

    }
  },

  /**
   * Clear all cache (khi logout)
   */
  async clearAllCache(): Promise<void> {
    try {
      await CacheDB.clearAll();
    } catch (error) {
    }
  },
};

// Helper function để tạo cache key
export const createCacheKey = {
  tours: (params?: any) => {
    if (!params || Object.keys(params).length === 0) {
      return 'tours:all';
    }
    const sortedParams = Object.keys(params)
      .sort()
      .map(key => `${key}:${params[key]}`)
      .join('|');
    return `tours:${sortedParams}`;
  },
  
  tourDetail: (id: string) => `tour:${id}`,
  
  bookings: (userId?: string, status?: string) => {
    if (status) {
      return `bookings:${userId}:${status}`;
    }
    return `bookings:${userId}:all`;
  },
  
  bookingDetail: (id: string) => `booking:${id}`,
  
  notifications: (userId?: string, unreadOnly?: boolean) => {
    return `notifications:${userId}:${unreadOnly ? 'unread' : 'all'}`;
  },
  
  notificationCount: (userId: string) => `notifications:${userId}:count`,
  
  reviews: (targetType?: string, targetId?: string, rating?: number) => {
    if (targetId) {
      if (rating) {
        return `reviews:${targetType}:${targetId}:rating${rating}`;
      }
      return `reviews:${targetType}:${targetId}`;
    }
    if (targetType) {
      return `reviews:${targetType}:all`;
    }
    return 'reviews:all';
  },
  
  reviewDetail: (id: string) => `review:${id}`,
};

export default CacheService;
