import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Platform,
  Dimensions,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { getUsers } from '../../services/userService';
import { getTours } from '../../services/tourService';
import { getHotels } from '../../services/hotelService';
import { getServices } from '../../services/serviceService';
import { getAllBookings } from '../../services/bookingService';
import { getReviews } from '../../services/reviewService';

const { width } = Dimensions.get('window');

interface Stats {
  totalUsers: number;
  totalTours: number;
  totalHotels: number;
  totalServices: number;
  totalBookings: number;
  totalReviews: number;
  totalRevenue: number;
  pendingBookings: number;
  confirmedBookings: number;
  completedBookings: number;
  cancelledBookings: number;
  averageRating: number;
  recentUsers: number;
  recentTours: number;
  recentBookings: number;
}

export default function AdminStatisticsScreen() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState<Stats>({
    totalUsers: 0,
    totalTours: 0,
    totalHotels: 0,
    totalServices: 0,
    totalBookings: 0,
    totalReviews: 0,
    totalRevenue: 0,
    pendingBookings: 0,
    confirmedBookings: 0,
    completedBookings: 0,
    cancelledBookings: 0,
    averageRating: 0,
    recentUsers: 0,
    recentTours: 0,
    recentBookings: 0,
  });

  useEffect(() => {
    loadStatistics();
  }, []);

  const loadStatistics = async () => {
    try {
      setIsLoading(true);

      // Fetch all data
      const [usersData, toursData, hotelsData, servicesData, bookingsData, reviewsData] = 
        await Promise.all([
          getUsers({ limit: 1000, sortBy: 'createdAt:desc' }),
          getTours({ limit: 1000, sortBy: 'createdAt:desc' }),
          getHotels({ limit: 1000 }),
          getServices({ limit: 1000 }),
          getAllBookings({ limit: 1000 }),
          getReviews({ limit: 1000 }),
        ]);

      // Calculate revenue
      const totalRevenue = bookingsData.results.reduce((sum, b) => sum + (b.totalPrice || 0), 0);

      // Count booking statuses
      const pendingBookings = bookingsData.results.filter(b => b.status === 'pending').length;
      const confirmedBookings = bookingsData.results.filter(b => b.status === 'confirmed').length;
      const completedBookings = bookingsData.results.filter(b => b.status === 'completed').length;
      const cancelledBookings = bookingsData.results.filter(b => b.status === 'cancelled').length;

      // Calculate average rating
      const totalRating = reviewsData.results.reduce((sum, r) => sum + r.rating, 0);
      const averageRating = reviewsData.results.length > 0 ? totalRating / reviewsData.results.length : 0;

      // Calculate recent data (last 7 days)
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const recentUsers = usersData.results.filter(u => 
        new Date(u.createdAt) >= sevenDaysAgo
      ).length;

      const recentTours = toursData.results.filter(t => 
        new Date(t.createdAt) >= sevenDaysAgo
      ).length;

      const recentBookings = bookingsData.results.filter(b => 
        new Date(b.createdAt) >= sevenDaysAgo
      ).length;

      setStats({
        totalUsers: usersData.totalResults,
        totalTours: toursData.totalResults,
        totalHotels: hotelsData.totalResults,
        totalServices: servicesData.totalResults,
        totalBookings: bookingsData.totalResults,
        totalReviews: reviewsData.totalResults,
        totalRevenue,
        pendingBookings,
        confirmedBookings,
        completedBookings,
        cancelledBookings,
        averageRating,
        recentUsers,
        recentTours,
        recentBookings,
      });
    } catch (error: any) {
      console.error('Error loading statistics:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadStatistics();
    setRefreshing(false);
  }, []);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(amount);
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
  };

  const getPercentage = (value: number, total: number) => {
    if (total === 0) return 0;
    return Math.round((value / total) * 100);
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2196F3" />
        <Text style={styles.loadingText}>Đang tải thống kê...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerSubtitle}>Báo cáo</Text>
          <Text style={styles.headerTitle}>Thống kê tổng quan</Text>
        </View>
        <View style={styles.headerBadge}>
          <Text style={styles.headerBadgeIcon}>📊</Text>
        </View>
      </View>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Revenue Card */}
        <View style={styles.revenueCard}>
          <View style={styles.revenueHeader}>
            <View>
              <Text style={styles.revenueLabel}>Tổng doanh thu</Text>
              <Text style={styles.revenueValue}>{formatCurrency(stats.totalRevenue)}</Text>
            </View>
            <View style={styles.revenueIcon}>
              <Text style={styles.revenueEmoji}>💰</Text>
            </View>
          </View>
          <View style={styles.revenueFooter}>
            <Text style={styles.revenueFooterText}>
              📈 Từ {stats.totalBookings} đơn đặt phòng
            </Text>
          </View>
        </View>

        {/* Main Stats Grid */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Tổng quan hệ thống</Text>
          <View style={styles.statsGrid}>
            <View style={[styles.statCard, { borderLeftColor: '#2196F3' }]}>
              <View style={[styles.statIcon, { backgroundColor: '#E3F2FD' }]}>
                <Text style={styles.statEmoji}>👥</Text>
              </View>
              <Text style={styles.statValue}>{formatNumber(stats.totalUsers)}</Text>
              <Text style={styles.statLabel}>Người dùng</Text>
              <View style={styles.statBadge}>
                <Text style={styles.statBadgeText}>+{stats.recentUsers} tuần này</Text>
              </View>
            </View>

            <View style={[styles.statCard, { borderLeftColor: '#FF9800' }]}>
              <View style={[styles.statIcon, { backgroundColor: '#FFF3E0' }]}>
                <Text style={styles.statEmoji}>🗺️</Text>
              </View>
              <Text style={styles.statValue}>{formatNumber(stats.totalTours)}</Text>
              <Text style={styles.statLabel}>Tour du lịch</Text>
              <View style={styles.statBadge}>
                <Text style={styles.statBadgeText}>+{stats.recentTours} tuần này</Text>
              </View>
            </View>

            <View style={[styles.statCard, { borderLeftColor: '#00BCD4' }]}>
              <View style={[styles.statIcon, { backgroundColor: '#E0F7FA' }]}>
                <Text style={styles.statEmoji}>🏨</Text>
              </View>
              <Text style={styles.statValue}>{formatNumber(stats.totalHotels)}</Text>
              <Text style={styles.statLabel}>Khách sạn</Text>
            </View>

            <View style={[styles.statCard, { borderLeftColor: '#4CAF50' }]}>
              <View style={[styles.statIcon, { backgroundColor: '#E8F5E9' }]}>
                <Text style={styles.statEmoji}>🎫</Text>
              </View>
              <Text style={styles.statValue}>{formatNumber(stats.totalServices)}</Text>
              <Text style={styles.statLabel}>Dịch vụ</Text>
            </View>
          </View>
        </View>

        {/* Booking Status */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Trạng thái đặt phòng</Text>
          <View style={styles.bookingStatusCard}>
            {/* Pending */}
            <View style={styles.bookingStatusItem}>
              <View style={styles.bookingStatusHeader}>
                <View style={styles.bookingStatusLeft}>
                  <View style={[styles.bookingStatusDot, { backgroundColor: '#FF9500' }]} />
                  <Text style={styles.bookingStatusLabel}>Chờ xử lý</Text>
                </View>
                <View style={styles.bookingStatusRight}>
                  <Text style={styles.bookingStatusValue}>{stats.pendingBookings}</Text>
                  <Text style={styles.bookingStatusPercent}>
                    {getPercentage(stats.pendingBookings, stats.totalBookings)}%
                  </Text>
                </View>
              </View>
              <View style={styles.progressBarContainer}>
                <View 
                  style={[
                    styles.progressBar, 
                    { 
                      width: `${getPercentage(stats.pendingBookings, stats.totalBookings)}%`,
                      backgroundColor: '#FF9500'
                    }
                  ]} 
                />
              </View>
            </View>

            {/* Confirmed */}
            <View style={styles.bookingStatusItem}>
              <View style={styles.bookingStatusHeader}>
                <View style={styles.bookingStatusLeft}>
                  <View style={[styles.bookingStatusDot, { backgroundColor: '#4CAF50' }]} />
                  <Text style={styles.bookingStatusLabel}>Đã xác nhận</Text>
                </View>
                <View style={styles.bookingStatusRight}>
                  <Text style={styles.bookingStatusValue}>{stats.confirmedBookings}</Text>
                  <Text style={styles.bookingStatusPercent}>
                    {getPercentage(stats.confirmedBookings, stats.totalBookings)}%
                  </Text>
                </View>
              </View>
              <View style={styles.progressBarContainer}>
                <View 
                  style={[
                    styles.progressBar, 
                    { 
                      width: `${getPercentage(stats.confirmedBookings, stats.totalBookings)}%`,
                      backgroundColor: '#4CAF50'
                    }
                  ]} 
                />
              </View>
            </View>

            {/* Completed */}
            <View style={styles.bookingStatusItem}>
              <View style={styles.bookingStatusHeader}>
                <View style={styles.bookingStatusLeft}>
                  <View style={[styles.bookingStatusDot, { backgroundColor: '#2196F3' }]} />
                  <Text style={styles.bookingStatusLabel}>Hoàn thành</Text>
                </View>
                <View style={styles.bookingStatusRight}>
                  <Text style={styles.bookingStatusValue}>{stats.completedBookings}</Text>
                  <Text style={styles.bookingStatusPercent}>
                    {getPercentage(stats.completedBookings, stats.totalBookings)}%
                  </Text>
                </View>
              </View>
              <View style={styles.progressBarContainer}>
                <View 
                  style={[
                    styles.progressBar, 
                    { 
                      width: `${getPercentage(stats.completedBookings, stats.totalBookings)}%`,
                      backgroundColor: '#2196F3'
                    }
                  ]} 
                />
              </View>
            </View>

            {/* Cancelled */}
            <View style={styles.bookingStatusItem}>
              <View style={styles.bookingStatusHeader}>
                <View style={styles.bookingStatusLeft}>
                  <View style={[styles.bookingStatusDot, { backgroundColor: '#FF3B30' }]} />
                  <Text style={styles.bookingStatusLabel}>Đã hủy</Text>
                </View>
                <View style={styles.bookingStatusRight}>
                  <Text style={styles.bookingStatusValue}>{stats.cancelledBookings}</Text>
                  <Text style={styles.bookingStatusPercent}>
                    {getPercentage(stats.cancelledBookings, stats.totalBookings)}%
                  </Text>
                </View>
              </View>
              <View style={styles.progressBarContainer}>
                <View 
                  style={[
                    styles.progressBar, 
                    { 
                      width: `${getPercentage(stats.cancelledBookings, stats.totalBookings)}%`,
                      backgroundColor: '#FF3B30'
                    }
                  ]} 
                />
              </View>
            </View>

            {/* Total Summary */}
            <View style={styles.bookingTotalSummary}>
              <Text style={styles.bookingTotalLabel}>Tổng đơn đặt phòng</Text>
              <Text style={styles.bookingTotalValue}>{stats.totalBookings}</Text>
            </View>
          </View>
        </View>

        {/* Reviews & Rating */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Đánh giá & Phản hồi</Text>
          <View style={styles.reviewsCard}>
            <View style={styles.ratingHeader}>
              <View style={styles.ratingStarContainer}>
                <Text style={styles.ratingStarIcon}>⭐</Text>
                <Text style={styles.ratingValue}>{stats.averageRating.toFixed(1)}</Text>
              </View>
              <Text style={styles.ratingSubtext}>Điểm trung bình</Text>
              <View style={styles.ratingStars}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <Text 
                    key={star} 
                    style={[
                      styles.ratingStar,
                      { opacity: star <= Math.round(stats.averageRating) ? 1 : 0.3 }
                    ]}
                  >
                    ⭐
                  </Text>
                ))}
              </View>
            </View>

            <View style={styles.reviewsDividerHorizontal} />

            <View style={styles.reviewsCountSection}>
              <View style={styles.reviewsCountItem}>
                <Text style={styles.reviewsCountEmoji}>💬</Text>
                <Text style={styles.reviewsCountValue}>{formatNumber(stats.totalReviews)}</Text>
                <Text style={styles.reviewsCountLabel}>Tổng đánh giá</Text>
              </View>
              <View style={styles.reviewsCountItem}>
                <Text style={styles.reviewsCountEmoji}>🗺️</Text>
                <Text style={styles.reviewsCountValue}>
                  {Math.round((stats.totalReviews / (stats.totalTours + stats.totalHotels)) * 10) / 10}
                </Text>
                <Text style={styles.reviewsCountLabel}>Trung bình/tour</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Recent Activity */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Hoạt động 7 ngày qua</Text>
          <View style={styles.activityCard}>
            <View style={styles.activityItem}>
              <View style={[styles.activityIcon, { backgroundColor: '#E3F2FD' }]}>
                <Text style={styles.activityEmoji}>👤</Text>
              </View>
              <View style={styles.activityContent}>
                <Text style={styles.activityValue}>{stats.recentUsers}</Text>
                <Text style={styles.activityLabel}>Người dùng mới</Text>
              </View>
            </View>

            <View style={styles.activityItem}>
              <View style={[styles.activityIcon, { backgroundColor: '#FFF3E0' }]}>
                <Text style={styles.activityEmoji}>🗺️</Text>
              </View>
              <View style={styles.activityContent}>
                <Text style={styles.activityValue}>{stats.recentTours}</Text>
                <Text style={styles.activityLabel}>Tour mới</Text>
              </View>
            </View>

            <View style={styles.activityItem}>
              <View style={[styles.activityIcon, { backgroundColor: '#F3E5F5' }]}>
                <Text style={styles.activityEmoji}>📋</Text>
              </View>
              <View style={styles.activityContent}>
                <Text style={styles.activityValue}>{stats.recentBookings}</Text>
                <Text style={styles.activityLabel}>Đơn đặt mới</Text>
              </View>
            </View>
          </View>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F0F2F5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F0F2F5',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#2196F3',
    fontWeight: '600',
  },

  // Header
  header: {
    backgroundColor: '#FFFFFF',
    paddingTop: Platform.OS === 'ios' ? 50 : 30,
    paddingBottom: 20,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    shadowColor: '#2196F3',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F8F9FA',
    justifyContent: 'center',
    alignItems: 'center',
  },
  backButtonText: {
    fontSize: 24,
    color: '#2196F3',
    fontWeight: '600',
  },
  headerTitleContainer: {
    flex: 1,
    marginLeft: 16,
  },
  headerSubtitle: {
    fontSize: 11,
    color: '#999',
    marginBottom: 2,
    textTransform: 'uppercase',
    letterSpacing: 1,
    fontWeight: '600',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#2196F3',
    letterSpacing: -0.5,
  },
  headerBadge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#E3F2FD',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerBadgeIcon: {
    fontSize: 24,
  },

  // Content
  content: {
    flex: 1,
  },
  section: {
    paddingHorizontal: 20,
    marginTop: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 12,
  },

  // Revenue Card
  revenueCard: {
    backgroundColor: '#2196F3',
    marginHorizontal: 20,
    marginTop: 20,
    borderRadius: 20,
    padding: 24,
    shadowColor: '#2196F3',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  revenueHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  revenueLabel: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    fontWeight: '600',
    marginBottom: 8,
  },
  revenueValue: {
    fontSize: 32,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -1,
  },
  revenueIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  revenueEmoji: {
    fontSize: 28,
  },
  revenueFooter: {
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.2)',
  },
  revenueFooterText: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.9)',
    fontWeight: '600',
  },

  // Stats Grid
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  statCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    width: (width - 52) / 2,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  statIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  statEmoji: {
    fontSize: 24,
  },
  statValue: {
    fontSize: 28,
    fontWeight: '800',
    color: '#1A1A1A',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 13,
    color: '#666',
    fontWeight: '600',
    marginBottom: 8,
  },
  statBadge: {
    backgroundColor: '#F8F9FA',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  statBadgeText: {
    fontSize: 11,
    color: '#4CAF50',
    fontWeight: '700',
  },

  // Booking Status
  bookingStatusCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
    gap: 20,
  },
  bookingStatusItem: {
    gap: 12,
  },
  bookingStatusHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  bookingStatusLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  bookingStatusDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  bookingStatusLabel: {
    fontSize: 15,
    color: '#1A1A1A',
    fontWeight: '600',
  },
  bookingStatusRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  bookingStatusValue: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1A1A1A',
  },
  bookingStatusPercent: {
    fontSize: 13,
    color: '#666',
    fontWeight: '600',
    minWidth: 40,
    textAlign: 'right',
  },
  progressBarContainer: {
    height: 8,
    backgroundColor: '#F0F2F5',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    borderRadius: 4,
  },
  bookingTotalSummary: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 16,
    borderTopWidth: 2,
    borderTopColor: '#2196F3',
    marginTop: 4,
  },
  bookingTotalLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  bookingTotalValue: {
    fontSize: 24,
    fontWeight: '800',
    color: '#2196F3',
  },

  // Reviews Card
  reviewsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  ratingHeader: {
    alignItems: 'center',
    paddingBottom: 20,
  },
  ratingStarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  ratingStarIcon: {
    fontSize: 40,
  },
  ratingValue: {
    fontSize: 48,
    fontWeight: '800',
    color: '#1A1A1A',
  },
  ratingSubtext: {
    fontSize: 14,
    color: '#666',
    fontWeight: '600',
    marginBottom: 12,
  },
  ratingStars: {
    flexDirection: 'row',
    gap: 4,
  },
  ratingStar: {
    fontSize: 20,
  },
  reviewsDividerHorizontal: {
    height: 1,
    backgroundColor: '#F0F0F0',
    marginVertical: 4,
  },
  reviewsCountSection: {
    flexDirection: 'row',
    paddingTop: 20,
    gap: 20,
  },
  reviewsCountItem: {
    flex: 1,
    alignItems: 'center',
    gap: 8,
  },
  reviewsCountEmoji: {
    fontSize: 28,
  },
  reviewsCountValue: {
    fontSize: 24,
    fontWeight: '800',
    color: '#1A1A1A',
  },
  reviewsCountLabel: {
    fontSize: 12,
    color: '#666',
    fontWeight: '600',
    textAlign: 'center',
  },

  // Activity Card
  activityCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    gap: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  activityIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  activityEmoji: {
    fontSize: 28,
  },
  activityContent: {
    flex: 1,
  },
  activityValue: {
    fontSize: 24,
    fontWeight: '800',
    color: '#1A1A1A',
    marginBottom: 4,
  },
  activityLabel: {
    fontSize: 14,
    color: '#666',
    fontWeight: '600',
  },
});
