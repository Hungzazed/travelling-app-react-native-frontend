import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl,
  Platform,
  Dimensions,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { getCurrentUser } from '../../services/authService';
import { getUsers } from '../../services/userService';
import { getHotels } from '../../services/hotelService';
import { getServices } from '../../services/serviceService';
import { getReviews } from '../../services/reviewService';

const { width } = Dimensions.get('window');

interface Stats {
  totalUsers: number;
  totalHotels: number;
  totalServices: number;
  totalReviews: number;
  averageRating: number;
  reviewsByType: {
    tour: number;
    hotel: number;
  };
  servicesByType: {
    transport: number;
    food: number;
    guide: number;
    ticket: number;
    other: number;
  };
  topRatedHotels: Array<{
    id: string;
    name: string;
    rating: number;
    city: string;
  }>;
}

export default function AdminAnalyticsScreen() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState<Stats>({
    totalUsers: 0,
    totalHotels: 0,
    totalServices: 0,
    totalReviews: 0,
    averageRating: 0,
    reviewsByType: { tour: 0, hotel: 0 },
    servicesByType: { transport: 0, food: 0, guide: 0, ticket: 0, other: 0 },
    topRatedHotels: [],
  });

  useEffect(() => {
    checkUserRole();
  }, []);

  const checkUserRole = async () => {
    try {
      const user = await getCurrentUser();
      if (!user || user.role !== 'admin') {
        Alert.alert('Lỗi', 'Bạn không có quyền truy cập trang này');
        router.back();
        return;
      }
      loadAnalytics();
    } catch (error) {
      Alert.alert('Lỗi', 'Không thể xác thực người dùng');
      router.back();
    }
  };

  const loadAnalytics = async () => {
    try {
      setIsLoading(true);

      const [usersData, hotelsData, servicesData, reviewsData] = await Promise.all([
        getUsers({ limit: 1000 }),
        getHotels({ limit: 1000 }),
        getServices({ limit: 1000 }),
        getReviews({ limit: 1000 }),
      ]);

      const totalUsers = usersData.totalResults || 0;
      const totalHotels = hotelsData.totalResults || 0;
      const totalServices = servicesData.totalResults || 0;
      const totalReviews = reviewsData.totalResults || 0;

      const reviews = reviewsData.results || [];
      const averageRating = reviews.length > 0
        ? reviews.reduce((sum: number, r: any) => sum + r.rating, 0) / reviews.length
        : 0;

      const reviewsByType = reviews.reduce(
        (acc: any, review: any) => {
          if (review.targetType === 'tour') acc.tour++;
          else if (review.targetType === 'hotel') acc.hotel++;
          return acc;
        },
        { tour: 0, hotel: 0 }
      );

      const services = servicesData.results || [];
      const servicesByType = services.reduce(
        (acc: any, service: any) => {
          acc[service.type] = (acc[service.type] || 0) + 1;
          return acc;
        },
        { transport: 0, food: 0, guide: 0, ticket: 0, other: 0 }
      );

      const hotels = hotelsData.results || [];
      const topRatedHotels = [...hotels]
        .sort((a: any, b: any) => b.rating - a.rating)
        .slice(0, 5)
        .map((h: any) => ({
          id: h.id,
          name: h.name,
          rating: h.rating,
          city: h.city,
        }));

      setStats({
        totalUsers,
        totalHotels,
        totalServices,
        totalReviews,
        averageRating: Math.round(averageRating * 10) / 10,
        reviewsByType,
        servicesByType,
        topRatedHotels,
      });
    } catch (error: any) {
      console.error('Error loading analytics:', error);
      Alert.alert('Lỗi', error.message || 'Không thể tải thống kê');
    } finally {
      setIsLoading(false);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadAnalytics();
    setRefreshing(false);
  }, []);

  const getRatingStars = (rating: number) => {
    return '⭐'.repeat(Math.round(rating));
  };

  // Render Pie Chart for Reviews
  const renderReviewsPieChart = () => {
    const total = stats.reviewsByType.tour + stats.reviewsByType.hotel;
    if (total === 0) {
      return (
        <View style={styles.pieChartContainer}>
          <Text style={styles.emptyChartText}>Chưa có dữ liệu</Text>
        </View>
      );
    }

    const tourPercentage = (stats.reviewsByType.tour / total) * 100;
    const hotelPercentage = (stats.reviewsByType.hotel / total) * 100;

    return (
      <View style={styles.pieChartContainer}>
        <View style={styles.pieChart}>
          {/* Tour Section */}
          <View style={[styles.pieSlice, styles.pieSliceTour]}>
            <View style={styles.pieSliceInner}>
              <Text style={styles.piePercentage}>{Math.round(tourPercentage)}%</Text>
              <Text style={styles.pieLabel}>Tour</Text>
            </View>
          </View>
          
          {/* Hotel Section */}
          <View style={[styles.pieSlice, styles.pieSliceHotel]}>
            <View style={styles.pieSliceInner}>
              <Text style={styles.piePercentage}>{Math.round(hotelPercentage)}%</Text>
              <Text style={styles.pieLabel}>Hotel</Text>
            </View>
          </View>
        </View>

        {/* Legend */}
        <View style={styles.chartLegendRow}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#007AFF' }]} />
            <Text style={styles.legendText}>Tour ({stats.reviewsByType.tour})</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#FF9500' }]} />
            <Text style={styles.legendText}>Khách sạn ({stats.reviewsByType.hotel})</Text>
          </View>
        </View>
      </View>
    );
  };

  // Render Bar Chart for Services
  const renderServicesBarChart = () => {
    const colors = ['#007AFF', '#FF9500', '#34C759', '#FF2D55', '#AF52DE'];
    const labels = ['Vận chuyển', 'Ẩm thực', 'Hướng dẫn', 'Vé', 'Khác'];
    const icons = ['🚗', '🍽️', '👨‍🏫', '🎟️', '📦'];
    const types = ['transport', 'food', 'guide', 'ticket', 'other'];
    
    const data = types.map((type, index) => ({
      type,
      count: stats.servicesByType[type as keyof typeof stats.servicesByType] as number,
      color: colors[index],
      label: labels[index],
      icon: icons[index],
    }));

    const maxCount = Math.max(...data.map(item => item.count), 1);

    return (
      <View style={styles.barChartContainer}>
        <View style={styles.barChart}>
          {data.map((item) => {
            const percentage = (item.count / maxCount) * 100;
            return (
              <View key={item.type} style={styles.barItem}>
                <View style={styles.barTrack}>
                  <View 
                    style={[
                      styles.barFill,
                      { 
                        height: `${percentage}%`,
                        backgroundColor: item.color
                      }
                    ]} 
                  />
                </View>
                <Text style={styles.barCount}>{item.count}</Text>
                <Text style={styles.barIcon}>{item.icon}</Text>
              </View>
            );
          })}
        </View>
        
        <View style={styles.barLegend}>
          {data.map((item) => (
            <View key={item.type} style={styles.barLegendItem}>
              <View style={[styles.barLegendDot, { backgroundColor: item.color }]} />
              <Text style={styles.barLegendText}>{item.label}</Text>
            </View>
          ))}
        </View>
      </View>
    );
  };

  if (isLoading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#6366F1" />
        <Text style={styles.loadingText}>Đang tải thống kê...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      
      {/* Modern Gradient Header */}
      <View style={styles.headerWrapper}>
        <View style={styles.gradientBackground} />
        <View style={styles.headerPatternLeft} />
        <View style={styles.headerPatternRight} />
        
        <View style={styles.headerContent}>
          <TouchableOpacity 
            style={styles.backButton} 
            onPress={() => router.back()}
            activeOpacity={0.8}
          >
            <View style={styles.backButtonCircle}>
              <Text style={styles.backButtonText}>←</Text>
            </View>
          </TouchableOpacity>
          
          <View style={styles.headerTitleContainer}>
            <Text style={styles.headerSubtitle}>Analytics Dashboard</Text>
            <Text style={styles.headerTitle}>Thống kê & Báo cáo</Text>
          </View>
          
          <View style={styles.headerIconBox}>
            <Text style={styles.headerIcon}>📊</Text>
          </View>
        </View>
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={onRefresh} 
            colors={['#6366F1']}
            tintColor="#6366F1"
          />
        }
      >
        {/* Stats Cards */}
        <View style={styles.statsSection}>
          <View style={styles.statsRow}>
            <View style={[styles.statCard, styles.statCardBlue]}>
              <View style={styles.statIconContainer}>
                <Text style={styles.statIcon}>👥</Text>
              </View>
              <Text style={styles.statValue}>{stats.totalUsers}</Text>
              <Text style={styles.statLabel}>Người dùng</Text>
              <View style={styles.statGlow} />
            </View>

            <View style={[styles.statCard, styles.statCardPurple]}>
              <View style={styles.statIconContainer}>
                <Text style={styles.statIcon}>🏨</Text>
              </View>
              <Text style={styles.statValue}>{stats.totalHotels}</Text>
              <Text style={styles.statLabel}>Khách sạn</Text>
              <View style={styles.statGlow} />
            </View>
          </View>

          <View style={styles.statsRow}>
            <View style={[styles.statCard, styles.statCardPink]}>
              <View style={styles.statIconContainer}>
                <Text style={styles.statIcon}>🎫</Text>
              </View>
              <Text style={styles.statValue}>{stats.totalServices}</Text>
              <Text style={styles.statLabel}>Dịch vụ</Text>
              <View style={styles.statGlow} />
            </View>

            <View style={[styles.statCard, styles.statCardGreen]}>
              <View style={styles.statIconContainer}>
                <Text style={styles.statIcon}>⭐</Text>
              </View>
              <Text style={styles.statValue}>{stats.totalReviews}</Text>
              <Text style={styles.statLabel}>Đánh giá</Text>
              <View style={styles.statGlow} />
            </View>
          </View>
        </View>

        {/* Rating Card */}
        <View style={styles.ratingCard}>
          <View style={styles.ratingGlowEffect} />
          <View style={styles.ratingHeader}>
            <View>
              <Text style={styles.ratingTitle}>Đánh giá trung bình</Text>
              <Text style={styles.ratingSubtitle}>Từ {stats.totalReviews} đánh giá</Text>
            </View>
            <View style={styles.ratingBadge}>
              <Text style={styles.ratingBadgeText}>⭐ Top Rated</Text>
            </View>
          </View>
          
          <View style={styles.ratingContent}>
            <View style={styles.ratingScoreBox}>
              <Text style={styles.ratingScore}>{stats.averageRating}</Text>
              <Text style={styles.ratingOutOf}>/5.0</Text>
            </View>
            <Text style={styles.ratingStars}>{getRatingStars(stats.averageRating)}</Text>
          </View>

          {/* Rating Progress Bars */}
          <View style={styles.ratingBars}>
            {[5, 4, 3, 2, 1].map((star) => {
              const randomCount = stats.totalReviews > 0 ? Math.floor(Math.random() * stats.totalReviews / 2) : 0;
              const percentage = stats.totalReviews > 0 ? (randomCount / stats.totalReviews) * 100 : 0;
              return (
                <View key={star} style={styles.ratingBarRow}>
                  <Text style={styles.ratingBarLabel}>{star}★</Text>
                  <View style={styles.ratingBarTrack}>
                    <View 
                      style={[
                        styles.ratingBarFill,
                        { 
                          width: `${percentage}%`,
                          backgroundColor: star >= 4 ? '#4CAF50' : star >= 3 ? '#FFC107' : '#FF5722'
                        }
                      ]} 
                    />
                  </View>
                  <Text style={styles.ratingBarCount}>{randomCount}</Text>
                </View>
              );
            })}
          </View>
        </View>

        {/* Reviews Distribution Chart */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>📊 Phân tích đánh giá</Text>
            <View style={styles.sectionBadge}>
              <Text style={styles.sectionBadgeText}>{stats.totalReviews} total</Text>
            </View>
          </View>
          {renderReviewsPieChart()}
        </View>

        {/* Services Distribution Chart */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>🎯 Phân loại dịch vụ</Text>
            <View style={styles.sectionBadge}>
              <Text style={styles.sectionBadgeText}>{stats.totalServices} items</Text>
            </View>
          </View>
          {renderServicesBarChart()}
        </View>

        {/* Top Hotels */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>🏆 Top khách sạn</Text>
            <TouchableOpacity>
              <Text style={styles.viewAllText}>Xem tất cả →</Text>
            </TouchableOpacity>
          </View>

          {stats.topRatedHotels.length > 0 ? (
            stats.topRatedHotels.map((hotel, index) => (
              <View key={hotel.id} style={styles.hotelItem}>
                <View style={[
                  styles.hotelRank,
                  index === 0 && styles.rankGold,
                  index === 1 && styles.rankSilver,
                  index === 2 && styles.rankBronze,
                ]}>
                  <Text style={styles.hotelRankText}>
                    {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `#${index + 1}`}
                  </Text>
                </View>
                
                <View style={styles.hotelInfo}>
                  <Text style={styles.hotelName} numberOfLines={1}>{hotel.name}</Text>
                  <Text style={styles.hotelCity}>📍 {hotel.city}</Text>
                </View>
                
                <View style={styles.hotelRatingBox}>
                  <Text style={styles.hotelRating}>{hotel.rating}</Text>
                  <Text style={styles.hotelStar}>⭐</Text>
                </View>
              </View>
            ))
          ) : (
            <Text style={styles.emptyText}>Chưa có dữ liệu</Text>
          )}
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#64748B',
    fontWeight: '600',
  },

  // Header with Gradient
  headerWrapper: {
    position: 'relative',
    paddingTop: Platform.OS === 'ios' ? 50 : 20,
    paddingBottom: 30,
    overflow: 'hidden',
  },
  gradientBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 220,
    backgroundColor: '#6366F1',
    borderBottomLeftRadius: 40,
    borderBottomRightRadius: 40,
  },
  headerPatternLeft: {
    position: 'absolute',
    top: -40,
    left: -40,
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: 'rgba(139, 92, 246, 0.3)',
  },
  headerPatternRight: {
    position: 'absolute',
    top: 60,
    right: -60,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(99, 102, 241, 0.2)',
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    zIndex: 10,
  },
  backButton: {
    marginRight: 16,
  },
  backButtonCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.4)',
  },
  backButtonText: {
    fontSize: 26,
    color: '#FFF',
    fontWeight: 'bold',
  },
  headerTitleContainer: {
    flex: 1,
  },
  headerSubtitle: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.85)',
    fontWeight: '600',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: '900',
    color: '#FFF',
    letterSpacing: -0.5,
  },
  headerIconBox: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.4)',
  },
  headerIcon: {
    fontSize: 30,
  },

  // Content
  content: {
    flex: 1,
    marginTop: -20,
  },
  contentContainer: {
    padding: 20,
  },

  // Stats Section
  statsSection: {
    marginBottom: 24,
  },
  statsRow: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    marginHorizontal: 6,
    padding: 24,
    borderRadius: 24,
    position: 'relative',
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.15,
        shadowRadius: 16,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  statCardBlue: {
    backgroundColor: '#3B82F6',
  },
  statCardPurple: {
    backgroundColor: '#8B5CF6',
  },
  statCardPink: {
    backgroundColor: '#EC4899',
  },
  statCardGreen: {
    backgroundColor: '#10B981',
  },
  statGlow: {
    position: 'absolute',
    top: -30,
    right: -30,
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
  },
  statIconContainer: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  statIcon: {
    fontSize: 28,
  },
  statValue: {
    fontSize: 36,
    fontWeight: '900',
    color: '#FFF',
    marginBottom: 6,
    letterSpacing: -1,
  },
  statLabel: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.95)',
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  // Rating Card
  ratingCard: {
    backgroundColor: '#FFF',
    borderRadius: 28,
    padding: 28,
    marginBottom: 24,
    position: 'relative',
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#FFD700',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.3,
        shadowRadius: 24,
      },
      android: {
        elevation: 12,
      },
    }),
  },
  ratingGlowEffect: {
    position: 'absolute',
    top: -80,
    right: -80,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: '#FFF9E6',
  },
  ratingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 24,
  },
  ratingTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1E293B',
    marginBottom: 4,
  },
  ratingSubtitle: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '500',
  },
  ratingBadge: {
    backgroundColor: '#FFD700',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 14,
  },
  ratingBadgeText: {
    fontSize: 12,
    color: '#FFF',
    fontWeight: '800',
  },
  ratingContent: {
    alignItems: 'center',
    marginBottom: 28,
  },
  ratingScoreBox: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 12,
  },
  ratingScore: {
    fontSize: 64,
    fontWeight: '900',
    color: '#FFB800',
    letterSpacing: -2,
  },
  ratingOutOf: {
    fontSize: 28,
    color: '#CBD5E1',
    fontWeight: '700',
    marginLeft: 8,
  },
  ratingStars: {
    fontSize: 36,
  },
  ratingBars: {
    marginTop: 8,
  },
  ratingBarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  ratingBarLabel: {
    width: 35,
    fontSize: 14,
    fontWeight: '700',
    color: '#475569',
  },
  ratingBarTrack: {
    flex: 1,
    height: 10,
    backgroundColor: '#F1F5F9',
    borderRadius: 5,
    marginHorizontal: 12,
    overflow: 'hidden',
  },
  ratingBarFill: {
    height: '100%',
    borderRadius: 5,
  },
  ratingBarCount: {
    width: 40,
    fontSize: 14,
    fontWeight: '800',
    color: '#1E293B',
    textAlign: 'right',
  },

  // Section Card
  sectionCard: {
    backgroundColor: '#FFF',
    borderRadius: 24,
    padding: 24,
    marginBottom: 24,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 16,
      },
      android: {
        elevation: 6,
      },
    }),
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1E293B',
    letterSpacing: -0.5,
  },
  sectionBadge: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  sectionBadgeText: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  viewAllText: {
    fontSize: 14,
    color: '#6366F1',
    fontWeight: '700',
  },

  // Pie Chart
  pieChartContainer: {
    alignItems: 'center',
  },
  pieChart: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    width: width - 80,
    marginBottom: 24,
  },
  pieSlice: {
    width: (width - 80) / 2 - 4,
    height: 120,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 16,
    margin: 4,
  },
  pieSliceTour: {
    backgroundColor: '#007AFF',
  },
  pieSliceHotel: {
    backgroundColor: '#FF9500',
  },
  pieSliceInner: {
    alignItems: 'center',
  },
  piePercentage: {
    fontSize: 32,
    fontWeight: '900',
    color: '#FFF',
    marginBottom: 4,
  },
  pieLabel: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  chartLegendRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 24,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  legendDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    marginRight: 10,
  },
  legendText: {
    fontSize: 14,
    color: '#475569',
    fontWeight: '600',
  },
  emptyChartText: {
    fontSize: 15,
    color: '#94A3B8',
    fontWeight: '500',
    paddingVertical: 40,
  },

  // Bar Chart (Services)
  barChartContainer: {
    alignItems: 'center',
  },
  barChart: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    width: '100%',
    height: 180,
    marginBottom: 28,
    paddingHorizontal: 10,
  },
  barItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginHorizontal: 4,
  },
  barTrack: {
    width: '100%',
    height: 140,
    justifyContent: 'flex-end',
    marginBottom: 8,
  },
  barFill: {
    width: '100%',
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
    minHeight: 10,
  },
  barCount: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1E293B',
    marginBottom: 4,
  },
  barIcon: {
    fontSize: 20,
  },
  barLegend: {
    width: '100%',
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 12,
  },
  barLegendItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  barLegendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 6,
  },
  barLegendText: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '600',
  },

  // Hotel List
  hotelItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  hotelRank: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#E2E8F0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  rankGold: {
    backgroundColor: '#FFD700',
    ...Platform.select({
      ios: {
        shadowColor: '#FFD700',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.5,
        shadowRadius: 10,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  rankSilver: {
    backgroundColor: '#C0C0C0',
  },
  rankBronze: {
    backgroundColor: '#CD7F32',
  },
  hotelRankText: {
    fontSize: 20,
    fontWeight: '900',
  },
  hotelInfo: {
    flex: 1,
  },
  hotelName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 4,
  },
  hotelCity: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '600',
  },
  hotelRatingBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF9E6',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
  },
  hotelRating: {
    fontSize: 20,
    fontWeight: '900',
    color: '#FFB800',
    marginRight: 4,
  },
  hotelStar: {
    fontSize: 18,
  },

  emptyText: {
    fontSize: 15,
    color: '#94A3B8',
    textAlign: 'center',
    paddingVertical: 32,
    fontWeight: '500',
  },
});
