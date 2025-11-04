# Cách Update UI Components để sử dụng Cache

## 📝 Example: Update Home Screen (index.tsx)

### Trước khi có cache:

```typescript
const loadData = async () => {
  try {
    setIsLoading(true);
    const userData = await getCurrentUser();
    setUser(userData);
    
    const toursData = await getTours({ limit: 100 });
    setTours(toursData.results);
  } catch (error) {
    console.error('Error loading data:', error);
  } finally {
    setIsLoading(false);
  }
};
```

### Sau khi có cache (với SWR):

```typescript
const loadData = async () => {
  try {
    setIsLoading(true);
    const userData = await getCurrentUser();
    setUser(userData);
    
    // Callback để update UI khi có data mới từ revalidation
    const onUpdate = (freshData: ToursResponse) => {
      console.log('📦 Got fresh tours from revalidation');
      setTours(freshData.results);
      setFilteredTours(freshData.results);
    };
    
    // Trả về cached data ngay (nếu có), fetch mới trong background nếu stale
    const toursData = await getTours({ limit: 100 }, onUpdate);
    setTours(toursData.results);
    setFilteredTours(toursData.results);
  } catch (error) {
    console.error('Error loading data:', error);
  } finally {
    setIsLoading(false);
  }
};
```

## 🔄 Example: Update Bookings Screen

### app/(tabs)/bookings.tsx

```typescript
import { getMyBookings } from '../../services/bookingService';

const BookingsScreen = () => {
  const [bookings, setBookings] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  
  useEffect(() => {
    loadBookings();
  }, []);
  
  const loadBookings = async () => {
    try {
      setIsLoading(true);
      
      // Callback để update UI khi có data mới
      const onUpdate = (freshData) => {
        console.log('📦 Got fresh bookings');
        setBookings(freshData.results);
      };
      
      // Load với cache
      const data = await getMyBookings(
        { sortBy: 'createdAt:desc' },
        onUpdate
      );
      
      setBookings(data.results);
    } catch (error) {
      console.error('Error loading bookings:', error);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Khi cancel booking, cache tự động invalidate
  const handleCancel = async (bookingId) => {
    try {
      await cancelBooking(bookingId);
      // Reload sẽ fetch data mới (cache đã bị invalidate)
      await loadBookings();
    } catch (error) {
      console.error('Error canceling booking:', error);
    }
  };
  
  return (
    // ... UI components
  );
};
```

## 🔔 Example: Update Notifications Screen

### app/(tabs)/notifications.tsx

```typescript
import { getNotifications, markAsRead } from '../../services/notificationService';

const NotificationsScreen = () => {
  const [notifications, setNotifications] = useState([]);
  
  const loadNotifications = async () => {
    try {
      // Callback để update khi có notifications mới
      const onUpdate = (freshData) => {
        console.log('📦 Got fresh notifications');
        setNotifications(freshData.results);
      };
      
      const data = await getNotifications(
        { sortBy: 'createdAt:desc' },
        onUpdate
      );
      
      setNotifications(data.results);
    } catch (error) {
      console.error('Error loading notifications:', error);
    }
  };
  
  const handleMarkAsRead = async (notificationId) => {
    try {
      await markAsRead(notificationId);
      // Cache tự động invalidate, reload để fetch fresh data
      await loadNotifications();
    } catch (error) {
      console.error('Error marking as read:', error);
    }
  };
  
  return (
    // ... UI components
  );
};
```

## 🎫 Example: Update Tour Detail Screen

### app/tour-detail.tsx

```typescript
import { getTourById, prefetchTourDetail } from '../services/tourService';

const TourDetailScreen = () => {
  const { id } = useLocalSearchParams();
  const [tour, setTour] = useState(null);
  
  useEffect(() => {
    loadTourDetail();
  }, [id]);
  
  const loadTourDetail = async () => {
    try {
      // Callback để update khi có data mới
      const onUpdate = (freshTour) => {
        console.log('📦 Got fresh tour detail');
        setTour(freshTour);
      };
      
      const tourData = await getTourById(id as string, onUpdate);
      setTour(tourData);
    } catch (error) {
      console.error('Error loading tour detail:', error);
    }
  };
  
  return (
    // ... UI components
  );
};
```

## 🚀 Example: Prefetch khi scroll

### Prefetch tour detail khi user nhìn thấy tour card

