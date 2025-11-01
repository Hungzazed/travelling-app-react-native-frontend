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
  TextInput,
  Platform,
  Modal,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import api from '../../services/api';

interface Booking {
  id: string;
  userId: {
    id: string;
    name: string;
    email: string;
  };
  tourId: {
    id: string;
    name: string;
    destination: string;
  };
  hotelId?: {
    id: string;
    name: string;
  };
  numberOfPeople: number;
  startDate: string;
  endDate: string;
  totalPrice: number;
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed';
  paymentStatus: 'unpaid' | 'paid' | 'refunded';
  createdAt: string;
}

type StatusFilter = 'all' | 'pending' | 'confirmed' | 'cancelled' | 'completed';

export default function AdminBookingsScreen() {
  const router = useRouter();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [filteredBookings, setFilteredBookings] = useState<Booking[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  useEffect(() => {
    loadBookings();
  }, []);

  useEffect(() => {
    filterBookings();
  }, [bookings, searchQuery, statusFilter]);

  const loadBookings = async () => {
    try {
      setIsLoading(true);
      const response = await api.get('/bookings', {
        params: {
          sortBy: 'createdAt:desc',
          limit: 100,
          populate: 'userId,tourId,hotelId',
        },
      });
      setBookings(response.data.results);
    } catch (error) {
      console.error('Error loading bookings:', error);
      Alert.alert('Lỗi', 'Không thể tải danh sách đặt phòng');
    } finally {
      setIsLoading(false);
    }
  };

  const filterBookings = () => {
    let filtered = bookings;

    if (searchQuery) {
      filtered = filtered.filter(
        (booking) =>
          booking.userId.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          booking.userId.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
          booking.tourId.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter((booking) => booking.status === statusFilter);
    }

    setFilteredBookings(filtered);
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadBookings();
    setRefreshing(false);
  }, []);

  const handleUpdateBookingStatus = async (
    bookingId: string,
    newStatus: 'pending' | 'confirmed' | 'cancelled' | 'completed'
  ) => {
    try {
      if (newStatus === 'confirmed') {
        await api.patch(`/bookings/${bookingId}/confirm`);
      } else if (newStatus === 'cancelled') {
        await api.patch(`/bookings/${bookingId}/cancel`);
      } else {
        await api.patch(`/bookings/${bookingId}`, { status: newStatus });
      }
      
      Alert.alert('Thành công', 'Đã cập nhật trạng thái đặt phòng');
      setShowDetailModal(false);
      loadBookings();
    } catch (error) {
      Alert.alert('Lỗi', 'Không thể cập nhật trạng thái');
    }
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      pending: '#FF9500',
      confirmed: '#4CAF50',
      cancelled: '#FF3B30',
      completed: '#2196F3',
    };
    return colors[status] || '#8E8E93';
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      pending: 'Chờ xử lý',
      confirmed: 'Đã xác nhận',
      cancelled: 'Đã hủy',
      completed: 'Hoàn thành',
    };
    return labels[status] || status;
  };

  const getPaymentStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      unpaid: '#FF9500',
      paid: '#4CAF50',
      refunded: '#8E8E93',
    };
    return colors[status] || '#8E8E93';
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
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

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />

      {/* Modern Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Text style={styles.backButtonText}>←</Text>
          </TouchableOpacity>
          <View style={styles.headerTitleContainer}>
            <Text style={styles.headerSubtitle}>Quản lý</Text>
            <Text style={styles.headerTitle}>Đặt phòng</Text>
          </View>
          <View style={styles.headerBadge}>
            <Text style={styles.headerBadgeText}>{bookings.length}</Text>
          </View>
        </View>
      </View>

      {/* Search & Stats */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBox}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Tìm kiếm đặt phòng..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor="#999"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Text style={styles.clearIcon}>✕</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{bookings.length}</Text>
            <Text style={styles.statLabel}>Tổng</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: '#FF9500' }]}>
              {bookings.filter((b) => b.status === 'pending').length}
            </Text>
            <Text style={styles.statLabel}>Chờ xử lý</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: '#4CAF50' }]}>
              {bookings.filter((b) => b.status === 'confirmed').length}
            </Text>
            <Text style={styles.statLabel}>Xác nhận</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: '#2196F3' }]}>
              {bookings.filter((b) => b.status === 'completed').length}
            </Text>
            <Text style={styles.statLabel}>Hoàn thành</Text>
          </View>
        </View>
      </View>

      {/* Filter Tabs */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filterContainer}
        contentContainerStyle={styles.filterContent}
      >
        {(['all', 'pending', 'confirmed', 'cancelled', 'completed'] as StatusFilter[]).map(
          (status) => (
            <TouchableOpacity
              key={status}
              style={[styles.filterTab, statusFilter === status && styles.filterTabActive]}
              onPress={() => setStatusFilter(status)}
            >
              <Text
                style={[styles.filterText, statusFilter === status && styles.filterTextActive]}
              >
                {status === 'all' ? 'Tất cả' : getStatusLabel(status)}
              </Text>
            </TouchableOpacity>
          )
        )}
      </ScrollView>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {filteredBookings.length > 0 ? (
          filteredBookings.map((booking) => (
            <TouchableOpacity
              key={booking.id}
              style={styles.bookingCard}
              onPress={() => {
                setSelectedBooking(booking);
                setShowDetailModal(true);
              }}
            >
              <View style={styles.bookingHeader}>
                <View style={styles.bookingIdRow}>
                  <Text style={styles.bookingId}>#{booking.id.substring(0, 8)}</Text>
                  <View
                    style={[
                      styles.statusBadge,
                      { backgroundColor: getStatusColor(booking.status) },
                    ]}
                  >
                    <Text style={styles.statusBadgeText}>{getStatusLabel(booking.status)}</Text>
                  </View>
                </View>
                <Text style={styles.bookingDate}>📅 {formatDate(booking.createdAt)}</Text>
              </View>

              <View style={styles.bookingInfo}>
                <Text style={styles.tourName}>{booking.tourId.name}</Text>
                <Text style={styles.customerName}>👤 {booking.userId.name}</Text>
                <View style={styles.bookingDetails}>
                  <Text style={styles.detailText}>📍 {booking.tourId.destination}</Text>
                  <Text style={styles.detailText}>👥 {booking.numberOfPeople} người</Text>
                </View>
                <View style={styles.dateRow}>
                  <Text style={styles.detailText}>
                    Từ: {formatDate(booking.startDate)}
                  </Text>
                  <Text style={styles.detailText}>
                    Đến: {formatDate(booking.endDate)}
                  </Text>
                </View>
                {booking.hotelId && (
                  <Text style={styles.hotelName}>🏨 {booking.hotelId.name}</Text>
                )}
              </View>

              <View style={styles.bookingFooter}>
                <View style={styles.priceContainer}>
                  <Text style={styles.priceLabel}>Tổng tiền:</Text>
                  <Text style={styles.priceValue}>{formatCurrency(booking.totalPrice)}</Text>
                </View>
                <View
                  style={[
                    styles.paymentBadge,
                    { backgroundColor: getPaymentStatusColor(booking.paymentStatus) },
                  ]}
                >
                  <Text style={styles.paymentBadgeText}>
                    {booking.paymentStatus === 'paid'
                      ? 'Đã thanh toán'
                      : booking.paymentStatus === 'unpaid'
                      ? 'Chưa thanh toán'
                      : 'Hoàn tiền'}
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
          ))
        ) : (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>📋</Text>
            <Text style={styles.emptyText}>Không tìm thấy đặt phòng</Text>
          </View>
        )}

        <View style={{ height: 20 }} />
      </ScrollView>

      {/* Detail Modal */}
      <Modal visible={showDetailModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <ScrollView showsVerticalScrollIndicator={false}>
              {selectedBooking && (
                <>
                  <Text style={styles.modalTitle}>Chi tiết đặt phòng</Text>

                  <View style={styles.modalSection}>
                    <Text style={styles.modalSectionTitle}>Thông tin khách hàng</Text>
                    <Text style={styles.modalText}>Tên: {selectedBooking.userId.name}</Text>
                    <Text style={styles.modalText}>Email: {selectedBooking.userId.email}</Text>
                  </View>

                  <View style={styles.modalSection}>
                    <Text style={styles.modalSectionTitle}>Thông tin tour</Text>
                    <Text style={styles.modalText}>Tour: {selectedBooking.tourId.name}</Text>
                    <Text style={styles.modalText}>
                      Điểm đến: {selectedBooking.tourId.destination}
                    </Text>
                    <Text style={styles.modalText}>
                      Số người: {selectedBooking.numberOfPeople}
                    </Text>
                    <Text style={styles.modalText}>
                      Bắt đầu: {formatDate(selectedBooking.startDate)}
                    </Text>
                    <Text style={styles.modalText}>
                      Kết thúc: {formatDate(selectedBooking.endDate)}
                    </Text>
                    {selectedBooking.hotelId && (
                      <Text style={styles.modalText}>
                        Khách sạn: {selectedBooking.hotelId.name}
                      </Text>
                    )}
                  </View>

                  <View style={styles.modalSection}>
                    <Text style={styles.modalSectionTitle}>Thanh toán</Text>
                    <Text style={styles.modalText}>
                      Tổng tiền: {formatCurrency(selectedBooking.totalPrice)}
                    </Text>
                    <Text style={styles.modalText}>
                      Trạng thái thanh toán:{' '}
                      {selectedBooking.paymentStatus === 'paid'
                        ? 'Đã thanh toán'
                        : selectedBooking.paymentStatus === 'unpaid'
                        ? 'Chưa thanh toán'
                        : 'Hoàn tiền'}
                    </Text>
                  </View>

                  <View style={styles.modalSection}>
                    <Text style={styles.modalSectionTitle}>Cập nhật trạng thái</Text>
                    <View style={styles.statusButtons}>
                      <TouchableOpacity
                        style={[styles.statusButton, { backgroundColor: '#4CAF50' }]}
                        onPress={() =>
                          handleUpdateBookingStatus(selectedBooking.id, 'confirmed')
                        }
                      >
                        <Text style={styles.statusButtonText}>✓ Xác nhận</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.statusButton, { backgroundColor: '#2196F3' }]}
                        onPress={() =>
                          handleUpdateBookingStatus(selectedBooking.id, 'completed')
                        }
                      >
                        <Text style={styles.statusButtonText}>✓ Hoàn thành</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.statusButton, { backgroundColor: '#FF3B30' }]}
                        onPress={() =>
                          handleUpdateBookingStatus(selectedBooking.id, 'cancelled')
                        }
                      >
                        <Text style={styles.statusButtonText}>✕ Hủy</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </>
              )}
            </ScrollView>

            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => setShowDetailModal(false)}
            >
              <Text style={styles.modalCloseButtonText}>Đóng</Text>
            </TouchableOpacity>
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
  },
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
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
    backgroundColor: '#2196F3',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    minWidth: 44,
    alignItems: 'center',
  },
  headerBadgeText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  searchContainer: {
    backgroundColor: 'transparent',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingHorizontal: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    shadowColor: '#2196F3',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  searchIcon: {
    fontSize: 18,
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    paddingVertical: 14,
    color: '#1a1a1a',
    fontWeight: '500',
  },
  clearIcon: {
    fontSize: 18,
    color: '#999',
    padding: 6,
    fontWeight: 'bold',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: '#F8F9FA',
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 20,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  statItem: {
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
  filterContainer: {
    backgroundColor: 'transparent',
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  filterContent: {
    gap: 10,
  },
  filterTab: {
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  filterTabActive: {
    backgroundColor: '#2196F3',
    shadowColor: '#2196F3',
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 3,
  },
  filterText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#666',
  },
  filterTextActive: {
    color: '#fff',
  },
  content: {
    flex: 1,
  },
  bookingCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 20,
    marginTop: 12,
    borderRadius: 20,
    padding: 20,
    shadowColor: '#2196F3',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 3,
    borderLeftWidth: 4,
    borderLeftColor: '#2196F3',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  bookingHeader: {
    marginBottom: 14,
  },
  bookingIdRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  bookingId: {
    fontSize: 13,
    fontWeight: '700',
    color: '#666',
    letterSpacing: 0.5,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 14,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#fff',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  bookingDate: {
    fontSize: 12,
    color: '#999',
    fontWeight: '500',
  },
  bookingInfo: {
    marginBottom: 14,
  },
  tourName: {
    fontSize: 17,
    fontWeight: '800',
    color: '#1a1a1a',
    marginBottom: 8,
    letterSpacing: -0.3,
  },
  customerName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
  },
  bookingDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  detailText: {
    fontSize: 13,
    color: '#666',
  },
  dateRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  hotelName: {
    fontSize: 13,
    color: '#2196F3',
    marginTop: 6,
  },
  bookingFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  priceContainer: {
    flex: 1,
  },
  priceLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 2,
  },
  priceValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  paymentBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  paymentBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#fff',
  },
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
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 24,
    paddingBottom: 20,
    maxHeight: '85%',
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 20,
    paddingHorizontal: 24,
  },
  modalSection: {
    paddingHorizontal: 24,
    marginBottom: 20,
  },
  modalSectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 10,
  },
  modalText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 6,
  },
  statusButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  statusButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  statusButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#fff',
  },
  modalCloseButton: {
    backgroundColor: '#2196F3',
    marginHorizontal: 24,
    marginTop: 8,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalCloseButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
