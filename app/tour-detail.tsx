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
import { getTourById, getTours, Tour } from '../services/tourService';

const { width } = Dimensions.get('window');

export default function TourDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const tourId = params.id as string;

  const [tour, setTour] = useState<Tour | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [relatedTours, setRelatedTours] = useState<Tour[]>([]);
  const [loadingRelated, setLoadingRelated] = useState(false);

  const additionalInfo = [
    { icon: '✈️', title: 'Phương tiện', content: 'Máy bay + Xe du lịch đời mới' },
    { icon: '🏨', title: 'Khách sạn', content: '3-4 sao tiêu chuẩn' },
    { icon: '🍽️', title: 'Ăn uống', content: 'Buffet sáng + Các bữa theo chương trình' },
    { icon: '👨‍✈️', title: 'Hướng dẫn viên', content: 'Tiếng Việt nhiệt tình, kinh nghiệm' },
  ];

  const importantNotes = [
    'Vui lòng mang theo CMND/CCCD bản gốc',
    'Trẻ em dưới 5 tuổi được miễn phí vé (không có ghế ngồi riêng)',
    'Giá tour có thể thay đổi theo mùa cao điểm',
    'Vui lòng đặt cọc 50% để giữ chỗ',
    'Có thể hủy tour trước 7 ngày và hoàn lại 70% tiền cọc',
    'Mang theo quần áo phù hợp với thời tiết địa phương',
  ];

  useEffect(() => {
    loadTourDetail();
  }, [tourId]);

  const loadTourDetail = async () => {
    try {
      setIsLoading(true);
      const data = await getTourById(tourId);
      setTour(data);
      
      // Load related tours based on same destination
      loadRelatedTours(data.destination);
    } catch (error) {
      Alert.alert('Lỗi', 'Không thể tải thông tin tour');
      router.back();
    } finally {
      setIsLoading(false);
    }
  };

  const loadRelatedTours = async (destination: string) => {
    try {
      setLoadingRelated(true);
      const response = await getTours({ 
        destination, 
        limit: 4,
        sortBy: 'createdAt:desc'
      });
      // Filter out current tour
      const filtered = response.results.filter(t => t.id !== tourId);
      setRelatedTours(filtered.slice(0, 3));
    } catch (error) {
      console.error('Error loading related tours:', error);
    } finally {
      setLoadingRelated(false);
    }
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message: `Xem tour tuyệt vời này: ${tour?.name}\nGiá: ${formatPrice(tour?.pricePerPerson || 0)}/người`,
      });
    } catch (error) {
      console.error(error);
    }
  };

  const handleBookNow = async () => {
    if (!tour) return;

    // Navigate to booking form
    router.push({
      pathname: '/booking-form' as any,
      params: {
        tourId: tour.id,
      },
    });
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
        <Text style={styles.loadingText}>Đang tải thông tin tour...</Text>
      </View>
    );
  }

  if (!tour) {
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
          {tour.images && tour.images.length > 0 ? (
            tour.images.map((image, index) => (
              <Image
                key={index}
                source={{ uri: image }}
                style={styles.tourImage}
                resizeMode="cover"
              />
            ))
          ) : (
            <View style={styles.placeholderImage}>
              <Text style={styles.placeholderText}>📸</Text>
            </View>
          )}
        </ScrollView>

        {/* Image Indicator */}
        {tour.images && tour.images.length > 1 && (
          <View style={styles.imageIndicator}>
            {tour.images.map((_, index) => (
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
        {/* Tour Header */}
        <View style={styles.tourHeader}>
          <Text style={styles.tourName}>{tour.name}</Text>
          <View style={styles.tourMeta}>
            <View style={styles.metaItem}>
              <Text style={styles.metaIcon}>📍</Text>
              <Text style={styles.metaText}>{tour.destination}</Text>
            </View>
            <View style={styles.metaItem}>
              <Text style={styles.metaIcon}>⏱️</Text>
              <Text style={styles.metaText}>{tour.duration}</Text>
            </View>
          </View>
        </View>

        {/* Price */}
        <View style={styles.priceContainer}>
          <View>
            <Text style={styles.priceLabel}>Giá tour</Text>
            <Text style={styles.priceValue}>{formatPrice(tour.pricePerPerson)}</Text>
            <Text style={styles.priceNote}>/ người</Text>
          </View>
          <TouchableOpacity style={styles.favoriteButton}>
            <Text style={styles.favoriteIcon}>🤍</Text>
          </TouchableOpacity>
        </View>

        {/* Mô tả tour */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📝 Giới thiệu</Text>
          <Text style={styles.description}>{tour.description || 'Chưa có mô tả'}</Text>
        </View>

        {/* Lịch trình tour */}
        {tour.itinerary && tour.itinerary.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>🗺️ Lịch trình chi tiết</Text>
            {tour.itinerary.map((day, index) => (
              <View key={index} style={styles.itineraryDay}>
                <View style={styles.dayHeader}>
                  <View style={styles.dayBadge}>
                    <Text style={styles.dayNumber}>Ngày {day.day}</Text>
                  </View>
                </View>
                {day.activities.map((activity, actIndex) => (
                  <View key={actIndex} style={styles.activityItem}>
                    <View style={styles.activityDot} />
                    <Text style={styles.activityText}>{activity}</Text>
                  </View>
                ))}
              </View>
            ))}
          </View>
        )}

        {/* Dịch vụ bao gồm */}
        {tour.includedServices && tour.includedServices.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>✅ Dịch vụ bao gồm</Text>
            {tour.includedServices.map((service, index) => (
              <View key={index} style={styles.serviceItem}>
                <Text style={styles.serviceIcon}>✓</Text>
                <Text style={styles.serviceText}>{service}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Thông tin thêm */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>ℹ️ Thông tin thêm về chuyến đi</Text>
          {additionalInfo.map((info, index) => (
            <View key={index} style={styles.infoCard}>
              <Text style={styles.infoIcon}>{info.icon}</Text>
              <View style={styles.infoContent}>
                <Text style={styles.infoTitle}>{info.title}</Text>
                <Text style={styles.infoText}>{info.content}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* Lưu ý quan trọng */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>⚠️ Những thông tin cần lưu ý</Text>
          <View style={styles.notesContainer}>
            {importantNotes.map((note, index) => (
              <View key={index} style={styles.noteItem}>
                <Text style={styles.noteBullet}>•</Text>
                <Text style={styles.noteText}>{note}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Các chương trình khác */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🎯 CÁC CHƯƠNG TRÌNH KHÁC</Text>
          
          {loadingRelated ? (
            <View style={styles.loadingRelated}>
              <ActivityIndicator size="small" color="#007AFF" />
              <Text style={styles.loadingRelatedText}>Đang tải...</Text>
            </View>
          ) : relatedTours.length > 0 ? (
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.relatedToursScroll}
            >
              {relatedTours.map((relatedTour) => (
                <TouchableOpacity 
                  key={relatedTour.id} 
                  style={styles.relatedTourCard}
                  onPress={() => router.push({ pathname: '/tour-detail' as any, params: { id: relatedTour.id } })}
                >
                  {relatedTour.images && relatedTour.images.length > 0 ? (
                    <Image
                      source={{ uri: relatedTour.images[0] }}
                      style={styles.relatedTourImage}
                      resizeMode="cover"
                    />
                  ) : (
                    <View style={styles.relatedTourImagePlaceholder}>
                      <Text style={styles.relatedTourPlaceholder}>🏖️</Text>
                    </View>
                  )}
                  
                  <View style={styles.relatedTourBadge}>
                    <Text style={styles.relatedTourBadgeText}>{relatedTour.duration}</Text>
                  </View>
                  
                  <View style={styles.relatedTourInfo}>
                    <Text style={styles.relatedTourName} numberOfLines={2}>
                      {relatedTour.name}
                    </Text>
                    <Text style={styles.relatedTourDestination} numberOfLines={1}>
                      📍 {relatedTour.destination}
                    </Text>
                    <Text style={styles.relatedTourPrice}>
                      Từ {formatPrice(relatedTour.pricePerPerson)}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          ) : (
            <Text style={styles.comingSoon}>Không có tour liên quan</Text>
          )}
        </View>

        {/* Bottom Spacing */}
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Fixed Bottom Bar */}
      <View style={styles.bottomBar}>
        <View style={styles.bottomPrice}>
          <Text style={styles.bottomPriceLabel}>Giá từ</Text>
          <Text style={styles.bottomPriceValue}>
            {formatPrice(tour.pricePerPerson)}
          </Text>
          <Text style={styles.priceNote}>/ người</Text>
        </View>
        <TouchableOpacity
          style={styles.bookButton}
          onPress={handleBookNow}
        >
          <Text style={styles.bookButtonText}>Đặt ngay</Text>
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
  tourImage: {
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
  tourHeader: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  tourName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 12,
  },
  tourMeta: {
    flexDirection: 'row',
    gap: 20,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metaIcon: {
    fontSize: 16,
    marginRight: 6,
  },
  metaText: {
    fontSize: 14,
    color: '#666',
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
  selectDateHint: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF3CD',
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#FFC107',
  },
  selectDateHintIcon: {
    fontSize: 20,
    marginRight: 8,
  },
  selectDateHintText: {
    flex: 1,
    fontSize: 14,
    color: '#856404',
    fontWeight: '500',
  },
  datesScroll: {
    marginHorizontal: -20,
    paddingHorizontal: 20,
  },
  dateCard: {
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#E0E0E0',
    borderRadius: 12,
    padding: 16,
    marginRight: 12,
    minWidth: 120,
    alignItems: 'center',
  },
  dateCardSelected: {
    borderColor: '#007AFF',
    backgroundColor: '#E3F2FD',
  },
  dateCardAlmost: {
    borderColor: '#FF9800',
  },
  dateText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  dateTextSelected: {
    color: '#007AFF',
  },
  dateStatus: {
    fontSize: 12,
    color: '#4CAF50',
    marginBottom: 4,
    fontWeight: '500',
  },
  dateStatusAlmost: {
    color: '#FF9800',
  },
  dateStatusSelected: {
    color: '#007AFF',
  },
  dateSeats: {
    fontSize: 12,
    color: '#999',
  },
  dateSeatsSelected: {
    color: '#007AFF',
  },
  description: {
    fontSize: 15,
    lineHeight: 24,
    color: '#444',
  },
  itineraryDay: {
    marginBottom: 20,
  },
  dayHeader: {
    marginBottom: 12,
  },
  dayBadge: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    alignSelf: 'flex-start',
  },
  dayNumber: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
    paddingLeft: 8,
  },
  activityDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#007AFF',
    marginTop: 8,
    marginRight: 12,
  },
  activityText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 22,
    color: '#444',
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
  infoCard: {
    flexDirection: 'row',
    backgroundColor: '#F8F9FA',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  infoIcon: {
    fontSize: 32,
    marginRight: 16,
  },
  infoContent: {
    flex: 1,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  infoText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  notesContainer: {
    backgroundColor: '#FFF3CD',
    padding: 16,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#FF9800',
  },
  noteItem: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  noteBullet: {
    fontSize: 16,
    color: '#856404',
    marginRight: 8,
    fontWeight: 'bold',
  },
  noteText: {
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
  loadingRelated: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
  },
  loadingRelatedText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#666',
  },
  relatedToursScroll: {
    paddingRight: 20,
    gap: 16,
  },
  relatedTourCard: {
    width: 200,
    backgroundColor: '#fff',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  relatedTourImage: {
    width: 200,
    height: 150,
  },
  relatedTourImagePlaceholder: {
    width: 200,
    height: 150,
    backgroundColor: '#E3F2FD',
    justifyContent: 'center',
    alignItems: 'center',
  },
  relatedTourPlaceholder: {
    fontSize: 50,
  },
  relatedTourBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: 'rgba(255, 107, 53, 0.9)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  relatedTourBadgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
  },
  relatedTourInfo: {
    padding: 12,
  },
  relatedTourName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 6,
    lineHeight: 20,
  },
  relatedTourDestination: {
    fontSize: 13,
    color: '#666',
    marginBottom: 8,
  },
  relatedTourPrice: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FF6B35',
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
  bookButtonDisabled: {
    backgroundColor: '#CCCCCC',
    shadowOpacity: 0,
  },
  bookButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