```typescript
import { prefetchTourDetail } from '../services/tourService';

const TourCard = ({ tour }) => {
  const router = useRouter();
  
  // Prefetch khi card xuất hiện trên màn hình
  const handleCardVisible = () => {
    prefetchTourDetail(tour.id);
  };
  
  return (
    <TouchableOpacity
      onPress={() => {
        router.push({
          pathname: '/tour-detail',
          params: { id: tour.id }
        });
      }}
      onLayout={handleCardVisible} // Prefetch khi render
    >
      {/* ... tour card UI */}
    </TouchableOpacity>
  );
};
```

## 📊 Example: Real-time Updates với onUpdate

### Tự động cập nhật UI khi có data mới

```typescript
const [tours, setTours] = useState([]);
const [lastUpdate, setLastUpdate] = useState(null);

const loadTours = async () => {
  const onUpdate = (freshData) => {
    console.log('🔄 Background revalidation completed');
    setTours(freshData.results);
    setLastUpdate(new Date());
    
    // Optional: Hiển thị toast notification
    // Toast.show('Đã cập nhật dữ liệu mới');
  };
  
  const data = await getTours({ limit: 20 }, onUpdate);
  setTours(data.results);
};

// UI hiển thị thời gian update
<Text style={styles.updateTime}>
  Cập nhật lần cuối: {lastUpdate?.toLocaleTimeString()}
</Text>
```

## ⚡ Performance Tips

### 1. Tránh fetch lại khi không cần thiết

```typescript
// ❌ BAD: Fetch mỗi lần focus
useFocusEffect(
  React.useCallback(() => {
    loadTours(); // Fetch lại mỗi lần vào màn hình
  }, [])
);

// ✅ GOOD: Cache tự động handle, chỉ fetch khi thực sự cần
useEffect(() => {
  loadTours(); // Chỉ fetch lần đầu, sau đó dùng cache
}, []);
```

### 2. Sử dụng pull-to-refresh thông minh

```typescript
const onRefresh = async () => {
  setRefreshing(true);
  
  // Force revalidate: invalidate cache trước khi fetch
  await CacheService.invalidatePattern('tours:', 'tours_cache');
  
  // Fetch fresh data
  await loadTours();
  
  setRefreshing(false);
};
```

### 3. Optimistic Updates (Nâng cao)

```typescript
const handleCreateBooking = async (bookingData) => {
  // 1. Update UI optimistically
  const optimisticBooking = {
    ...bookingData,
    id: 'temp-' + Date.now(),
    status: 'pending',
    createdAt: new Date().toISOString(),
  };
  setBookings([optimisticBooking, ...bookings]);
  
  try {
    // 2. Create booking on server
    const newBooking = await createBooking(bookingData);
    
    // 3. Replace optimistic with real data
    setBookings(bookings => 
      bookings.map(b => b.id === optimisticBooking.id ? newBooking : b)
    );
  } catch (error) {
    // 4. Rollback on error
    setBookings(bookings => 
      bookings.filter(b => b.id !== optimisticBooking.id)
    );
    console.error('Error creating booking:', error);
  }
};
```

## 🎯 Migration Checklist

Để migrate từ code cũ sang code có cache:

- [ ] Update import statements (thêm onUpdate parameter)
- [ ] Thêm callback onUpdate vào API calls
- [ ] Remove manual cache invalidation logic (nếu có)
- [ ] Test cache hit/miss với console logs
- [ ] Test cache invalidation sau mutation
- [ ] Test offline behavior
- [ ] Test background revalidation
- [ ] Remove redundant loading states (cache đã instant)

## 🐛 Common Issues

### Issue 1: UI không update sau revalidation

**Problem**: onUpdate callback không được gọi

**Solution**: Đảm bảo truyền callback vào API call

```typescript
// ❌ Missing callback
const data = await getTours({ limit: 10 });

// ✅ With callback
const data = await getTours(
  { limit: 10 },
  (freshData) => setTours(freshData.results)
);
```

### Issue 2: Cache không invalidate sau mutation

**Problem**: Vẫn thấy data cũ sau khi create/update/delete

**Solution**: Services đã tự động invalidate, nhưng cần reload data

```typescript
// ❌ Không reload
await createBooking(data);

// ✅ Reload để fetch fresh data
await createBooking(data);
await loadBookings(); // This will fetch from API (cache invalidated)
```

### Issue 3: Cached data từ user khác (sau logout)

**Problem**: Thấy data của user A sau khi logout và login bằng user B

**Solution**: authService đã tự động clear cache on logout

Nếu vẫn gặp vấn đề, manually clear:
```typescript
import { CacheService } from '../services/cacheService';

const handleLogout = async () => {
  await logout(); // Đã clear cache
  // Optional: Force clear nếu cần
  await CacheService.clearAllCache();
};
```

---

**Happy Caching! 🚀**
