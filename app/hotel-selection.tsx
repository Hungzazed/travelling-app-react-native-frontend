import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Modal,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { getTourById, Tour } from '../services/tourService';
import { Hotel } from '../services/hotelService';
import { getReviews, Review } from '../services/reviewService';

export default function HotelSelectionScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const tourId = params.tourId as string;

  const [tour, setTour] = useState<Tour | null>(null);
  const [selectedHotel, setSelectedHotel] = useState<Hotel | null>(null);
  const [showHotelDetail, setShowHotelDetail] = useState(false);
  const [selectedHotelDetail, setSelectedHotelDetail] = useState<Hotel | null>(null);
  const [hotelReviews, setHotelReviews] = useState<Review[]>([]);
  const [hotelReviewStats, setHotelReviewStats] = useState({ average: 0, total: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingReviews, setIsLoadingReviews] = useState(false);

  useEffect(() => {
    loadTourData();
  }, [tourId]);

  const loadTourData = async () => {
    try {
      setIsLoading(true);
      const tourData = await getTourById(tourId);
      setTour(tourData);
    } catch (error) {
      console.error('Error loading tour:', error);
      Alert.alert('Lỗi', 'Không thể tải thông tin tour');
    } finally {
      setIsLoading(false);
    }
  };

  const loadHotelReviews = async (hotelId: string) => {
    try {
      setIsLoadingReviews(true);
      const reviewsData = await getReviews({
        targetType: 'hotel',
        targetId: hotelId,
        sortBy: 'createdAt:desc',
        limit: 10,
      });
      
      setHotelReviews(reviewsData.results);
      
      if (reviewsData.results.length > 0) {
        const totalRating = reviewsData.results.reduce((sum, review) => sum + review.rating, 0);
        const average = totalRating / reviewsData.results.length;
        setHotelReviewStats({
          average: Math.round(average * 10) / 10,
          total: reviewsData.totalResults,
        });
      } else {
        setHotelReviewStats({ average: 0, total: 0 });
      }
    } catch (error) {
      console.error('Error loading hotel reviews:', error);
    } finally {
      setIsLoadingReviews(false);
    }
  };

  const handleShowHotelDetail = (hotel: Hotel) => {
    setSelectedHotelDetail(hotel);
    setShowHotelDetail(true);
    loadHotelReviews(hotel.id);
  };

  const handleSelectHotel = (hotel: Hotel) => {
    setSelectedHotel(hotel);
    setShowHotelDetail(false);
  };

  const handleContinueBooking = () => {
    if (!selectedHotel) {
      Alert.alert('Thông báo', 'Vui lòng chọn khách sạn');
      return;
    }

    // Navigate to service selection
    router.push({
      pathname: '/service-selection' as any,
      params: {
        tourId: tour!.id,
        hotelId: selectedHotel.id,
      },
    });
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2196F3" />
        <Text style={styles.loadingText}>Đang tải...</Text>
      </View>
    );
  }

  if (!tour) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.errorText}>Không tìm thấy tour</Text>
      </View>
    );
  }

  const hotels = Array.isArray(tour.hotels) 
    ? tour.hotels.filter(h => typeof h === 'object' && h !== null) as Hotel[]
    : [];

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle} numberOfLines={1}>
            Chọn khách sạn
          </Text>
          <Text style={styles.headerSubtitle}>
            {tour.name}
          </Text>
        </View>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Tour Summary */}
        <View style={styles.tourSummary}>
          <Text style={styles.tourName}>{tour.name}</Text>
          <Text style={styles.tourInfo}>📍 {tour.destination} • {tour.duration}</Text>
          <Text style={styles.tourPrice}>
            Giá tour: {tour.pricePerPerson.toLocaleString('vi-VN')}₫/người
          </Text>
        </View>

        {/* Hotels List */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            🏨 Danh sách khách sạn ({hotels.length})
          </Text>
          <Text style={styles.sectionSubtitle}>
            Nhấn vào khách sạn để xem chi tiết
          </Text>

          {hotels.length > 0 ? (
            hotels.map((hotel) => (
              <View key={hotel.id} style={styles.hotelCard}>
                <TouchableOpacity
                  style={styles.hotelImageContainer}
                  onPress={() => handleShowHotelDetail(hotel)}
                >
                  <Image
                    source={{ uri: hotel.images?.[0] || 'https://via.placeholder.com/200x150' }}
                    style={styles.hotelImage}
                    resizeMode="cover"
                  />
                  <View style={styles.viewDetailBadge}>
                    <Text style={styles.viewDetailText}>👁️ Xem chi tiết</Text>
                  </View>
                </TouchableOpacity>

                <View style={styles.hotelInfo}>
                  <Text style={styles.hotelName} numberOfLines={2}>
                    {hotel.name}
                  </Text>
                  <Text style={styles.hotelLocation}>📍 {hotel.city}</Text>
                  <View style={styles.hotelRating}>
                    <Text style={styles.ratingIcon}>⭐</Text>
                    <Text style={styles.ratingText}>{hotel.rating.toFixed(1)}</Text>
                  </View>
                  {hotel.description && (
                    <Text style={styles.hotelDescription} numberOfLines={2}>
                      {hotel.description}
                    </Text>
                  )}
                  <View style={styles.hotelPriceRow}>
                    <Text style={styles.hotelPriceLabel}>Giá/đêm:</Text>
                    <Text style={styles.hotelPrice}>
                      {hotel.pricePerNight.toLocaleString('vi-VN')}₫
                    </Text>
                  </View>

                  {/* Select Button */}
                  <TouchableOpacity
                    style={[
                      styles.selectButton,
                      selectedHotel?.id === hotel.id && styles.selectButtonSelected,
                    ]}
                    onPress={() => setSelectedHotel(hotel)}
                  >
                    <Text style={[
                      styles.selectButtonText,
                      selectedHotel?.id === hotel.id && styles.selectButtonTextSelected,
                    ]}>
                      {selectedHotel?.id === hotel.id ? '✓ Đã chọn' : 'Chọn khách sạn này'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))
          ) : (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>Tour này chưa có khách sạn</Text>
            </View>
          )}
        </View>

        <View style={{ height: 120 }} />
      </ScrollView>

      {/* Bottom Bar */}
      {hotels.length > 0 && (
        <View style={styles.bottomBar}>
          <View style={styles.bottomInfo}>
            <Text style={styles.bottomLabel}>Tổng chi phí dự kiến</Text>
            <Text style={styles.bottomPrice}>
              {selectedHotel 
                ? `${(tour.pricePerPerson + selectedHotel.pricePerNight * parseInt(tour.duration.match(/(\d+)/)?.[1] || '1')).toLocaleString('vi-VN')}₫`
                : 'Chọn khách sạn'}
            </Text>
            {selectedHotel && (
              <Text style={styles.bottomNote}>
                Tour: {tour.pricePerPerson.toLocaleString('vi-VN')}₫ + Khách sạn: {selectedHotel.pricePerNight.toLocaleString('vi-VN')}₫ x {tour.duration.match(/(\d+)/)?.[1] || '1'} đêm
              </Text>
            )}
          </View>
          <TouchableOpacity
            style={[
              styles.bookButton,
              !selectedHotel && styles.bookButtonDisabled,
            ]}
            onPress={handleContinueBooking}
            disabled={!selectedHotel}
          >
            <Text style={styles.bookButtonText}>Tiếp tục đặt tour</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Hotel Detail Modal */}
      <Modal
        visible={showHotelDetail}
        animationType="slide"
        onRequestClose={() => setShowHotelDetail(false)}
      >
        <View style={styles.modalContainer}>
          <StatusBar style="light" />
          
          {/* Modal Header */}
          <View style={styles.modalHeader}>
            <TouchableOpacity 
              style={styles.modalCloseButton}
              onPress={() => setShowHotelDetail(false)}
            >
              <Text style={styles.modalCloseText}>✕</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle} numberOfLines={1}>
              Chi tiết khách sạn
            </Text>
          </View>

          {selectedHotelDetail && (
            <ScrollView style={styles.modalScrollView} showsVerticalScrollIndicator={false}>
              {/* Hotel Images */}
              {selectedHotelDetail.images && selectedHotelDetail.images.length > 0 && (
                <ScrollView 
                  horizontal 
                  pagingEnabled
                  showsHorizontalScrollIndicator={false}
                  style={styles.imageSlider}
                >
                  {selectedHotelDetail.images.map((imageUrl, index) => (
                    <Image
                      key={index}
                      source={{ uri: imageUrl }}
                      style={styles.hotelDetailImage}
                      resizeMode="cover"
                    />
                  ))}
                </ScrollView>
              )}

              <View style={styles.modalContent}>
                {/* Hotel Info */}
                <View style={styles.detailSection}>
                  <Text style={styles.detailHotelName}>{selectedHotelDetail.name}</Text>
                  <Text style={styles.detailLocation}>📍 {selectedHotelDetail.city}</Text>
                  
                  <View style={styles.detailRatingRow}>
                    <View style={styles.detailRating}>
                      <Text style={styles.detailRatingIcon}>⭐</Text>
                      <Text style={styles.detailRatingText}>
                        {selectedHotelDetail.rating.toFixed(1)}
                      </Text>
                    </View>
                    <View style={styles.detailPrice}>
                      <Text style={styles.detailPriceLabel}>Giá/đêm</Text>
                      <Text style={styles.detailPriceValue}>
                        {selectedHotelDetail.pricePerNight.toLocaleString('vi-VN')}₫
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Description */}
                {selectedHotelDetail.description && (
                  <View style={styles.detailSection}>
                    <Text style={styles.detailSectionTitle}>📝 Mô tả</Text>
                    <Text style={styles.detailDescription}>
                      {selectedHotelDetail.description}
                    </Text>
                  </View>
                )}

                {/* Amenities */}
                {selectedHotelDetail.amenities && selectedHotelDetail.amenities.length > 0 && (
                  <View style={styles.detailSection}>
                    <Text style={styles.detailSectionTitle}>✨ Tiện nghi</Text>
                    <View style={styles.amenitiesGrid}>
                      {selectedHotelDetail.amenities.map((amenity, index) => (
                        <View key={index} style={styles.amenityItem}>
                          <Text style={styles.amenityIcon}>✓</Text>
                          <Text style={styles.amenityText}>{amenity}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                )}

                {/* Reviews */}
                <View style={styles.detailSection}>
                  <View style={styles.reviewsHeader}>
                    <Text style={styles.detailSectionTitle}>⭐ Đánh giá</Text>
                    {hotelReviewStats.total > 0 && (
                      <View style={styles.ratingBadge}>
                        <Text style={styles.ratingBadgeText}>
                          {hotelReviewStats.average.toFixed(1)}
                        </Text>
                        <Text style={styles.ratingCount}>
                          • {hotelReviewStats.total} đánh giá
                        </Text>
                      </View>
                    )}
                  </View>

                  {isLoadingReviews ? (
                    <View style={styles.reviewsLoading}>
                      <ActivityIndicator size="small" color="#2196F3" />
                      <Text style={styles.reviewsLoadingText}>Đang tải đánh giá...</Text>
                    </View>
                  ) : hotelReviews.length > 0 ? (
                    <>
                      {hotelReviews.slice(0, 5).map((review) => (
                        <View key={review.id} style={styles.reviewCard}>
                          <View style={styles.reviewHeader}>
                            <View style={styles.reviewUserInfo}>
                              <View style={styles.reviewAvatar}>
                                <Text style={styles.reviewAvatarText}>
                                  {typeof review.userId === 'object' && review.userId.name
                                    ? review.userId.name.charAt(0).toUpperCase()
                                    : 'K'}
                                </Text>
                              </View>
                              <View style={styles.reviewUserDetails}>
                                <Text style={styles.reviewUserName}>
                                  {typeof review.userId === 'object' && review.userId.name
                                    ? review.userId.name
                                    : 'Khách hàng'}
                                </Text>
                                <Text style={styles.reviewDate}>
                                  {new Date(review.createdAt).toLocaleDateString('vi-VN')}
                                </Text>
                              </View>
                            </View>
                            <View style={styles.reviewRating}>
                              {[1, 2, 3, 4, 5].map((star) => (
                                <Text
                                  key={star}
                                  style={[
                                    styles.starIcon,
                                    { color: star <= review.rating ? '#FFD700' : '#E0E0E0' },
                                  ]}
                                >
                                  ★
                                </Text>
                              ))}
                            </View>
                          </View>
                          {review.comment && (
                            <Text style={styles.reviewComment}>{review.comment}</Text>
                          )}
                        </View>
                      ))}
                      {hotelReviewStats.total > 5 && (
                        <Text style={styles.moreReviews}>
                          và {hotelReviewStats.total - 5} đánh giá khác...
                        </Text>
                      )}
                    </>
                  ) : (
                    <View style={styles.noReviews}>
                      <Text style={styles.noReviewsIcon}>💬</Text>
                      <Text style={styles.noReviewsText}>Chưa có đánh giá nào</Text>
                      <Text style={styles.noReviewsSubtext}>
                        Hãy là người đầu tiên đánh giá khách sạn này
                      </Text>
                    </View>
                  )}
                </View>

                <View style={{ height: 100 }} />
              </View>
            </ScrollView>
          )}

          {/* Modal Bottom Button */}
          {selectedHotelDetail && (
            <View style={styles.modalBottomBar}>
              <TouchableOpacity
                style={[
                  styles.modalSelectButton,
                  selectedHotel?.id === selectedHotelDetail.id && styles.modalSelectButtonSelected,
                ]}
                onPress={() => handleSelectHotel(selectedHotelDetail)}
              >
                <Text style={[
                  styles.modalSelectButtonText,
                  selectedHotel?.id === selectedHotelDetail.id && styles.modalSelectButtonTextSelected,
                ]}>
                  {selectedHotel?.id === selectedHotelDetail.id 
                    ? '✓ Đã chọn - Đóng' 
                    : 'Chọn khách sạn này'}
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 15,
    color: '#666',
  },
  errorText: {
    fontSize: 16,
    color: '#d32f2f',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingTop: 60,
    paddingBottom: 16,
    paddingHorizontal: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F5F7FA',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  backButtonText: {
    fontSize: 28,
    color: '#2196F3',
    fontWeight: '300',
  },
  headerTitleContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1A1A1A',
    marginBottom: 2,
  },
  headerSubtitle: {
    fontSize: 13,
    color: '#999',
  },
  scrollView: {
    flex: 1,
  },
  tourSummary: {
    backgroundColor: '#fff',
    padding: 20,
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  tourName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  tourInfo: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  tourPrice: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2196F3',
  },
  section: {
    backgroundColor: '#fff',
    padding: 20,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 6,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
  },
  hotelCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  hotelImageContainer: {
    position: 'relative',
  },
  hotelImage: {
    width: '100%',
    height: 180,
  },
  viewDetailBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: 'rgba(0, 122, 255, 0.9)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  viewDetailText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  hotelInfo: {
    padding: 16,
  },
  hotelName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  hotelLocation: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  hotelRating: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  ratingIcon: {
    fontSize: 16,
    marginRight: 4,
  },
  ratingText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#F57C00',
  },
  hotelDescription: {
    fontSize: 13,
    color: '#888',
    lineHeight: 20,
    marginBottom: 12,
  },
  hotelPriceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
    marginBottom: 16,
  },
  hotelPriceLabel: {
    fontSize: 13,
    color: '#999',
  },
  hotelPrice: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2196F3',
  },
  selectButton: {
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#2196F3',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  selectButtonSelected: {
    backgroundColor: '#2196F3',
  },
  selectButtonText: {
    color: '#2196F3',
    fontSize: 15,
    fontWeight: 'bold',
  },
  selectButtonTextSelected: {
    color: '#fff',
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 15,
    color: '#999',
  },
  bottomBar: {
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
  bottomInfo: {
    marginBottom: 12,
  },
  bottomLabel: {
    fontSize: 13,
    color: '#666',
    marginBottom: 4,
  },
  bottomPrice: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#2196F3',
  },
  bottomNote: {
    fontSize: 11,
    color: '#999',
    marginTop: 4,
    fontStyle: 'italic',
  },
  bookButton: {
    backgroundColor: '#2196F3',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  bookButtonDisabled: {
    backgroundColor: '#B0B0B0',
  },
  bookButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  // Modal Styles
  modalContainer: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingTop: 50,
    paddingBottom: 16,
    paddingHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  modalCloseButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    backgroundColor: '#F5F7FA',
    borderRadius: 20,
  },
  modalCloseText: {
    fontSize: 24,
    color: '#2196F3',
    fontWeight: '300',
  },
  modalTitle: {
    flex: 1,
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1A1A1A',
  },
  modalScrollView: {
    flex: 1,
  },
  imageSlider: {
    height: 300,
    backgroundColor: '#000',
  },
  hotelDetailImage: {
    width: 390, // Approximately phone width
    height: 300,
  },
  modalContent: {
    backgroundColor: '#fff',
  },
  detailSection: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  detailHotelName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  detailLocation: {
    fontSize: 15,
    color: '#666',
    marginBottom: 12,
  },
  detailRatingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailRating: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  detailRatingIcon: {
    fontSize: 20,
    marginRight: 6,
  },
  detailRatingText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#F57C00',
  },
  detailPrice: {
    alignItems: 'flex-end',
  },
  detailPriceLabel: {
    fontSize: 12,
    color: '#999',
    marginBottom: 2,
  },
  detailPriceValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2196F3',
  },
  detailSectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 12,
  },
  detailDescription: {
    fontSize: 15,
    color: '#555',
    lineHeight: 24,
  },
  amenitiesGrid: {
    gap: 12,
  },
  amenityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#bdd4efff',
    borderRadius: 8,
  },
  amenityIcon: {
    fontSize: 16,
    color: '#2196F3',
    marginRight: 10,
    fontWeight: 'bold',
  },
  amenityText: {
    fontSize: 14,
    color: '#333',
  },
  reviewsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF3E0',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    gap: 4,
  },
  ratingBadgeText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FF9800',
  },
  ratingCount: {
    fontSize: 13,
    color: '#666',
  },
  reviewsLoading: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  reviewsLoadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#666',
  },
  reviewCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  reviewHeader: {
    marginBottom: 12,
  },
  reviewUserInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  reviewAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#2196F3',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  reviewAvatarText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },
  reviewUserDetails: {
    flex: 1,
  },
  reviewUserName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  reviewDate: {
    fontSize: 12,
    color: '#999',
  },
  reviewRating: {
    flexDirection: 'row',
    gap: 4,
  },
  starIcon: {
    fontSize: 16,
  },
  reviewComment: {
    fontSize: 14,
    color: '#555',
    lineHeight: 20,
  },
  moreReviews: {
    textAlign: 'center',
    fontSize: 13,
    color: '#2196F3',
    marginTop: 8,
    fontStyle: 'italic',
  },
  noReviews: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  noReviewsIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  noReviewsText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
  },
  noReviewsSubtext: {
    fontSize: 14,
    color: '#999',
  },
  modalBottomBar: {
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  modalSelectButton: {
    backgroundColor: '#2196F3',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalSelectButtonSelected: {
    backgroundColor: '#2196F3',
  },
  modalSelectButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  modalSelectButtonTextSelected: {
    color: '#fff',
  },
});
