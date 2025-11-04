import { CacheDB } from './database';

// Cache TTL configurations (in milliseconds)
export const CacheTTL = {
  TOURS: 5 * 60 * 1000, // 5 phút
  TOUR_DETAIL: 10 * 60 * 1000, // 10 phút
  BOOKINGS: 1 * 60 * 1000, // 1 phút
  NOTIFICATIONS: 30 * 1000, // 30 giây
  USER_PROFILE: 5 * 60 * 1000, // 5 phút
};

// Callback type cho stale-while-revalidate
type FetchCallback<T> = () => Promise<T>;
type UpdateCallback<T> = (data: T) => void;

/**
 * Stale-While-Revalidate Cache Service
 * 
 * Cơ chế hoạt động:
 * 1. Kiểm tra cache có tồn tại không
 * 2. Nếu có cache (kể cả stale):
 *    - Trả về data cached ngay lập tức (fast response)
 *    - Nếu cache stale, fetch data mới từ backend trong background
 *    - Cập nhật cache và gọi callback để update UI
 * 3. Nếu không có cache:
 *    - Fetch data từ backend
 *    - Lưu vào cache
 *    - Trả về data
 */
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
      // 1. Kiểm tra cache
      const cached = await CacheDB.get<T>(table, cacheKey);

      if (cached) {
        // 2. Có cache - trả về ngay
        console.log(`📦 Cache HIT for ${cacheKey} (stale: ${cached.isStale})`);

        // 3. Nếu cache stale, fetch data mới trong background
        if (cached.isStale) {
          console.log(`🔄 Revalidating stale cache for ${cacheKey}...`);
          
          // Background revalidation - không await
          this.revalidate(cacheKey, table, fetchFn, onUpdate, ttl)
            .catch(error => {
              console.error(`Error revalidating cache for ${cacheKey}:`, error);
            });
        }

        return cached.data;
      }

      // 4. Không có cache - fetch từ backend
      console.log(`❌ Cache MISS for ${cacheKey}, fetching from backend...`);
      const freshData = await fetchFn();

      // 5. Lưu vào cache
      await CacheDB.set(table, cacheKey, freshData, ttl);
      console.log(`✅ Cached fresh data for ${cacheKey}`);

      return freshData;
    } catch (error) {
      console.error(`Error in getWithSWR for ${cacheKey}:`, error);
      
      // Fallback: nếu có lỗi, thử lấy cache cũ (kể cả stale)
      const cached = await CacheDB.get<T>(table, cacheKey);
      if (cached) {
        console.log(`⚠️ Using stale cache as fallback for ${cacheKey}`);
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
      // Fetch fresh data
      const freshData = await fetchFn();

      // Update cache
      await CacheDB.set(table, cacheKey, freshData, ttl);
      console.log(`✅ Revalidated cache for ${cacheKey}`);

      // Notify UI to update
      if (onUpdate) {
        onUpdate(freshData);
      }
    } catch (error) {
      console.error(`Error revalidating ${cacheKey}:`, error);
      throw error;
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
      console.log(`🗑️ Invalidated cache for ${cacheKey}`);
    } catch (error) {
      console.error(`Error invalidating cache for ${cacheKey}:`, error);
    }
  },

  /**
   * Invalidate multiple cache keys (dùng pattern matching)
   */
  async invalidatePattern(
    pattern: string,
    table: 'tours_cache' | 'bookings_cache' | 'notifications_cache' | 'generic_cache'
  ): Promise<void> {
    try {
      // Đơn giản hóa: clear toàn bộ table
      // Trong production có thể implement pattern matching phức tạp hơn
      await CacheDB.clear(table);
      console.log(`🗑️ Invalidated all cache in ${table} (pattern: ${pattern})`);
    } catch (error) {
      console.error(`Error invalidating cache pattern ${pattern}:`, error);
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
        console.log(`⏭️ Skip prefetch for ${cacheKey} (cache is fresh)`);
        return;
      }

      // Fetch và cache
      console.log(`⚡ Prefetching ${cacheKey}...`);
      const data = await fetchFn();
      await CacheDB.set(table, cacheKey, data, ttl);
      console.log(`✅ Prefetched and cached ${cacheKey}`);
    } catch (error) {
      console.error(`Error prefetching ${cacheKey}:`, error);
      // Không throw error vì prefetch là optional
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
      console.log('🧹 Cleared all stale cache');
    } catch (error) {
      console.error('Error clearing stale cache:', error);
    }
  },

  /**
   * Clear all cache (khi logout)
   */
  async clearAllCache(): Promise<void> {
    try {
      await CacheDB.clearAll();
      console.log('🗑️ Cleared all cache');
    } catch (error) {
      console.error('Error clearing all cache:', error);
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
};

export default CacheService;
