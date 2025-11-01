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
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { getTourById, Tour } from '../services/tourService';
import { getReviews, Review } from '../services/reviewService';

export default function TourHotelBookingScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const tourId = params.tourId as string;

  const [tour, setTour] = useState<Tour | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [reviewStats, setReviewStats] = useState({ average: 0, total: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingReviews, setIsLoadingReviews] = useState(false);

  useEffect(() => {
    loadTourData();
    loadReviews();
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

  const loadReviews = async () => {
    try {
      setIsLoadingReviews(true);
      const reviewsData = await getReviews({
        targetType: 'tour',
        targetId: tourId,
        sortBy: 'createdAt:desc',
        limit: 10,
      });
      
      setReviews(reviewsData.results);
      
      // Calculate average rating
      if (reviewsData.results.length > 0) {
        const totalRating = reviewsData.results.reduce((sum, review) => sum + review.rating, 0);
        const average = totalRating / reviewsData.results.length;
        setReviewStats({
          average: Math.round(average * 10) / 10,
          total: reviewsData.totalResults,
        });
      }
    } catch (error) {
      console.error('Error loading reviews:', error);
    } finally {
      setIsLoadingReviews(false);
    }
  };

  const handleContinueToHotelSelection = () => {
    if (!tour) return;
    
    const hasHotels = Array.isArray(tour.hotels) && tour.hotels.length > 0;
    
    if (hasHotels) {
      // Navigate to hotel selection page
      router.push({
        pathname: '/hotel-selection' as any,
        params: {
          tourId: tour.id,
        },
      });
    } else {
      // No hotels, go to service selection
      router.push({
        pathname: '/service-selection' as any,
        params: {
          tourId: tour.id,
        },
      });
    }
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

  const hasHotels = Array.isArray(tour.hotels) && tour.hotels.length > 0;

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
            {tour.name}
          </Text>
          <Text style={styles.headerSubtitle}>
            {tour.destination} • {tour.duration}
          </Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Tour Summary */}
        <View style={styles.tourSummary}>
          <Image
            source={{ uri: tour.images?.[0] || 'https://via.placeholder.com/400x200' }}
            style={styles.tourImage}
            resizeMode="cover"
          />
          <View style={styles.tourInfo}>
            <Text style={styles.tourName}>{tour.name}</Text>
            <Text style={styles.tourDestination}>📍 {tour.destination}</Text>
            <Text style={styles.tourDuration}>⏱️ {tour.duration}</Text>
            <View style={styles.tourPriceContainer}>
              <Text style={styles.tourPriceLabel}>Giá tour:</Text>
              <Text style={styles.tourPrice}>
                {tour.pricePerPerson.toLocaleString('vi-VN')}₫/người
              </Text>
            </View>
          </View>
        </View>

        {/* Tour Description */}
        {tour.description && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>📝 Mô tả chuyến đi</Text>
            <Text style={styles.description}>{tour.description}</Text>
          </View>
        )}

        {/* Itinerary */}
        {tour.itinerary && tour.itinerary.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>📅 Lịch trình tour</Text>
            <Text style={styles.sectionSubtitle}>
              Chi tiết hoạt động từng ngày trong chuyến đi
            </Text>
            {tour.itinerary.map((day, index) => (
              <View key={index} style={styles.itineraryCard}>
                <View style={styles.itineraryHeader}>
                  <View style={styles.dayBadge}>
                    <Text style={styles.dayBadgeText}>Ngày {day.day}</Text>
                  </View>
                </View>
                <View style={styles.activitiesContainer}>
                  {day.activities.map((activity, actIndex) => (
                    <View key={actIndex} style={styles.activityRow}>
                      <Text style={styles.activityBullet}>•</Text>
                      <Text style={styles.activityText}>{activity}</Text>
                    </View>
                  ))}
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Included Services */}
        {tour.includedServices && tour.includedServices.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>✨ Dịch vụ bao gồm</Text>
            <View style={styles.servicesGrid}>
              {tour.includedServices.map((service, index) => (
                <View key={index} style={styles.serviceItem}>
                  <Text style={styles.serviceIcon}>✓</Text>
                  <Text style={styles.serviceText}>{service}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Tour Images Gallery */}
        {tour.images && tour.images.length > 1 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>📷 Hình ảnh tour</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.imagesScroll}
            >
              {tour.images.slice(1).map((image, index) => (
                <Image
                  key={index}
                  source={{ uri: image }}
                  style={styles.galleryImage}
                  resizeMode="cover"
                />
              ))}
            </ScrollView>
          </View>
        )}

        {/* Reviews Section */}
        <View style={styles.section}>
          <View style={styles.reviewsHeader}>
            <Text style={styles.sectionTitle}>⭐ Đánh giá từ khách hàng</Text>
            {reviewStats.total > 0 && (
              <View style={styles.ratingBadge}>
                <Text style={styles.ratingBadgeText}>
                  ⭐ {reviewStats.average.toFixed(1)}
                </Text>
                <Text style={styles.ratingCount}>({reviewStats.total} đánh giá)</Text>
              </View>
            )}
          </View>

          {isLoadingReviews ? (
            <View style={styles.reviewsLoading}>
              <ActivityIndicator size="small" color="#2196F3" />
              <Text style={styles.reviewsLoadingText}>Đang tải đánh giá...</Text>
            </View>
          ) : reviews.length > 0 ? (
            <View>
              {reviews.slice(0, 5).map((review) => {
                const user = typeof review.userId === 'object' ? review.userId : null;
                return (
                  <View key={review.id} style={styles.reviewCard}>
                    <View style={styles.reviewHeader}>
                      <View style={styles.reviewUserInfo}>
                        <View style={styles.reviewAvatar}>
                          <Text style={styles.reviewAvatarText}>
                            {user?.name?.charAt(0).toUpperCase() || 'U'}
                          </Text>
                        </View>
                        <View style={styles.reviewUserDetails}>
                          <Text style={styles.reviewUserName}>
                            {user?.name || 'Khách hàng'}
                          </Text>
                          <Text style={styles.reviewDate}>
                            {new Date(review.createdAt).toLocaleDateString('vi-VN')}
                          </Text>
                        </View>
                      </View>
                      <View style={styles.reviewRating}>
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Text key={star} style={styles.starIcon}>
                            {star <= review.rating ? '⭐' : '☆'}
                          </Text>
                        ))}
                      </View>
                    </View>
                    {review.comment && (
                      <Text style={styles.reviewComment}>{review.comment}</Text>
                    )}
                  </View>
                );
              })}
              {reviewStats.total > 5 && (
                <Text style={styles.moreReviews}>
                  và {reviewStats.total - 5} đánh giá khác...
                </Text>
              )}
            </View>
          ) : (
            <View style={styles.noReviews}>
              <Text style={styles.noReviewsIcon}>💬</Text>
              <Text style={styles.noReviewsText}>Chưa có đánh giá nào</Text>
              <Text style={styles.noReviewsSubtext}>
                Hãy là người đầu tiên đánh giá tour này
              </Text>
            </View>
          )}
        </View>

        <View style={{ height: 120 }} />
      </ScrollView>

      {/* Bottom Bar - Continue Button */}
      <View style={styles.bottomBar}>
        <View style={styles.bottomInfo}>
          <Text style={styles.bottomLabel}>Giá tour mỗi người</Text>
          <Text style={styles.bottomPrice}>
            {tour.pricePerPerson.toLocaleString('vi-VN')}₫
          </Text>
          {hasHotels && (
            <Text style={styles.bottomNote}>
              + Giá khách sạn (chọn ở bước tiếp theo)
            </Text>
          )}
        </View>
        <TouchableOpacity
          style={styles.continueButton}
          onPress={handleContinueToHotelSelection}
        >
          <Text style={styles.continueButtonText}>
            {hasHotels ? 'Tiếp tục chọn khách sạn' : 'Đặt tour ngay'}
          </Text>
        </TouchableOpacity>
      </View>
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
    fontSize: 16,
    color: '#666',
  },
  errorText: {
    fontSize: 16,
    color: '#FF3B30',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingTop: 30,
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
  },
  backButtonText: {
    fontSize: 24,
    color: '#2196F3',
    fontWeight: 'bold',
  },
  headerTitleContainer: {
    flex: 1,
    marginHorizontal: 12,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1A1A1A',
  },
  headerSubtitle: {
    fontSize: 13,
    color: '#999',
    marginTop: 2,
  },
  content: {
    flex: 1,
  },
  tourSummary: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  tourImage: {
    width: '100%',
    height: 180,
  },
  tourInfo: {
    padding: 16,
  },
  tourName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  tourDestination: {
    fontSize: 15,
    color: '#666',
    marginBottom: 4,
  },
  tourDuration: {
    fontSize: 15,
    color: '#666',
    marginBottom: 12,
  },
  tourPriceContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
  },
  tourPriceLabel: {
    fontSize: 14,
    color: '#999',
  },
  tourPrice: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2196F3',
  },
  section: {
    marginTop: 24,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
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
    fontSize: 12,
    color: '#999',
    fontStyle: 'italic',
    marginTop: 4,
  },
  continueButton: {
    backgroundColor: '#2196F3',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#2196F3',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  continueButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  // Description Styles
  description: {
    fontSize: 15,
    color: '#555',
    lineHeight: 24,
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
  },
  // Itinerary Styles
  itineraryCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#2196F3',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  itineraryHeader: {
    marginBottom: 12,
  },
  dayBadge: {
    backgroundColor: '#2196F3',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    alignSelf: 'flex-start',
  },
  dayBadgeText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: 'bold',
  },
  activitiesContainer: {
    gap: 8,
  },
  activityRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  activityBullet: {
    fontSize: 20,
    color: '#2196F3',
    marginRight: 12,
    marginTop: -2,
  },
  activityText: {
    flex: 1,
    fontSize: 15,
    color: '#333',
    lineHeight: 22,
  },
  // Services Styles
  servicesGrid: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
  },
  serviceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: '#E8F5E9',
    borderRadius: 8,
    marginBottom: 8,
  },
  serviceIcon: {
    fontSize: 18,
    color: '#4CAF50',
    marginRight: 12,
    fontWeight: 'bold',
  },
  serviceText: {
    flex: 1,
    fontSize: 14,
    color: '#2E7D32',
    fontWeight: '500',
  },
  // Images Gallery Styles
  imagesScroll: {
    paddingRight: 16,
    gap: 12,
  },
  galleryImage: {
    width: 280,
    height: 180,
    borderRadius: 12,
    marginRight: 0,
  },
  // Reviews Styles
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
});
