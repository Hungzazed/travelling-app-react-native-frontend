import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  Image,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Dimensions,
  Share,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { getHotelById, Hotel } from '../services/hotelService';

const { width } = Dimensions.get('window');

export default function HotelDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const hotelId = params.id as string;

  const [hotel, setHotel] = useState<Hotel | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [selectedRoomType, setSelectedRoomType] = useState('');
  const [checkInDate, setCheckInDate] = useState('');
  const [checkOutDate, setCheckOutDate] = useState('');
  const [guests, setGuests] = useState(2);

  // Mock data cho các loại phòng
  const roomTypes = [
    { id: '1', name: 'Phòng Standard', price: 800000, available: 5 },
    { id: '2', name: 'Phòng Deluxe', price: 1200000, available: 3 },
    { id: '3', name: 'Phòng Suite', price: 2000000, available: 2 },
    { id: '4', name: 'Phòng VIP', price: 3500000, available: 1 },
  ];

  const facilities = [
    { icon: '🏊', name: 'Bể bơi' },
    { icon: '🍽️', name: 'Nhà hàng' },
    { icon: '💪', name: 'Phòng gym' },
    { icon: '🅿️', name: 'Bãi đỗ xe' },
    { icon: '📶', name: 'WiFi miễn phí' },
    { icon: '🧖', name: 'Spa & Massage' },
    { icon: '🎯', name: 'Trung tâm hội nghị' },
    { icon: '☕', name: 'Quầy bar' },
  ];

  const importantInfo = [
    'Giờ nhận phòng: 14:00 | Trả phòng: 12:00',
    'Trẻ em dưới 6 tuổi được miễn phí khi ở chung với bố mẹ',
    'Cho phép hủy miễn phí trước 24h',
    'Thanh toán khi nhận phòng hoặc trả trước',
    'Yêu cầu đặt cọc khi check-in',
    'Không cho phép hút thuốc trong phòng',
  ];

  useEffect(() => {
    loadHotelDetail();
  }, [hotelId]);

  const loadHotelDetail = async () => {
    try {
      setIsLoading(true);
      const data = await getHotelById(hotelId);
      setHotel(data);
    } catch (error) {
      Alert.alert('Lỗi', 'Không thể tải thông tin khách sạn');
      router.back();
    } finally {
      setIsLoading(false);
    }
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message: `Xem khách sạn tuyệt vời này: ${hotel?.name}\nGiá từ: ${formatPrice(hotel?.pricePerNight || 0)}/đêm`,
      });
    } catch (error) {
      console.error(error);
    }
  };

  const handleBookNow = () => {
    if (!selectedRoomType) {
      Alert.alert('Thông báo', 'Vui lòng chọn loại phòng trước khi đặt');
      return;
    }

    Alert.alert(
      'Xác nhận đặt phòng',
      `Bạn muốn đặt phòng tại "${hotel?.name}"?`,
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Đặt ngay',
          onPress: () => {
            Alert.alert('Thành công', 'Chuyển đến trang đặt phòng...');
          },
        },
      ]
    );
  };

  const formatPrice = (price: number): string => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(price);
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Đang tải thông tin khách sạn...</Text>
      </View>
    );
  }

  if (!hotel) {
    return null;
  }

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      
      {/* Header với Image Slider */}
      <View style={styles.imageContainer}>
        <ScrollView
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onScroll={(e) => {
            const index = Math.round(e.nativeEvent.contentOffset.x / width);
            setActiveImageIndex(index);
          }}
          scrollEventThrottle={16}
        >
          {hotel.images && hotel.images.length > 0 ? (
            hotel.images.map((image, index) => (
              <Image
                key={index}
                source={{ uri: image }}
                style={styles.hotelImage}
                resizeMode="cover"
              />
            ))
          ) : (
            <View style={styles.placeholderImage}>
              <Text style={styles.placeholderText}>🏨</Text>
            </View>
          )}
        </ScrollView>

        {/* Image Indicator */}
        {hotel.images && hotel.images.length > 1 && (
          <View style={styles.imageIndicator}>
            {hotel.images.map((_, index) => (
              <View
                key={index}
                style={[
                  styles.dot,
                  index === activeImageIndex && styles.activeDot,
                ]}
              />
            ))}
          </View>
        )}

        {/* Back Button */}
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>

        {/* Share Button */}
        <TouchableOpacity style={styles.shareButton} onPress={handleShare}>
          <Text style={styles.shareButtonText}>⤴</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Hotel Header */}
        <View style={styles.hotelHeader}>
          <View style={styles.titleRow}>
            <Text style={styles.hotelName}>{hotel.name}</Text>
            <View style={styles.ratingBadge}>
              <Text style={styles.ratingIcon}>⭐</Text>
              <Text style={styles.ratingText}>{hotel.rating.toFixed(1)}</Text>
            </View>
          </View>
          <Text style={styles.hotelCity}>📍 {hotel.city}</Text>
          {hotel.address && (
            <Text style={styles.hotelAddress}>{hotel.address}</Text>
          )}
        </View>

        {/* Price Range */}
        <View style={styles.priceContainer}>
          <View>
            <Text style={styles.priceLabel}>Giá phòng từ</Text>
            <Text style={styles.priceValue}>{formatPrice(hotel.pricePerNight)}</Text>
            <Text style={styles.priceNote}>/ đêm</Text>
          </View>
          <TouchableOpacity style={styles.favoriteButton}>
            <Text style={styles.favoriteIcon}>🤍</Text>
          </TouchableOpacity>
        </View>

        {/* Room Types */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🛏️ Chọn loại phòng</Text>
          {roomTypes.map((room) => (
            <TouchableOpacity
              key={room.id}
              style={[
                styles.roomCard,
                selectedRoomType === room.id && styles.roomCardSelected,
              ]}
              onPress={() => setSelectedRoomType(room.id)}
            >
              <View style={styles.roomInfo}>
                <Text style={styles.roomName}>{room.name}</Text>
                <Text style={styles.roomAvailable}>
                  Còn {room.available} phòng
                </Text>
              </View>
              <View style={styles.roomPriceContainer}>
                <Text style={styles.roomPrice}>{formatPrice(room.price)}</Text>
                <Text style={styles.roomPriceLabel}>/đêm</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* Description */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📝 Mô tả</Text>
          <Text style={styles.description}>
            {hotel.description || 'Khách sạn cao cấp với đầy đủ tiện nghi hiện đại, phục vụ chu đáo, vị trí thuận lợi gần trung tâm thành phố.'}
          </Text>
        </View>

        {/* Facilities */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>✨ Tiện nghi & Dịch vụ</Text>
          <View style={styles.facilitiesGrid}>
            {facilities.map((facility, index) => (
              <View key={index} style={styles.facilityItem}>
                <Text style={styles.facilityIcon}>{facility.icon}</Text>
                <Text style={styles.facilityName}>{facility.name}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Hotel Services from API */}
        {hotel.amenities && hotel.amenities.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>🎯 Dịch vụ khác</Text>
            {hotel.amenities.map((amenity, index) => (
              <View key={index} style={styles.serviceItem}>
                <Text style={styles.serviceIcon}>✓</Text>
                <Text style={styles.serviceText}>{amenity}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Important Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>⚠️ Thông tin quan trọng</Text>
          <View style={styles.infoContainer}>
            {importantInfo.map((info, index) => (
              <View key={index} style={styles.infoItem}>
                <Text style={styles.infoBullet}>•</Text>
                <Text style={styles.infoText}>{info}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Nearby Hotels */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🏨 Khách sạn gần đây</Text>
          <Text style={styles.comingSoon}>Đang cập nhật...</Text>
          
          <View style={styles.nearbyGrid}>
            {[1, 2].map((item) => (
              <TouchableOpacity key={item} style={styles.nearbyCard}>
                <View style={styles.nearbyImage}>
                  <Text style={styles.nearbyPlaceholder}>🏨</Text>
                </View>
                <Text style={styles.nearbyName} numberOfLines={2}>
                  Khách sạn {item}
                </Text>
                <View style={styles.nearbyRating}>
                  <Text style={styles.nearbyRatingIcon}>⭐</Text>
                  <Text style={styles.nearbyRatingText}>4.5</Text>
                </View>
                <Text style={styles.nearbyPrice}>Từ 1.000.000đ</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Bottom Spacing */}
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Fixed Bottom Bar */}
      <View style={styles.bottomBar}>
        <View style={styles.bottomPrice}>
          <Text style={styles.bottomPriceLabel}>Giá từ</Text>
          <Text style={styles.bottomPriceValue}>{formatPrice(hotel.pricePerNight)}</Text>
        </View>
        <TouchableOpacity
          style={styles.bookButton}
          onPress={handleBookNow}
        >
          <Text style={styles.bookButtonText}>Đặt phòng</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
  imageContainer: {
    height: 300,
    backgroundColor: '#f0f0f0',
  },
  hotelImage: {
    width: width,
    height: 300,
  },
  placeholderImage: {
    width: width,
    height: 300,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#E3F2FD',
  },
  placeholderText: {
    fontSize: 60,
  },
  imageIndicator: {
    position: 'absolute',
    bottom: 20,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
    marginHorizontal: 4,
  },
  activeDot: {
    backgroundColor: '#fff',
    width: 24,
  },
  backButton: {
    position: 'absolute',
    top: 50,
    left: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  backButtonText: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
  },
  shareButton: {
    position: 'absolute',
    top: 50,
    right: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  shareButtonText: {
    color: '#fff',
    fontSize: 20,
  },
  content: {
    flex: 1,
  },
  hotelHeader: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  hotelName: {
    flex: 1,
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginRight: 12,
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF3CD',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  ratingIcon: {
    fontSize: 16,
    marginRight: 4,
  },
  ratingText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FF9800',
  },
  hotelCity: {
    fontSize: 16,
    color: '#666',
    marginBottom: 4,
  },
  hotelAddress: {
    fontSize: 14,
    color: '#999',
  },
  priceContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#FFF9E6',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  priceLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  priceValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FF6B35',
  },
  priceNote: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  favoriteButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  favoriteIcon: {
    fontSize: 24,
  },
  section: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 16,
  },
  roomCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#E0E0E0',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  roomCardSelected: {
    borderColor: '#007AFF',
    backgroundColor: '#E3F2FD',
  },
  roomInfo: {
    flex: 1,
  },
  roomName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  roomAvailable: {
    fontSize: 13,
    color: '#4CAF50',
  },
  roomPriceContainer: {
    alignItems: 'flex-end',
  },
  roomPrice: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FF6B35',
  },
  roomPriceLabel: {
    fontSize: 12,
    color: '#666',
  },
  description: {
    fontSize: 15,
    lineHeight: 24,
    color: '#444',
  },
  facilitiesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -8,
  },
  facilityItem: {
    width: '25%',
    alignItems: 'center',
    marginBottom: 20,
    paddingHorizontal: 8,
  },
  facilityIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  facilityName: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  serviceItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  serviceIcon: {
    fontSize: 18,
    color: '#4CAF50',
    marginRight: 12,
    marginTop: 2,
  },
  serviceText: {
    flex: 1,
    fontSize: 15,
    lineHeight: 22,
    color: '#444',
  },
  infoContainer: {
    backgroundColor: '#FFF3CD',
    padding: 16,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#FF9800',
  },
  infoItem: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  infoBullet: {
    fontSize: 16,
    color: '#856404',
    marginRight: 8,
    fontWeight: 'bold',
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
    color: '#856404',
  },
  comingSoon: {
    fontSize: 14,
    color: '#999',
    fontStyle: 'italic',
    marginBottom: 16,
  },
  nearbyGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  nearbyCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    overflow: 'hidden',
  },
  nearbyImage: {
    height: 100,
    backgroundColor: '#E3F2FD',
    justifyContent: 'center',
    alignItems: 'center',
  },
  nearbyPlaceholder: {
    fontSize: 40,
  },
  nearbyName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    padding: 12,
    paddingBottom: 4,
  },
  nearbyRating: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingBottom: 4,
  },
  nearbyRatingIcon: {
    fontSize: 12,
    marginRight: 4,
  },
  nearbyRatingText: {
    fontSize: 12,
    color: '#FF9800',
    fontWeight: '600',
  },
  nearbyPrice: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#FF6B35',
    paddingHorizontal: 12,
    paddingBottom: 12,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 10,
  },
  bottomPrice: {
    flex: 1,
  },
  bottomPriceLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 2,
  },
  bottomPriceValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FF6B35',
  },
  bookButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 12,
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  bookButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
