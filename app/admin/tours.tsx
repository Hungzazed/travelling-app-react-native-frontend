import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  RefreshControl,
  Dimensions,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { getCurrentUser } from '../../services/authService';
import {
  getAllBookings,
  confirmBooking as confirmBookingAPI,
  rejectBooking as rejectBookingAPI,
  Booking as BookingType,
} from '../../services/bookingService';

const { width } = Dimensions.get('window');

interface Booking {
  id: string;
  userId: any;
  tourId: any;
  hotelId?: any;
  services?: any[];
  numberOfPeople: number;
  startDate: string;
  endDate: string;
  totalPrice: number;
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed';
  paymentStatus: 'unpaid' | 'paid' | 'refunded';
  createdAt: string;
  updatedAt: string;
  tourName?: string;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
}

export default function AdminToursScreen() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'pending' | 'confirmed' | 'cancelled'>('all');
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [actionBookingId, setActionBookingId] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    checkAdminAccess();
  }, []);

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 500);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const checkAdminAccess = async () => {
    try {
      setIsLoading(true);
      const userData = await getCurrentUser();
      
      if (!userData || userData.role !== 'admin') {
        Alert.alert('Không có quyền truy cập', 'Bạn không có quyền truy cập trang này', [
          { text: 'OK', onPress: () => router.back() },
        ]);
        return;
      }

      await loadBookings();
    } catch (error) {
      console.error('Error checking admin access:', error);
      Alert.alert('Lỗi', 'Không thể xác thực quyền truy cập');
      router.back();
    } finally {
      setIsLoading(false);
    }
  };

  const loadBookings = async (page: number = 1) => {
    try {
      const params: any = {
        page,
        limit: 20,
        sortBy: 'createdAt:desc',
      };

      // Add filter if not 'all'
      if (activeFilter !== 'all') {
        params.status = activeFilter;
      }

      // Add search if exists
      if (debouncedSearch.trim()) {
        params.search = debouncedSearch.trim();
      }

      const response = await getAllBookings(params);
      
      // Transform data to include user and tour info
      const transformedBookings: Booking[] = response.results.map((booking: any) => ({
        ...booking,
        id: booking.id || booking._id,
        tourName: booking.tourId?.name || booking.tour?.name || 'Tour không xác định',
        customerName: booking.userId?.name || booking.user?.name || 'Khách hàng',
        customerEmail: booking.userId?.email || booking.user?.email || '',
        customerPhone: booking.userId?.phone || booking.user?.phone || '',
      }));

      setBookings(transformedBookings);
      setTotalPages(response.totalPages);
      setCurrentPage(response.page);
    } catch (error: any) {
      console.error('Error loading bookings:', error);
      Alert.alert('Lỗi', error.response?.data?.message || 'Không thể tải danh sách booking');
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadBookings();
    setRefreshing(false);
  };

  const handleApprove = async (bookingId: string) => {
    setActionBookingId(bookingId);
    setShowConfirmModal(true);
  };

  const confirmApprove = async () => {
    if (!actionBookingId) return;
    
    try {
      setIsProcessing(true);
      await confirmBookingAPI(actionBookingId);
      setBookings(prev =>
        prev.map(booking =>
          booking.id === actionBookingId
            ? { ...booking, status: 'confirmed' as const }
            : booking
        )
      );
      setShowConfirmModal(false);
      setActionBookingId(null);
      // Success feedback is shown in the modal
    } catch (error: any) {
      console.error('Error approving booking:', error);
      Alert.alert('Lỗi', error.response?.data?.message || 'Không thể phê duyệt booking');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReject = async (bookingId: string) => {
    setActionBookingId(bookingId);
    setShowRejectModal(true);
  };

  const confirmReject = async () => {
    if (!actionBookingId) return;
    
    try {
      setIsProcessing(true);
      await rejectBookingAPI(actionBookingId);
      setBookings(prev =>
        prev.map(booking =>
          booking.id === actionBookingId
            ? { ...booking, status: 'cancelled' as const }
            : booking
        )
      );
      setShowRejectModal(false);
      setActionBookingId(null);
      // Success feedback is shown in the modal
    } catch (error: any) {
      console.error('Error rejecting booking:', error);
      Alert.alert('Lỗi', error.response?.data?.message || 'Không thể từ chối booking');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleViewDetail = (booking: Booking) => {
    setSelectedBooking(booking);
    setShowDetailModal(true);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const formatDateTime = (dateString: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return '#FF9500';
      case 'confirmed':
        return '#4CAF50';
      case 'cancelled':
        return '#FF3B30';
      case 'completed':
        return '#2196F3';
      default:
        return '#999';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending':
        return 'Chờ duyệt';
      case 'confirmed':
        return 'Đã duyệt';
      case 'cancelled':
        return 'Đã hủy';
      case 'completed':
        return 'Hoàn thành';
      default:
        return status;
    }
  };

  const getPaymentStatusText = (status: string) => {
    switch (status) {
      case 'unpaid':
        return 'Chưa thanh toán';
      case 'paid':
        return 'Đã thanh toán';
      case 'refunded':
        return 'Đã hoàn tiền';
      default:
        return status;
    }
  };

  const stats = {
    total: bookings.length,
    pending: bookings.filter(b => b.status === 'pending').length,
    confirmed: bookings.filter(b => b.status === 'confirmed').length,
    cancelled: bookings.filter(b => b.status === 'cancelled').length,
  };

  // Reload bookings when filter or search changes
  useEffect(() => {
    if (!isLoading) {
      loadBookings(1);
    }
  }, [activeFilter, debouncedSearch]);

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2196F3" />
        <Text style={styles.loadingText}>Đang tải...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerSubtitle}>Quản lý</Text>
          <Text style={styles.headerTitle}>Tour Bookings</Text>
        </View>
        <View style={styles.headerBadge}>
          <Text style={styles.headerBadgeText}>{stats.pending}</Text>
        </View>
      </View>

      {/* Stats Row */}
      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{stats.total}</Text>
          <Text style={styles.statLabel}>Tổng số</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={[styles.statValue, { color: '#F59E0B' }]}>
            {stats.pending}
          </Text>
          <Text style={styles.statLabel}>Chờ duyệt</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={[styles.statValue, { color: '#10B981' }]}>
            {stats.confirmed}
          </Text>
          <Text style={styles.statLabel}>Đã duyệt</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={[styles.statValue, { color: '#EF4444' }]}>
            {stats.cancelled}
          </Text>
          <Text style={styles.statLabel}>Đã hủy</Text>
        </View>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Text style={styles.searchIcon}>🔍</Text>
        <TextInput
          style={styles.searchInput}
          placeholder="Tìm kiếm theo tên tour, khách hàng..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholderTextColor="#94A3B8"
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Text style={styles.clearIcon}>✕</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <TouchableOpacity
            style={[styles.filterTab, activeFilter === 'all' && styles.filterTabActive]}
            onPress={() => setActiveFilter('all')}
          >
            <Text
              style={[
                styles.filterTabText,
                activeFilter === 'all' && styles.filterTabTextActive,
              ]}
            >
              Tất cả ({stats.total})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.filterTab,
              activeFilter === 'pending' && styles.filterTabActive,
            ]}
            onPress={() => setActiveFilter('pending')}
          >
            <Text
              style={[
                styles.filterTabText,
                activeFilter === 'pending' && styles.filterTabTextActive,
              ]}
            >
              Chờ duyệt ({stats.pending})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.filterTab,
              activeFilter === 'confirmed' && styles.filterTabActive,
            ]}
            onPress={() => setActiveFilter('confirmed')}
          >
            <Text
              style={[
                styles.filterTabText,
                activeFilter === 'confirmed' && styles.filterTabTextActive,
              ]}
            >
              Đã duyệt ({stats.confirmed})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.filterTab,
              activeFilter === 'cancelled' && styles.filterTabActive,
            ]}
            onPress={() => setActiveFilter('cancelled')}
          >
            <Text
              style={[
                styles.filterTabText,
                activeFilter === 'cancelled' && styles.filterTabTextActive,
              ]}
            >
              Đã hủy ({stats.cancelled})
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      {/* Bookings List */}
      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#2196F3" />
        }
      >
        {bookings.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>📭</Text>
            <Text style={styles.emptyText}>Không tìm thấy booking nào</Text>
          </View>
        ) : (
          bookings.map((booking: Booking) => (
            <View key={booking.id} style={styles.bookingCard}>
              {/* Header */}
              <View style={styles.bookingHeader}>
                <View style={styles.bookingTitleContainer}>
                  <Text style={styles.bookingTourName} numberOfLines={1}>
                    {booking.tourName}
                  </Text>
                  <View
                    style={[
                      styles.statusBadge,
                      { backgroundColor: getStatusColor(booking.status) + '20' },
                    ]}
                  >
                    <View
                      style={[
                        styles.statusDot,
                        { backgroundColor: getStatusColor(booking.status) },
                      ]}
                    />
                    <Text
                      style={[
                        styles.statusText,
                        { color: getStatusColor(booking.status) },
                      ]}
                    >
                      {getStatusText(booking.status)}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Customer Info */}
              <View style={styles.infoRow}>
                <Text style={styles.infoIcon}>👤</Text>
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>Khách hàng</Text>
                  <Text style={styles.infoValue}>{booking.customerName}</Text>
                </View>
              </View>

              <View style={styles.infoRow}>
                <Text style={styles.infoIcon}>📞</Text>
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>Số điện thoại</Text>
                  <Text style={styles.infoValue}>{booking.customerPhone}</Text>
                </View>
              </View>

              <View style={styles.infoRow}>
                <Text style={styles.infoIcon}>📅</Text>
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>Ngày đi tour</Text>
                  <Text style={styles.infoValue}>{formatDate(booking.startDate)}</Text>
                </View>
              </View>

              <View style={styles.infoRow}>
                <Text style={styles.infoIcon}>📆</Text>
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>Ngày về</Text>
                  <Text style={styles.infoValue}>{formatDate(booking.endDate)}</Text>
                </View>
              </View>

              <View style={styles.infoRow}>
                <Text style={styles.infoIcon}>👥</Text>
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>Số người</Text>
                  <Text style={styles.infoValue}>{booking.numberOfPeople} người</Text>
                </View>
              </View>

              <View style={styles.divider} />

              {/* Price & Payment */}
              <View style={styles.priceRow}>
                <View>
                  <Text style={styles.priceLabel}>Tổng tiền</Text>
                  <Text style={styles.priceValue}>
                    {formatCurrency(booking.totalPrice)}
                  </Text>
                </View>
                <View
                  style={[
                    styles.paymentBadge,
                    {
                      backgroundColor:
                        booking.paymentStatus === 'paid'
                          ? '#4CAF50'
                          : booking.paymentStatus === 'refunded'
                          ? '#999'
                          : '#FF9500',
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.paymentText,
                      {
                        color: '#FFFFFF',
                      },
                    ]}
                  >
                    {getPaymentStatusText(booking.paymentStatus || 'unpaid')}
                  </Text>
                </View>
              </View>

              {/* Actions */}
              <View style={styles.actionsContainer}>
                <TouchableOpacity
                  style={styles.detailButton}
                  onPress={() => handleViewDetail(booking)}
                >
                  <Text style={styles.detailButtonText}>Chi tiết</Text>
                </TouchableOpacity>

                {booking.status === 'pending' && (
                  <>
                    <TouchableOpacity
                      style={styles.approveButton}
                      onPress={() => handleApprove(booking.id)}
                    >
                      <Text style={styles.approveButtonText}>✓ Phê duyệt</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.rejectButton}
                      onPress={() => handleReject(booking.id)}
                    >
                      <Text style={styles.rejectButtonText}>✕ Từ chối</Text>
                    </TouchableOpacity>
                  </>
                )}
              </View>
            </View>
          ))
        )}

        <View style={{ height: 20 }} />
      </ScrollView>

      {/* Confirm Approval Modal */}
      <Modal
        visible={showConfirmModal}
        animationType="fade"
        transparent={true}
        onRequestClose={() => !isProcessing && setShowConfirmModal(false)}
      >
        <View style={styles.confirmModalOverlay}>
          <View style={styles.confirmModalContent}>
            <View style={styles.confirmIconContainer}>
              <View style={styles.confirmIconCircle}>
                <Text style={styles.confirmIcon}>✓</Text>
              </View>
            </View>
            <Text style={styles.confirmModalTitle}>Phê duyệt Booking</Text>
            <Text style={styles.confirmModalMessage}>
              Bạn có chắc chắn muốn phê duyệt booking này?{'\n'}
              Khách hàng sẽ nhận được thông báo xác nhận.
            </Text>
            <View style={styles.confirmModalButtons}>
              <TouchableOpacity
                style={[styles.confirmModalButton, styles.cancelButton2]}
                onPress={() => setShowConfirmModal(false)}
                disabled={isProcessing}
              >
                <Text style={styles.cancelButtonText2}>Hủy</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.confirmModalButton, styles.approveButton2]}
                onPress={confirmApprove}
                disabled={isProcessing}
              >
                {isProcessing ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={styles.approveButtonText2}>Phê duyệt</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Reject Confirmation Modal */}
      <Modal
        visible={showRejectModal}
        animationType="fade"
        transparent={true}
        onRequestClose={() => !isProcessing && setShowRejectModal(false)}
      >
        <View style={styles.confirmModalOverlay}>
          <View style={styles.confirmModalContent}>
            <View style={styles.confirmIconContainer}>
              <View style={[styles.confirmIconCircle, styles.rejectIconCircle]}>
                <Text style={styles.rejectIcon}>✕</Text>
              </View>
            </View>
            <Text style={styles.confirmModalTitle}>Từ chối Booking</Text>
            <Text style={styles.confirmModalMessage}>
              Bạn có chắc chắn muốn từ chối booking này?{'\n'}
              Hành động này không thể hoàn tác.
            </Text>
            <View style={styles.confirmModalButtons}>
              <TouchableOpacity
                style={[styles.confirmModalButton, styles.cancelButton2]}
                onPress={() => setShowRejectModal(false)}
                disabled={isProcessing}
              >
                <Text style={styles.cancelButtonText2}>Hủy</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.confirmModalButton, styles.rejectButton2]}
                onPress={confirmReject}
                disabled={isProcessing}
              >
                {isProcessing ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={styles.rejectButtonText2}>Từ chối</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Detail Modal */}
      <Modal
        visible={showDetailModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowDetailModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Chi tiết Booking</Text>
              <TouchableOpacity onPress={() => setShowDetailModal(false)}>
                <Text style={styles.modalCloseIcon}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              {selectedBooking && (
                <>
                  <View style={styles.modalSection}>
                    <Text style={styles.modalSectionTitle}>Thông tin tour</Text>
                    <View style={styles.modalDetailRow}>
                      <Text style={styles.modalDetailLabel}>Tên tour</Text>
                      <Text style={styles.modalDetailValue}>
                        {selectedBooking.tourName}
                      </Text>
                    </View>
                    <View style={styles.modalDetailRow}>
                      <Text style={styles.modalDetailLabel}>Ngày bắt đầu</Text>
                      <Text style={styles.modalDetailValue}>
                        {formatDate(selectedBooking.startDate)}
                      </Text>
                    </View>
                    <View style={styles.modalDetailRow}>
                      <Text style={styles.modalDetailLabel}>Ngày kết thúc</Text>
                      <Text style={styles.modalDetailValue}>
                        {formatDate(selectedBooking.endDate)}
                      </Text>
                    </View>
                    <View style={styles.modalDetailRow}>
                      <Text style={styles.modalDetailLabel}>Số người</Text>
                      <Text style={styles.modalDetailValue}>
                        {selectedBooking.numberOfPeople} người
                      </Text>
                    </View>
                  </View>

                  <View style={styles.modalSection}>
                    <Text style={styles.modalSectionTitle}>Thông tin khách hàng</Text>
                    <View style={styles.modalDetailRow}>
                      <Text style={styles.modalDetailLabel}>Họ tên</Text>
                      <Text style={styles.modalDetailValue}>
                        {selectedBooking.customerName}
                      </Text>
                    </View>
                    <View style={styles.modalDetailRow}>
                      <Text style={styles.modalDetailLabel}>Email</Text>
                      <Text style={styles.modalDetailValue}>
                        {selectedBooking.customerEmail}
                      </Text>
                    </View>
                    <View style={styles.modalDetailRow}>
                      <Text style={styles.modalDetailLabel}>Số điện thoại</Text>
                      <Text style={styles.modalDetailValue}>
                        {selectedBooking.customerPhone}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.modalSection}>
                    <Text style={styles.modalSectionTitle}>Thông tin booking</Text>
                    <View style={styles.modalDetailRow}>
                      <Text style={styles.modalDetailLabel}>Ngày đặt</Text>
                      <Text style={styles.modalDetailValue}>
                        {formatDateTime(selectedBooking.createdAt)}
                      </Text>
                    </View>
                    <View style={styles.modalDetailRow}>
                      <Text style={styles.modalDetailLabel}>Trạng thái</Text>
                      <Text
                        style={[
                          styles.modalDetailValue,
                          { color: getStatusColor(selectedBooking.status) },
                        ]}
                      >
                        {getStatusText(selectedBooking.status)}
                      </Text>
                    </View>
                    <View style={styles.modalDetailRow}>
                      <Text style={styles.modalDetailLabel}>Thanh toán</Text>
                      <Text style={styles.modalDetailValue}>
                        {getPaymentStatusText(selectedBooking.paymentStatus || 'unpaid')}
                      </Text>
                    </View>
                    <View style={styles.modalDetailRow}>
                      <Text style={styles.modalDetailLabel}>Tổng tiền</Text>
                      <Text style={[styles.modalDetailValue, styles.modalPriceValue]}>
                        {formatCurrency(selectedBooking.totalPrice)}
                      </Text>
                    </View>
                  </View>

                  {selectedBooking.hotelId && (
                    <View style={styles.modalSection}>
                      <Text style={styles.modalSectionTitle}>Khách sạn</Text>
                      <Text style={styles.modalSpecialRequests}>
                        {typeof selectedBooking.hotelId === 'string' 
                          ? 'Đã chọn khách sạn' 
                          : (selectedBooking as any).hotel?.name || 'Đã chọn khách sạn'}
                      </Text>
                    </View>
                  )}

                  {selectedBooking.services && selectedBooking.services.length > 0 && (
                    <View style={styles.modalSection}>
                      <Text style={styles.modalSectionTitle}>Dịch vụ bổ sung</Text>
                      <Text style={styles.modalSpecialRequests}>
                        {selectedBooking.services.length} dịch vụ đã chọn
                      </Text>
                    </View>
                  )}
                </>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
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
    color: '#666',
    fontWeight: '600',
  },

  // Header
  header: {
    backgroundColor: '#FFFFFF',
    paddingTop: Platform.OS === 'ios' ? 50 : 30,
    paddingBottom: 20,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F8F9FA',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  backIcon: {
    fontSize: 24,
    color: '#1A1A1A',
    fontWeight: '600',
  },
  headerTitleContainer: {
    flex: 1,
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#999',
    fontWeight: '600',
    marginBottom: 2,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#2196F3',
    letterSpacing: -0.5,
  },
  headerBadge: {
    backgroundColor: '#2196F3',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    minWidth: 32,
    alignItems: 'center',
  },
  headerBadgeText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
  },

  // Stats
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: '800',
    color: '#2196F3',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 11,
    color: '#666',
    fontWeight: '600',
  },

  // Search
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    marginHorizontal: 20,
    marginBottom: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  searchIcon: {
    fontSize: 18,
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: '#1A1A1A',
    fontWeight: '500',
  },
  clearIcon: {
    fontSize: 18,
    color: '#999',
    fontWeight: '600',
    paddingLeft: 10,
  },

  // Filters
  filterContainer: {
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  filterTab: {
    backgroundColor: '#F8F9FA',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    marginRight: 8,
  },
  filterTabActive: {
    backgroundColor: '#2196F3',
  },
  filterTabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  filterTabTextActive: {
    color: '#FFFFFF',
  },

  // Content
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },

  // Booking Card
  bookingCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#2196F3',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
    borderLeftWidth: 4,
    borderLeftColor: '#2196F3',
  },
  bookingHeader: {
    marginBottom: 16,
  },
  bookingTitleContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  bookingTourName: {
    flex: 1,
    fontSize: 18,
    fontWeight: '700',
    color: '#1A1A1A',
    marginRight: 12,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '700',
  },

  // Info Rows
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  infoIcon: {
    fontSize: 18,
    marginRight: 12,
    marginTop: 2,
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 12,
    color: '#999',
    fontWeight: '500',
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 15,
    color: '#1A1A1A',
    fontWeight: '600',
  },

  divider: {
    height: 1,
    backgroundColor: '#F0F2F5',
    marginVertical: 16,
  },

  // Price
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  priceLabel: {
    fontSize: 13,
    color: '#999',
    fontWeight: '500',
    marginBottom: 4,
  },
  priceValue: {
    fontSize: 20,
    fontWeight: '800',
    color: '#2196F3',
  },
  paymentBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  paymentText: {
    fontSize: 12,
    fontWeight: '700',
  },

  // Actions
  actionsContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  detailButton: {
    flex: 1,
    backgroundColor: '#F8F9FA',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  detailButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#666',
  },
  approveButton: {
    flex: 1,
    backgroundColor: '#4CAF50',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  approveButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  rejectButton: {
    flex: 1,
    backgroundColor: '#FF3B30',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  rejectButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  // Empty State
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
    opacity: 0.3,
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
    fontWeight: '500',
  },

  // Confirm/Reject Modals
  confirmModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  confirmModalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 28,
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  confirmIconContainer: {
    marginBottom: 20,
  },
  confirmIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#E8F5E9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  rejectIconCircle: {
    backgroundColor: '#FFEBEE',
  },
  confirmIcon: {
    fontSize: 40,
    color: '#4CAF50',
  },
  rejectIcon: {
    fontSize: 40,
    color: '#FF3B30',
  },
  confirmModalTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1A1A1A',
    marginBottom: 12,
    textAlign: 'center',
  },
  confirmModalMessage: {
    fontSize: 15,
    color: '#666',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 28,
  },
  confirmModalButtons: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  confirmModalButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  cancelButton2: {
    backgroundColor: '#F8F9FA',
  },
  cancelButtonText2: {
    fontSize: 15,
    fontWeight: '700',
    color: '#666',
  },
  approveButton2: {
    backgroundColor: '#4CAF50',
    shadowColor: '#4CAF50',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  approveButtonText2: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  rejectButton2: {
    backgroundColor: '#FF3B30',
    shadowColor: '#FF3B30',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  rejectButtonText2: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: '90%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F2F5',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1A1A1A',
  },
  modalCloseIcon: {
    fontSize: 24,
    color: '#666',
    fontWeight: '600',
  },
  modalBody: {
    paddingHorizontal: 24,
    paddingVertical: 20,
  },
  modalSection: {
    marginBottom: 24,
  },
  modalSectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 12,
  },
  modalDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F8F9FA',
  },
  modalDetailLabel: {
    fontSize: 14,
    color: '#999',
    fontWeight: '500',
  },
  modalDetailValue: {
    fontSize: 14,
    color: '#1A1A1A',
    fontWeight: '600',
    textAlign: 'right',
    flex: 1,
    marginLeft: 12,
  },
  modalPriceValue: {
    fontSize: 16,
    color: '#2196F3',
    fontWeight: '800',
  },
  modalSpecialRequests: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    backgroundColor: '#F8F9FA',
    padding: 12,
    borderRadius: 12,
  },
});
