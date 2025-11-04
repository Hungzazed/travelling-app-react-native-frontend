# SQLite Caching với Stale-While-Revalidate Pattern

## 📖 Tổng quan

Hệ thống caching này sử dụng **SQLite** kết hợp với **Stale-While-Revalidate (SWR)** pattern để tối ưu hiệu suất và trải nghiệm người dùng.

### Cơ chế hoạt động:

1. **Cache Hit** (Fresh):
   - Trả về dữ liệu từ cache ngay lập tức
   - Không cần fetch từ backend

2. **Cache Hit** (Stale):
   - Trả về dữ liệu cached ngay lập tức (fast response)
   - Fetch dữ liệu mới từ backend trong background
   - Cập nhật cache và UI khi có dữ liệu mới

3. **Cache Miss**:
   - Fetch dữ liệu từ backend
   - Lưu vào cache
   - Trả về dữ liệu

## 🏗️ Kiến trúc

```
┌─────────────────────────────────────────────┐
│           User Interface (React Native)      │
└──────────────────┬──────────────────────────┘
                   │
┌──────────────────▼──────────────────────────┐
│    Services (tourService, bookingService)    │
└──────────────────┬──────────────────────────┘
                   │
┌──────────────────▼──────────────────────────┐
│           CacheService (SWR Logic)           │
└──────────────────┬──────────────────────────┘
                   │
┌──────────────────▼──────────────────────────┐
│         Database Layer (SQLite)              │
│  ┌────────┬──────────┬────────────────────┐ │
│  │ Tours  │ Bookings │  Notifications     │ │
│  │ Cache  │  Cache   │     Cache          │ │
│  └────────┴──────────┴────────────────────┘ │
└─────────────────────────────────────────────┘
```

## 📁 File Structure

```
services/
  ├── database.ts          # SQLite initialization & CRUD operations
  ├── cacheService.ts      # Stale-While-Revalidate logic
  ├── tourService.ts       # Tours API với caching
  ├── bookingService.ts    # Bookings API với caching
  ├── notificationService.ts # Notifications API với caching
  └── authService.ts       # Auth với cache clearing on logout
```

## 🚀 Cách sử dụng

### 1. Trong Component - Fetch với Cache

```typescript
import { useState, useEffect } from 'react';
import { getTours } from '../services/tourService';

function ToursScreen() {
  const [tours, setTours] = useState([]);
  
  useEffect(() => {
    loadTours();
  }, []);
  
  const loadTours = async () => {
    // Callback để update UI khi có data mới từ revalidation
    const onUpdate = (freshData) => {
      console.log('📦 Received fresh data from revalidation');
      setTours(freshData.results);
    };
    
    // Sẽ trả về cached data ngay lập tức (nếu có)
    const data = await getTours({ limit: 20 }, onUpdate);
    setTours(data.results);
  };
  
  // ...render UI
}
```

### 2. Invalidate Cache khi Mutation

Cache tự động invalidate khi:
- Create booking → Clear bookings cache
- Update booking → Clear specific booking + list
- Delete booking → Clear all bookings cache
- Mark notification as read → Clear notifications cache

```typescript
// Ví dụ: Sau khi tạo booking
const handleCreateBooking = async (bookingData) => {
  await createBooking(bookingData);
  // Cache đã tự động invalidate, không cần làm gì thêm
  
  // Reload bookings sẽ fetch data mới
  const bookings = await getMyBookings();
  setBookings(bookings.results);
};
```

### 3. Prefetch Data (Tăng performance)

```typescript
import { prefetchTourDetail } from '../services/tourService';

// Prefetch khi user hover/focus vào tour card
const handleTourCardFocus = (tourId) => {
  prefetchTourDetail(tourId); // Không cần await
};
```

## ⚙️ Configuration

### Cache TTL (Time to Live)

Thời gian cache được coi là "fresh" trước khi revalidate:

```typescript
// services/cacheService.ts
export const CacheTTL = {
  TOURS: 5 * 60 * 1000,        // 5 phút
  TOUR_DETAIL: 10 * 60 * 1000, // 10 phút
  BOOKINGS: 1 * 60 * 1000,     // 1 phút
  NOTIFICATIONS: 30 * 1000,    // 30 giây
  USER_PROFILE: 5 * 60 * 1000, // 5 phút
};
```

### Database Tables

- `tours_cache` - Cache cho danh sách tours và tour detail
- `bookings_cache` - Cache cho bookings
- `notifications_cache` - Cache cho notifications
- `generic_cache` - Cache cho các API khác

## 🔧 API Reference

### CacheService

```typescript
// Get data với SWR pattern
CacheService.getWithSWR<T>(
  cacheKey: string,
  table: 'tours_cache' | 'bookings_cache' | 'notifications_cache' | 'generic_cache',
  fetchFn: () => Promise<T>,
  onUpdate?: (data: T) => void,
  ttl?: number
): Promise<T>

// Invalidate single cache
CacheService.invalidate(
  cacheKey: string,
  table: string
): Promise<void>

// Invalidate multiple cache (pattern)
CacheService.invalidatePattern(
  pattern: string,
  table: string
): Promise<void>

// Prefetch data
CacheService.prefetch<T>(
  cacheKey: string,
  table: string,
  fetchFn: () => Promise<T>,
  ttl?: number
): Promise<void>

// Clear all cache (logout)
CacheService.clearAllCache(): Promise<void>

// Clear stale cache (app start)
CacheService.clearStaleCache(): Promise<void>
```

