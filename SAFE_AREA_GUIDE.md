# Safe Area Context Implementation Guide

## ✅ Đã hoàn thành:
1. Root Layout (_layout.tsx) - Wrapped with SafeAreaProvider
2. Home Screen (index.tsx) - Applied SafeAreaView
3. Profile Screen (profile.tsx) - Applied SafeAreaView  
4. Admin Dashboard (index.tsx) - Applied SafeAreaView

## 📋 Hướng dẫn áp dụng cho các trang còn lại:

### Bước 1: Import SafeAreaView
```typescript
import { SafeAreaView } from 'react-native-safe-area-context';
```

### Bước 2: Thay thế View container bằng SafeAreaView
**Trước:**
```tsx
return (
  <View style={styles.container}>
    <StatusBar style="dark" />
    {/* Content */}
  </View>
);
```

**Sau:**
```tsx
return (
  <SafeAreaView style={styles.container} edges={['top']}>
    <StatusBar style="dark" />
    {/* Content */}
  </SafeAreaView>
);
```

### Bước 3: Loại bỏ paddingTop cứng trong styles
**Trước:**
```typescript
header: {
  paddingTop: 60, // ❌ Loại bỏ hoặc giảm xuống
  paddingBottom: 16,
  // ...
}
```

**Sau:**
```typescript
header: {
  paddingTop: 16, // hoặc 0 nếu muốn sát edge
  paddingBottom: 16,
  // ...
}
```

## 🎯 Các edges có thể sử dụng:

- `edges={['top']}` - Safe area ở trên (thường dùng)
- `edges={['bottom']}` - Safe area ở dưới
- `edges={['top', 'bottom']}` - Cả trên và dưới
- `edges={[]}` - Không dùng safe area

## 📝 Danh sách trang cần cập nhật:

### User Tabs:
- [ ] bookings.tsx
- [ ] notifications.tsx
- [ ] services.tsx

### Standalone Pages:
- [ ] login.tsx
- [ ] register.tsx
- [ ] forgot-password.tsx
- [ ] reset-password.tsx
- [ ] tour-detail.tsx
- [ ] hotel-detail.tsx
- [ ] booking-form.tsx
- [ ] all-tours.tsx
- [ ] hotel-selection.tsx
- [ ] tour-hotel-booking.tsx
- [ ] service-selection.tsx
- [ ] notifications.tsx (standalone)
- [ ] profile.tsx (standalone)

### Admin Pages:
- [ ] admin/tours.tsx
- [ ] admin/hotels.tsx
- [ ] admin/services.tsx
- [ ] admin/bookings.tsx
- [ ] admin/users.tsx
- [ ] admin/reviews.tsx
- [ ] admin/analytics.tsx
- [ ] admin/statistics.tsx

## 💡 Tips:

1. **Tab screens**: Luôn dùng `edges={['top']}` vì bottom bar đã được xử lý bởi tab navigator
2. **Modal screens**: Dùng `edges={['top', 'bottom']}` nếu full screen
3. **Screens với custom header**: Dùng `edges={['top']}` và giảm paddingTop trong header style
4. **Screens đã có padding**: Kiểm tra và điều chỉnh paddingTop trong styles

## 🔧 Debugging:

Nếu layout bị lỗi:
1. Kiểm tra xem có 2 paddingTop cộng dồn không (SafeArea + style)
2. Thử thay đổi edges values
3. Kiểm tra parent containers có flex: 1 không
