import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  Platform,
  RefreshControl,
  Dimensions,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { getCurrentUser, logout } from '../../services/authService';
import { getUsers } from '../../services/userService';
import { getTours } from '../../services/tourService';
import { getHotels } from '../../services/hotelService';
import { getServices } from '../../services/serviceService';
import { getAllBookings } from '../../services/bookingService';
import { getReviews } from '../../services/reviewService';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

// Custom Toast Component
const Toast = ({ visible, message, type, onHide }: any) => {
  const translateY = React.useRef(new Animated.Value(-100)).current;

  React.useEffect(() => {
    if (visible) {
      Animated.sequence([
        Animated.spring(translateY, {
          toValue: 0,
          useNativeDriver: true,
          tension: 50,
          friction: 8,
        }),
        Animated.delay(2500),
        Animated.timing(translateY, {
          toValue: -100,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start(() => onHide());
    }
  }, [visible]);

  if (!visible) return null;

  const colors = type === 'success' 
    ? (['#4CAF50', '#45a049'] as const)
    : type === 'error'
    ? (['#FF3B30', '#E53935'] as const)
    : (['#2196F3', '#1976D2'] as const);

  return (
    <Animated.View 
      style={[
        styles.toastContainer,
        { transform: [{ translateY }] }
      ]}
    >
      <LinearGradient colors={colors} style={styles.toastGradient}>
        <Text style={styles.toastIcon}>
          {type === 'success' ? '✓' : type === 'error' ? '✕' : 'ℹ'}
        </Text>
        <Text style={styles.toastText}>{message}</Text>
      </LinearGradient>
    </Animated.View>
  );
};

// Custom Confirmation Modal
const ConfirmModal = ({ visible, title, message, onConfirm, onCancel }: any) => {
  const scaleValue = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    if (visible) {
      Animated.spring(scaleValue, {
        toValue: 1,
        useNativeDriver: true,
        tension: 50,
        friction: 7,
      }).start();
    } else {
      scaleValue.setValue(0);
    }
  }, [visible]);

  return (
    <Modal
      transparent
      visible={visible}
      animationType="fade"
      onRequestClose={onCancel}
    >
      <View style={styles.modalOverlay}>
        <Animated.View style={[styles.modalContent, { transform: [{ scale: scaleValue }] }]}>
          {/* Icon Container */}
          <View style={styles.modalIconContainer}>
            <View style={styles.modalIconCircle}>
              <Text style={styles.modalIcon}>🚪</Text>
            </View>
          </View>
          
          {/* Body */}
          <View style={styles.modalBody}>
            <Text style={styles.modalTitle}>{title}</Text>
            <Text style={styles.modalMessage}>{message}</Text>
          </View>

          {/* Footer */}
          <View style={styles.modalFooter}>
            <TouchableOpacity style={styles.modalBtnCancel} onPress={onCancel}>
              <Text style={styles.modalBtnCancelText}>Hủy</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.modalBtnConfirm} onPress={onConfirm}>
              <Text style={styles.modalBtnConfirmText}>Đăng xuất</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
};

export default function AdminDashboardScreen() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const [activeMenu, setActiveMenu] = useState('dashboard');
  const [toast, setToast] = useState({ visible: false, message: '', type: 'info' });
  const slideAnim = React.useRef(new Animated.Value(-280)).current;
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalTours: 0,
    totalBookings: 0,
    totalServices: 0,
    totalHotels: 0,
    totalReviews: 0,
    totalRevenue: 0,
    pendingBookings: 0,
    averageRating: 0,
  });

  useEffect(() => {
    checkAdminAccess();
  }, []);

  useEffect(() => {
    if (sidebarVisible) {
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 50,
        friction: 8,
      }).start();
    } else {
      Animated.timing(slideAnim, {
        toValue: -280,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  }, [sidebarVisible]);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToast({ visible: true, message, type });
  };

  const checkAdminAccess = async () => {
    try {
      setIsLoading(true);
      const userData = await getCurrentUser();
      
      if (!userData) {
        showToast('Vui lòng đăng nhập để tiếp tục', 'error');
        setTimeout(() => router.replace('/(tabs)/profile'), 2000);
        return;
      }

      if (userData.role !== 'admin') {
        showToast('Bạn không có quyền truy cập', 'error');
        setTimeout(() => router.replace('/(tabs)'), 2000);
        return;
      }

      setUser(userData);
      loadDashboardStats();
    } catch (error) {
      showToast('Không thể xác thực quyền truy cập', 'error');
      setTimeout(() => router.replace('/(tabs)'), 2000);
    } finally {
      setIsLoading(false);
    }
  };

  const loadDashboardStats = async () => {
    try {
      const [usersData, toursData, hotelsData, servicesData, bookingsData, reviewsData] = 
        await Promise.all([
          getUsers({ limit: 1 }),
          getTours({ limit: 1 }),
          getHotels({ limit: 1 }),
          getServices({ limit: 1 }),
          getAllBookings({ limit: 1 }),
          getReviews({ limit: 100 }),
        ]);

      const allBookings = await getAllBookings({ limit: 1000 });
      const totalRevenue = allBookings.results.reduce((sum, b) => sum + (b.totalPrice || 0), 0);
      const pendingBookings = allBookings.results.filter(b => b.status === 'pending').length;

      const totalRating = reviewsData.results.reduce((sum, r) => sum + r.rating, 0);
      const averageRating = reviewsData.results.length > 0 ? totalRating / reviewsData.results.length : 0;

      setStats({
        totalUsers: usersData.totalResults,
        totalTours: toursData.totalResults,
        totalBookings: bookingsData.totalResults,
        totalServices: servicesData.totalResults,
        totalHotels: hotelsData.totalResults,
        totalReviews: reviewsData.totalResults,
        totalRevenue,
        pendingBookings,
        averageRating,
      });
    } catch (error) {
      showToast('Không thể tải dữ liệu', 'error');
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadDashboardStats();
    setRefreshing(false);
    showToast('Đã cập nhật dữ liệu', 'success');
  };

  const handleLogout = async () => {
    setShowLogoutModal(false);
    try {
      await logout();
      showToast('Đã đăng xuất thành công', 'success');
      setTimeout(() => router.replace('/login'), 1500);
    } catch (error) {
      showToast('Không thể đăng xuất', 'error');
    }
  };

  const menuItems = [
    { 
      id: 'users', 
      title: 'Người dùng', 
      subtitle: 'Quản lý tài khoản',
      icon: '👥', 
      route: '/admin/users', 
      color: '#2196F3',
      count: stats.totalUsers,
    },
    { 
      id: 'tours', 
      title: 'Tour du lịch', 
      subtitle: 'Quản lý tour',
      icon: '🗺️', 
      route: '/admin/tours', 
      color: '#FF9800',
      count: stats.totalTours,
    },
    { 
      id: 'hotels', 
      title: 'Khách sạn', 
      subtitle: 'Quản lý nơi ở',
      icon: '🏨', 
      route: '/admin/hotels', 
      color: '#00BCD4',
      count: stats.totalHotels,
    },
    { 
      id: 'services', 
      title: 'Dịch vụ', 
      subtitle: 'Dịch vụ bổ sung',
      icon: '🎫', 
      route: '/admin/services', 
      color: '#4CAF50',
      count: stats.totalServices,
    },
    { 
      id: 'statistics', 
      title: 'Thống kê', 
      subtitle: 'Báo cáo & phân tích',
      icon: '�', 
      route: '/admin/statistics', 
      color: '#9C27B0',
      count: 0,
    },
    { 
      id: 'reviews', 
      title: 'Đánh giá', 
      subtitle: 'Phản hồi khách',
      icon: '⭐', 
      route: '/admin/reviews', 
      color: '#FFC107',
      count: stats.totalReviews,
    },
  ];

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', { 
      style: 'currency', 
      currency: 'VND',
      notation: 'compact',
      maximumFractionDigits: 1
    }).format(amount);
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2196F3" />
        <Text style={styles.loadingText}>Đang tải...</Text>
      </View>
    );
  }

  if (!user || user.role !== 'admin') return null;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar style="dark" />
      
      <Toast 
        visible={toast.visible}
        message={toast.message}
        type={toast.type}
        onHide={() => setToast({ ...toast, visible: false })}
      />

      <ConfirmModal
        visible={showLogoutModal}
        title="Đăng xuất"
        message="Bạn có chắc muốn đăng xuất khỏi tài khoản admin?"
        onConfirm={handleLogout}
        onCancel={() => setShowLogoutModal(false)}
      />

      {/* Sidebar Modal */}
      {/* <Modal
        transparent
        visible={sidebarVisible}
        animationType="none"
        onRequestClose={toggleSidebar}
      >
        <View style={styles.sidebarOverlay}>
          <Animated.View 
            style={[
              styles.sidebar,
              { transform: [{ translateX: slideAnim }] }
            ]}
          >
            <View style={styles.sidebarHeader}>
              <Text style={styles.sidebarLogo}>✈️</Text>
              <Text style={styles.sidebarTitle}>Travel Admin</Text>
            </View>

            <View style={styles.sidebarUserInfo}>
              <View style={styles.sidebarAvatar}>
                <Text style={styles.sidebarAvatarText}>{user?.name?.charAt(0).toUpperCase()}</Text>
              </View>
              <View style={styles.sidebarUserDetails}>
                <Text style={styles.sidebarUserName}>{user?.name}</Text>
                <Text style={styles.sidebarUserRole}>Super Admin</Text>
              </View>
            </View>

            <View style={styles.sidebarMenuLabel}>
              <Text style={styles.sidebarMenuLabelText}>MENU</Text>
            </View>

            <ScrollView style={styles.sidebarMenu} showsVerticalScrollIndicator={false}>
              <TouchableOpacity 
                style={[styles.sidebarMenuItem, activeMenu === 'dashboard' && styles.sidebarMenuItemActive]}
                onPress={() => {
                  setActiveMenu('dashboard');
                  setSidebarVisible(false);
                }}
              >
                <Text style={styles.sidebarMenuIcon}>📊</Text>
                <Text style={[styles.sidebarMenuText, activeMenu === 'dashboard' && styles.sidebarMenuTextActive]}>
                  Dashboard
                </Text>
              </TouchableOpacity>

              {menuItems.map((item) => (
                <TouchableOpacity
                  key={item.id}
                  style={[styles.sidebarMenuItem, activeMenu === item.id && styles.sidebarMenuItemActive]}
                  onPress={() => handleMenuPress(item.route, item.id)}
                >
                  <Text style={styles.sidebarMenuIcon}>{item.icon}</Text>
                  <Text style={[styles.sidebarMenuText, activeMenu === item.id && styles.sidebarMenuTextActive]}>
                    {item.title}
                  </Text>
                  {item.count > 0 && (
                    <View style={styles.sidebarMenuBadge}>
                      <Text style={styles.sidebarMenuBadgeText}>{item.count}</Text>
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>

            <TouchableOpacity 
              style={styles.sidebarLogout}
              onPress={() => {
                setSidebarVisible(false);
                setTimeout(() => setShowLogoutModal(true), 300);
              }}
            >
              <View style={styles.logoutIconContainer}>
                <Text style={styles.sidebarLogoutIcon}>🚪</Text>
              </View>
              <Text style={styles.sidebarLogoutText}>Đăng xuất</Text>
            </TouchableOpacity>
          </Animated.View>
          <TouchableOpacity 
            style={styles.sidebarBackdrop} 
            activeOpacity={1} 
            onPress={toggleSidebar}
          />
        </View>
      </Modal> */}

      {/* Top Header */}
      <View style={styles.topHeader}>
        {/* <TouchableOpacity style={styles.menuButton} onPress={toggleSidebar}>
          <View style={styles.menuButtonLine} />
          <View style={styles.menuButtonLine} />
          <View style={styles.menuButtonLine} />
        </TouchableOpacity> */}
        
        <View style={styles.headerCenter}>
          <Text style={styles.headerLogo}>✈️</Text>
          <Text style={styles.headerTitle}>Travel Admin</Text>
        </View>

        <View style={styles.headerRight}>
          <TouchableOpacity
            style={styles.notificationButton}
            onPress={() => router.push('/notifications' as any)}
          >
            <Ionicons name="notifications-outline" size={24} color="#1A1A1A" />
            {/* {unreadNotifications > 0 && (
              <View style={styles.notificationBadge}>
                <Text style={styles.notificationBadgeText}>
                  {unreadNotifications > 99 ? '99+' : unreadNotifications}
                </Text>
              </View>
            )} */}
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.headerAvatar}
            onPress={() => router.push('/profile')}
          >
            <Text style={styles.headerAvatarText}>{user?.name?.charAt(0).toUpperCase()}</Text>
          </TouchableOpacity>
        </View>
      </View>
      
      <ScrollView 
        style={styles.content} 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.contentContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#2196F3" />
        }
      >
        <View style={styles.pageHeader}>
          <Text style={styles.pageTitle}>Dashboard</Text>
          <Text style={styles.pageSubtitle}>Xin chào, {user?.name}</Text>
        </View>

        {/* Stats Cards */}
        <View style={styles.statsGrid}>
          <View style={[styles.statCard, { borderLeftColor: '#2196F3' }]}>
            <View style={styles.statCardTop}>
              <View style={[styles.statCardIcon, { backgroundColor: '#E3F2FD' }]}>
              </View>
              <Text style={styles.statCardValue}>{formatNumber(stats.totalUsers)}</Text>
            </View>
            <Text style={styles.statCardLabel}>Người dùng</Text>
          </View>

          <View style={[styles.statCard, { borderLeftColor: '#FF9800' }]}>
            <View style={styles.statCardTop}>
              <View style={[styles.statCardIcon, { backgroundColor: '#FFF3E0' }]}>
              </View>
              <Text style={styles.statCardValue}>{formatNumber(stats.totalTours)}</Text>
            </View>
            <Text style={styles.statCardLabel}>Tour du lịch</Text>
          </View>

          <View style={[styles.statCard, { borderLeftColor: '#00BCD4' }]}>
            <View style={styles.statCardTop}>
              <View style={[styles.statCardIcon, { backgroundColor: '#E0F7FA' }]}>
                <Text style={styles.statCardEmoji}>🏨</Text>
              </View>
              <Text style={styles.statCardValue}>{formatNumber(stats.totalHotels)}</Text>
            </View>
            <Text style={styles.statCardLabel}>Khách sạn</Text>
          </View>

          <View style={[styles.statCard, { borderLeftColor: '#4CAF50' }]}>
            <View style={styles.statCardTop}>
              <View style={[styles.statCardIcon, { backgroundColor: '#E8F5E9' }]}>
                <Text style={styles.statCardEmoji}>🎫</Text>
              </View>
              <Text style={styles.statCardValue}>{formatNumber(stats.totalServices)}</Text>
            </View>
            <Text style={styles.statCardLabel}>Dịch vụ</Text>
          </View>

          <View style={[styles.statCard, { borderLeftColor: '#9C27B0' }]}>
            <View style={styles.statCardTop}>
              <View style={[styles.statCardIcon, { backgroundColor: '#F3E5F5' }]}>
                <Text style={styles.statCardEmoji}>📊</Text>
              </View>
              <Text style={styles.statCardValue}>{formatNumber(stats.totalBookings)}</Text>
            </View>
            <Text style={styles.statCardLabel}>Đặt phòng</Text>
          </View>

          <View style={[styles.statCard, { borderLeftColor: '#FFC107' }]}>
            <View style={styles.statCardTop}>
              <View style={[styles.statCardIcon, { backgroundColor: '#FFF8E1' }]}>
                <Text style={styles.statCardEmoji}>⭐</Text>
              </View>
              <Text style={styles.statCardValue}>{formatNumber(stats.totalReviews)}</Text>
            </View>
            <Text style={styles.statCardLabel}>Đánh giá</Text>
          </View>
        </View>

        {/* Pending Bookings Alert */}
        {/* {stats.pendingBookings > 0 && (
          <TouchableOpacity 
            style={styles.alertCard}
            onPress={() => router.push('/admin/bookings')}
            activeOpacity={0.9}
          >
            <View style={styles.alertIconBox}>
              <Text style={styles.alertEmoji}>⚠️</Text>
            </View>
            <View style={styles.alertContent}>
              <Text style={styles.alertTitle}>Cần xử lý ngay!</Text>
              <Text style={styles.alertText}>{stats.pendingBookings} đơn đặt phòng đang chờ duyệt</Text>
            </View>
            <Text style={styles.alertArrow}>→</Text>
          </TouchableOpacity>
        )} */}

        {/* Quick Actions */}
        <View style={styles.quickActions}>
          <Text style={styles.sectionTitle}>Quản lý nhanh</Text>
          
          <View style={styles.actionGrid}>
            {menuItems.map((item) => (
              <TouchableOpacity
                key={item.id}
                style={styles.actionCard}
                onPress={() => router.push(item.route as any)}
                activeOpacity={0.8}
              >
                <View style={[styles.actionCardBorder, { backgroundColor: item.color }]} />
                <View style={styles.actionCardContent}>
                  <Text style={styles.actionCardIcon}>{item.icon}</Text>
                  <View style={styles.actionCardInfo}>
                    <Text style={styles.actionCardTitle}>{item.title}</Text>
                    <Text style={styles.actionCardSubtitle}>{item.subtitle}</Text>
                  </View>
                  {item.count > 0 && (
                    <View style={[styles.actionCardBadge, { backgroundColor: item.color }]}>
                      <Text style={styles.actionCardBadgeText}>{formatNumber(item.count)}</Text>
                    </View>
                  )}
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#F0F2F5' 
  },
  loadingContainer: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center', 
    backgroundColor: '#F0F2F5' 
  },
  loadingText: { 
    marginTop: 16, 
    fontSize: 16, 
    color: '#2196F3', 
    fontWeight: '600' 
  },
  
  // Toast Styles
  toastContainer: { 
    position: 'absolute', 
    top: Platform.OS === 'ios' ? 50 : 30, 
    left: 20, 
    right: 20, 
    zIndex: 9999 
  },
  toastGradient: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    padding: 16, 
    borderRadius: 16, 
    shadowColor: '#000', 
    shadowOffset: { width: 0, height: 4 }, 
    shadowOpacity: 0.3, 
    shadowRadius: 8, 
    elevation: 8 
  },
  toastIcon: { 
    fontSize: 24, 
    marginRight: 12, 
    color: '#fff' 
  },
  toastText: { 
    flex: 1, 
    fontSize: 15, 
    fontWeight: '600', 
    color: '#fff' 
  },
  
  // Modal Styles
  modalOverlay: { 
    flex: 1, 
    backgroundColor: 'rgba(0, 0, 0, 0.6)', 
    justifyContent: 'center', 
    alignItems: 'center', 
    padding: 20 
  },
  modalContent: { 
    backgroundColor: '#fff', 
    borderRadius: 24, 
    width: '100%', 
    maxWidth: 360, 
    overflow: 'hidden' 
  },
  modalIconContainer: {
    paddingTop: 32,
    alignItems: 'center',
  },
  modalIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FFF5F5',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#FF3B30',
  },
  modalIcon: { 
    fontSize: 40,
  },
  modalBody: { 
    paddingHorizontal: 28,
    paddingTop: 24,
    paddingBottom: 24,
    alignItems: 'center',
  },
  modalTitle: { 
    fontSize: 22, 
    fontWeight: '800', 
    color: '#1A1A1A',
    marginBottom: 8,
  },
  modalMessage: { 
    fontSize: 15, 
    color: '#666', 
    textAlign: 'center', 
    lineHeight: 22,
  },
  modalFooter: { 
    flexDirection: 'row', 
    padding: 16, 
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  modalBtnCancel: { 
    flex: 1, 
    paddingVertical: 16, 
    borderRadius: 12, 
    backgroundColor: '#F5F5F5', 
    alignItems: 'center',
  },
  modalBtnCancelText: { 
    fontSize: 16, 
    fontWeight: '700', 
    color: '#666',
  },
  modalBtnConfirm: { 
    flex: 1, 
    paddingVertical: 16, 
    borderRadius: 12, 
    alignItems: 'center',
    backgroundColor: '#FF3B30',
  },
  modalBtnConfirmText: { 
    fontSize: 16, 
    fontWeight: '700', 
    color: '#FFFFFF',
  },

  // Sidebar Styles
  sidebarOverlay: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'flex-start',
  },
  sidebarBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  sidebar: {
    width: 280,
    backgroundColor: '#FFFFFF',
    height: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 2, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 10,
  },
  sidebarHeader: {
    backgroundColor: '#2196F3',
    padding: 20,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  sidebarLogo: {
    fontSize: 28,
  },
  sidebarTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  sidebarUserInfo: {
    backgroundColor: '#FFFFFF',
    margin: 16,
    padding: 16,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: '#2196F3',
  },
  sidebarAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#2196F3',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sidebarAvatarText: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  sidebarUserDetails: {
    flex: 1,
  },
  sidebarUserName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 4,
  },
  sidebarUserRole: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
  sidebarMenuLabel: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F2F5',
  },
  sidebarMenuLabelText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#666',
    letterSpacing: 1,
  },
  sidebarMenu: {
    flex: 1,
    paddingVertical: 8,
  },
  sidebarMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    gap: 12,
    borderLeftWidth: 3,
    borderLeftColor: 'transparent',
  },
  sidebarMenuItemActive: {
    backgroundColor: '#E3F2FD',
    borderLeftColor: '#2196F3',
  },
  sidebarMenuIcon: {
    fontSize: 20,
  },
  sidebarMenuText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  sidebarMenuTextActive: {
    color: '#2196F3',
    fontWeight: '700',
  },
  sidebarMenuBadge: {
    backgroundColor: '#2196F3',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    minWidth: 24,
    alignItems: 'center',
  },
  sidebarMenuBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  sidebarLogout: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 18,
    gap: 14,
    borderTopWidth: 1,
    borderTopColor: '#F0F2F5',
    backgroundColor: '#FFF5F5',
    marginTop: 'auto',
  },
  logoutIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFE5E5',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FF3B30',
  },
  sidebarLogoutIcon: {
    fontSize: 18,
  },
  sidebarLogoutText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FF3B30',
    letterSpacing: 0.3,
  },

  // Top Header Styles
  topHeader: {
    backgroundColor: '#FFFFFF',
    paddingTop: Platform.OS === 'ios' ? 50 : 20,
    paddingBottom: 16,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F2F5',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 3,
  },
  menuButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    gap: 5,
  },
  menuButtonLine: {
    width: 24,
    height: 2,
    backgroundColor: '#1A1A1A',
    borderRadius: 1,
  },
  headerCenter: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    gap: 8,
  },
  headerLogo: {
    fontSize: 24,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#2196F3',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  notificationBtn: {
    position: 'relative',
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F0F2F5',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  notificationIcon: {
    fontSize: 22,
  },
  notificationBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: '#FF3B30',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  notificationBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  headerAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#2196F3',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#1976D2',
  },
  headerAvatarText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },

  // Content Styles
  content: { 
    flex: 1 
  },
  contentContainer: { 
    padding: 20,
    paddingBottom: 40 
  },
  pageHeader: {
    marginBottom: 24,
  },
  pageTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#1A1A1A',
    marginBottom: 4,
  },
  pageSubtitle: {
    fontSize: 15,
    color: '#666',
    fontWeight: '500',
  },

  // Stats Grid
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 20,
  },
  statCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    width: (width - 52) / 2,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  statCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  statCardIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statCardEmoji: {
    fontSize: 22,
  },
  statCardValue: {
    fontSize: 24,
    fontWeight: '800',
    color: '#1A1A1A',
  },
  statCardLabel: {
    fontSize: 13,
    color: '#666',
    fontWeight: '600',
  },

  // Alert Card
  alertCard: {
    backgroundColor: '#FFF3CD',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#FFE69C',
  },
  alertIconBox: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  alertEmoji: {
    fontSize: 22,
  },
  alertContent: {
    flex: 1,
  },
  alertTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#856404',
    marginBottom: 4,
  },
  alertText: {
    fontSize: 13,
    color: '#856404',
    fontWeight: '500',
  },
  alertArrow: {
    fontSize: 20,
    color: '#856404',
    fontWeight: '600',
  },

  // Quick Actions
  quickActions: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 16,
  },
  actionGrid: {
    gap: 12,
  },
  actionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  actionCardBorder: {
    height: 4,
  },
  actionCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
  },
  actionCardIcon: {
    fontSize: 28,
  },
  actionCardInfo: {
    flex: 1,
  },
  actionCardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 4,
  },
  actionCardSubtitle: {
    fontSize: 13,
    color: '#666',
    fontWeight: '500',
  },
  actionCardBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    minWidth: 44,
    alignItems: 'center',
  },
  actionCardBadgeText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
    notificationButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F5F7FA',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
});