### Cache Key Helpers

```typescript
import { createCacheKey } from '../services/cacheService';

// Tours
createCacheKey.tours({ limit: 20, sortBy: 'createdAt:desc' })
// → "tours:limit:20|sortBy:createdAt:desc"

createCacheKey.tourDetail('tour-id-123')
// → "tour:tour-id-123"

// Bookings
createCacheKey.bookings('user-id', 'pending')
// → "bookings:user-id:pending"

createCacheKey.bookingDetail('booking-id-456')
// → "booking:booking-id-456"

// Notifications
createCacheKey.notifications('user-id', true)
// → "notifications:user-id:unread"

createCacheKey.notificationCount('user-id')
// → "notifications:user-id:count"
```

## 📊 Performance Benefits

### Trước khi có cache:
- **First Load**: 1-3s (API call)
- **Subsequent Loads**: 1-3s (API call mỗi lần)
- **Offline**: ❌ Không hoạt động

### Sau khi có cache:
- **First Load**: 1-3s (API call + cache)
- **Subsequent Loads**: <100ms (từ cache) + background revalidation
- **Stale Cache**: <100ms hiển thị + 1-3s update
- **Offline**: ✅ Hiển thị cached data

## 🧪 Testing

### Test Cache Hit
```typescript
// Lần 1: Fetch từ API
const data1 = await getTours({ limit: 10 });
console.log('📡 Fetched from API');

// Lần 2: Load từ cache (instant)
const data2 = await getTours({ limit: 10 });
console.log('📦 Loaded from cache');
```

### Test Stale-While-Revalidate
```typescript
// 1. Fetch data (TTL = 5 phút)
const tours = await getTours({ limit: 10 });

// 2. Đợi >5 phút (cache becomes stale)
await new Promise(resolve => setTimeout(resolve, 5 * 60 * 1000));

// 3. Fetch lại → trả cache cũ ngay + revalidate background
const toursStale = await getTours(
  { limit: 10 },
  (freshData) => {
    console.log('✅ Got fresh data:', freshData);
  }
);
console.log('📦 Returned stale cache immediately');
```

### Test Cache Invalidation
```typescript
// 1. Load bookings (cached)
const bookings = await getMyBookings();

// 2. Create new booking
await createBooking(bookingData);
// Cache tự động invalidate

// 3. Load lại → fetch từ API (không dùng cache cũ)
const updatedBookings = await getMyBookings();
```

## 🔍 Debugging

Console logs giúp theo dõi cache:

```
📦 Cache HIT for tours:all (stale: false)
❌ Cache MISS for tour:123, fetching from backend...
✅ Cached fresh data for tour:123
🔄 Revalidating stale cache for tours:all...
✅ Revalidated cache for tours:all
🗑️ Invalidated cache for booking:456
🧹 Cleared all stale cache
```

## ⚠️ Lưu ý quan trọng

1. **Không cache search queries**: Search thường thay đổi nhiều, không nên cache
2. **Invalidate sau mutation**: Luôn clear cache sau create/update/delete
3. **TTL phù hợp**: Đặt TTL phù hợp với tần suất cập nhật data
4. **Clear cache on logout**: Đảm bảo clear all cache khi user logout
5. **Background revalidation**: onUpdate callback không bắt buộc nhưng nên có để update UI

## 🎯 Best Practices

✅ **DO:**
- Sử dụng onUpdate callback để update UI khi có data mới
- Prefetch data cho các trang tiếp theo
- Clear stale cache định kỳ (app start)
- Invalidate cache sau mọi mutation

❌ **DON'T:**
- Cache search queries hoặc queries thay đổi liên tục
- Quên invalidate cache sau mutation
- Đặt TTL quá dài cho data thay đổi nhanh
- Dùng cache cho real-time data

## 🔄 Lifecycle

```
App Start
  └─> initDatabase()
      └─> clearStaleCache()

User Login
  └─> Fetch data
      └─> Cache data

User Interaction
  └─> Read from cache (instant)
      └─> Revalidate if stale (background)
          └─> Update UI with fresh data

User Mutation
  └─> Create/Update/Delete
      └─> Invalidate cache
          └─> Next fetch gets fresh data

User Logout
  └─> clearAllCache()
```

## 📚 Resources

- [Stale-While-Revalidate Explained](https://web.dev/stale-while-revalidate/)
- [Expo SQLite Documentation](https://docs.expo.dev/versions/latest/sdk/sqlite/)
- [React Query - Inspiration](https://tanstack.com/query/latest)

---

**Created**: 2025-01-04  
**Version**: 1.0.0  
**Author**: Travel App Team
