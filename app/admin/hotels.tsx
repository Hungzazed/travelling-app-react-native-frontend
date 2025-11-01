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
import { getHotels, createHotel, updateHotel, deleteHotel, Hotel } from '../../services/hotelService';
import { getCurrentUser } from '../../services/authService';

const ITEMS_PER_PAGE = 10;

export default function AdminHotelsScreen() {
  const router = useRouter();
  const [hotels, setHotels] = useState<Hotel[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [cityFilter, setCityFilter] = useState('');
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalResults, setTotalResults] = useState(0);
  
  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedHotel, setSelectedHotel] = useState<Hotel | null>(null);
  
  // Form data
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    city: '',
    description: '',
    rating: '0',
    pricePerNight: '',
    amenities: '',
    images: '',
    phone: '',
    email: '',
  });

  useEffect(() => {
    checkUserRole();
  }, []);

  useEffect(() => {
    loadHotels();
  }, [currentPage, cityFilter]);

  const checkUserRole = async () => {
    try {
      const user = await getCurrentUser();
      if (!user || user.role !== 'admin') {
        Alert.alert('Lỗi', 'Bạn không có quyền truy cập trang này');
        router.back();
        return;
      }
    } catch (error) {
      Alert.alert('Lỗi', 'Không thể xác thực người dùng');
      router.back();
    }
  };

  const loadHotels = async () => {
    try {
      setIsLoading(true);
      const params: any = {
        page: currentPage,
        limit: ITEMS_PER_PAGE,
        sortBy: 'createdAt:desc',
      };

      if (searchQuery) {
        params.name = searchQuery;
      }

      if (cityFilter) {
        params.city = cityFilter;
      }

      const response = await getHotels(params);
      setHotels(response.results);
      setTotalPages(response.totalPages);
      setTotalResults(response.totalResults);
    } catch (error: any) {
      console.error('Error loading hotels:', error);
      Alert.alert('Lỗi', error.message || 'Không thể tải danh sách khách sạn');
    } finally {
      setIsLoading(false);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    setCurrentPage(1);
    await loadHotels();
    setRefreshing(false);
  }, [cityFilter, searchQuery]);

  const handleSearch = () => {
    setCurrentPage(1);
    loadHotels();
  };

  const handleCreateHotel = async () => {
    if (!formData.name || !formData.address || !formData.city || !formData.pricePerNight) {
      Alert.alert('Lỗi', 'Vui lòng điền đầy đủ thông tin bắt buộc');
      return;
    }

    try {
      const createData: any = {
        name: formData.name,
        address: formData.address,
        city: formData.city,
        description: formData.description,
        rating: parseFloat(formData.rating) || 0,
        pricePerNight: parseFloat(formData.pricePerNight),
        amenities: formData.amenities ? formData.amenities.split(',').map(a => a.trim()) : [],
        images: formData.images ? formData.images.split(',').map(i => i.trim()) : [],
        contactInfo: {
          phone: formData.phone,
          email: formData.email,
        },
      };

      await createHotel(createData);
      Alert.alert('Thành công', 'Tạo khách sạn mới thành công');
      setShowCreateModal(false);
      resetForm();
      loadHotels();
    } catch (error: any) {
      Alert.alert('Lỗi', error.message || 'Không thể tạo khách sạn');
    }
  };

  const handleUpdateHotel = async () => {
    if (!selectedHotel) return;

    if (!formData.name || !formData.address || !formData.city || !formData.pricePerNight) {
      Alert.alert('Lỗi', 'Vui lòng điền đầy đủ thông tin bắt buộc');
      return;
    }

    try {
      const updateData: any = {
        name: formData.name,
        address: formData.address,
        city: formData.city,
        description: formData.description,
        rating: parseFloat(formData.rating) || 0,
        pricePerNight: parseFloat(formData.pricePerNight),
        amenities: formData.amenities ? formData.amenities.split(',').map(a => a.trim()) : [],
        images: formData.images ? formData.images.split(',').map(i => i.trim()) : [],
        contactInfo: {
          phone: formData.phone,
          email: formData.email,
        },
      };

      await updateHotel(selectedHotel.id, updateData);
      Alert.alert('Thành công', 'Cập nhật khách sạn thành công');
      setShowEditModal(false);
      setSelectedHotel(null);
      resetForm();
      loadHotels();
    } catch (error: any) {
      Alert.alert('Lỗi', error.message || 'Không thể cập nhật khách sạn');
    }
  };

  const handleDeleteHotel = (hotel: Hotel) => {
    Alert.alert(
      'Xác nhận xóa',
      `Bạn có chắc chắn muốn xóa khách sạn "${hotel.name}"?`,
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Xóa',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteHotel(hotel.id);
              Alert.alert('Thành công', 'Xóa khách sạn thành công');
              loadHotels();
            } catch (error: any) {
              Alert.alert('Lỗi', error.message || 'Không thể xóa khách sạn');
            }
          },
        },
      ]
    );
  };

  const openEditModal = (hotel: Hotel) => {
    setSelectedHotel(hotel);
    setFormData({
      name: hotel.name,
      address: hotel.address,
      city: hotel.city,
      description: hotel.description || '',
      rating: hotel.rating.toString(),
      pricePerNight: hotel.pricePerNight.toString(),
      amenities: hotel.amenities.join(', '),
      images: hotel.images.join(', '),
      phone: hotel.contactInfo?.phone || '',
      email: hotel.contactInfo?.email || '',
    });
    setShowEditModal(true);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      address: '',
      city: '',
      description: '',
      rating: '0',
      pricePerNight: '',
      amenities: '',
      images: '',
      phone: '',
      email: '',
    });
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

  const renderHotelForm = (isEdit: boolean) => (
    <ScrollView style={styles.formContainer}>
      <Text style={styles.formLabel}>Tên khách sạn *</Text>
      <TextInput
        style={styles.input}
        value={formData.name}
        onChangeText={(text) => setFormData({ ...formData, name: text })}
        placeholder="Nhập tên khách sạn"
      />

      <Text style={styles.formLabel}>Địa chỉ *</Text>
      <TextInput
        style={styles.input}
        value={formData.address}
        onChangeText={(text) => setFormData({ ...formData, address: text })}
        placeholder="Nhập địa chỉ"
      />

      <Text style={styles.formLabel}>Thành phố *</Text>
      <TextInput
        style={styles.input}
        value={formData.city}
        onChangeText={(text) => setFormData({ ...formData, city: text })}
        placeholder="Nhập thành phố"
      />

      <Text style={styles.formLabel}>Mô tả</Text>
      <TextInput
        style={[styles.input, styles.textArea]}
        value={formData.description}
        onChangeText={(text) => setFormData({ ...formData, description: text })}
        placeholder="Nhập mô tả khách sạn"
        multiline
        numberOfLines={4}
      />

      <View style={styles.row}>
        <View style={styles.halfInput}>
          <Text style={styles.formLabel}>Giá/đêm (VNĐ) *</Text>
          <TextInput
            style={styles.input}
            value={formData.pricePerNight}
            onChangeText={(text) => setFormData({ ...formData, pricePerNight: text })}
            placeholder="Nhập giá"
            keyboardType="numeric"
          />
        </View>

        <View style={styles.halfInput}>
          <Text style={styles.formLabel}>Đánh giá (0-5)</Text>
          <TextInput
            style={styles.input}
            value={formData.rating}
            onChangeText={(text) => setFormData({ ...formData, rating: text })}
            placeholder="0.0"
            keyboardType="decimal-pad"
          />
        </View>
      </View>

      <Text style={styles.formLabel}>Tiện nghi (phân cách bằng dấu phẩy)</Text>
      <TextInput
        style={styles.input}
        value={formData.amenities}
        onChangeText={(text) => setFormData({ ...formData, amenities: text })}
        placeholder="WiFi, Hồ bơi, Gym, Spa"
      />

      <Text style={styles.formLabel}>Hình ảnh URLs (phân cách bằng dấu phẩy)</Text>
      <TextInput
        style={styles.input}
        value={formData.images}
        onChangeText={(text) => setFormData({ ...formData, images: text })}
        placeholder="https://example.com/image1.jpg, ..."
      />

      <View style={styles.row}>
        <View style={styles.halfInput}>
          <Text style={styles.formLabel}>Số điện thoại</Text>
          <TextInput
            style={styles.input}
            value={formData.phone}
            onChangeText={(text) => setFormData({ ...formData, phone: text })}
            placeholder="0123456789"
            keyboardType="phone-pad"
          />
        </View>

        <View style={styles.halfInput}>
          <Text style={styles.formLabel}>Email</Text>
          <TextInput
            style={styles.input}
            value={formData.email}
            onChangeText={(text) => setFormData({ ...formData, email: text })}
            placeholder="hotel@example.com"
            keyboardType="email-address"
            autoCapitalize="none"
          />
        </View>
      </View>

      <View style={styles.modalActions}>
        <TouchableOpacity
          style={[styles.modalButton, styles.cancelButton]}
          onPress={() => {
            if (isEdit) {
              setShowEditModal(false);
              setSelectedHotel(null);
            } else {
              setShowCreateModal(false);
            }
            resetForm();
          }}
        >
          <Text style={styles.cancelButtonText}>Hủy</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.modalButton, styles.submitButton]}
          onPress={isEdit ? handleUpdateHotel : handleCreateHotel}
        >
          <Text style={styles.submitButtonText}>
            {isEdit ? 'Cập nhật' : 'Tạo mới'}
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );

  if (isLoading && !refreshing) {
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
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerSubtitle}>Quản lý</Text>
          <Text style={styles.headerTitle}>Khách sạn</Text>
        </View>
        <View style={styles.headerBadge}>
          <Text style={styles.headerBadgeText}>{totalResults}</Text>
        </View>
      </View>

      {/* Search & Add Button */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBox}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Tìm kiếm theo tên khách sạn..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            onSubmitEditing={handleSearch}
            placeholderTextColor="#999"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => {
              setSearchQuery('');
              setCurrentPage(1);
              loadHotels();
            }}>
              <Text style={styles.clearIcon}>✕</Text>
            </TouchableOpacity>
          )}
        </View>

        <TouchableOpacity
          style={styles.addButton}
          onPress={() => {
            resetForm();
            setShowCreateModal(true);
          }}
        >
          <Text style={styles.addButtonText}>➕ Thêm khách sạn</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#2196F3" />}
      >
        {hotels.length > 0 ? (
          <>
            {hotels.map((hotel) => (
              <View key={hotel.id} style={styles.hotelCard}>
                <View style={styles.hotelHeader}>
                  <View style={styles.hotelInfo}>
                    <Text style={styles.hotelName}>{hotel.name}</Text>
                    <Text style={styles.hotelAddress}>📍 {hotel.address}</Text>
                    <Text style={styles.hotelCity}>🏙️ {hotel.city}</Text>
                    
                    <View style={styles.hotelMeta}>
                      <View style={styles.ratingContainer}>
                        <Text style={styles.ratingIcon}>⭐</Text>
                        <Text style={styles.ratingText}>{hotel.rating.toFixed(1)}</Text>
                      </View>
                      <Text style={styles.priceText}>{formatCurrency(hotel.pricePerNight)}/đêm</Text>
                    </View>

                    {hotel.amenities && hotel.amenities.length > 0 && (
                      <View style={styles.amenitiesContainer}>
                        {hotel.amenities.slice(0, 3).map((amenity, index) => (
                          <View key={index} style={styles.amenityBadge}>
                            <Text style={styles.amenityText}>{amenity}</Text>
                          </View>
                        ))}
                        {hotel.amenities.length > 3 && (
                          <Text style={styles.moreAmenities}>+{hotel.amenities.length - 3}</Text>
                        )}
                      </View>
                    )}

                    <Text style={styles.hotelDate}>
                      Tạo: {formatDate(hotel.createdAt)}
                    </Text>
                  </View>
                </View>

                <View style={styles.hotelActions}>
                  <TouchableOpacity
                    style={[styles.actionButton, styles.editButton]}
                    onPress={() => openEditModal(hotel)}
                  >
                    <Text style={styles.actionButtonText}>✏️ Sửa</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={[styles.actionButton, styles.deleteButton]}
                    onPress={() => handleDeleteHotel(hotel)}
                  >
                    <Text style={[styles.actionButtonText, styles.deleteButtonText]}>
                      🗑️ Xóa
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}

            {/* Pagination */}
            {totalPages > 1 && (
              <View style={styles.pagination}>
                <TouchableOpacity
                  style={[styles.pageButton, currentPage === 1 && styles.pageButtonDisabled]}
                  onPress={() => currentPage > 1 && setCurrentPage(currentPage - 1)}
                  disabled={currentPage === 1}
                >
                  <Text style={[styles.pageButtonText, currentPage === 1 && styles.pageButtonTextDisabled]}>
                    ← Trước
                  </Text>
                </TouchableOpacity>

                <Text style={styles.pageInfo}>
                  Trang {currentPage}/{totalPages} ({totalResults} khách sạn)
                </Text>

                <TouchableOpacity
                  style={[styles.pageButton, currentPage === totalPages && styles.pageButtonDisabled]}
                  onPress={() => currentPage < totalPages && setCurrentPage(currentPage + 1)}
                  disabled={currentPage === totalPages}
                >
                  <Text style={[styles.pageButtonText, currentPage === totalPages && styles.pageButtonTextDisabled]}>
                    Sau →
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </>
        ) : (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>🏨</Text>
            <Text style={styles.emptyText}>Không có khách sạn nào</Text>
          </View>
        )}

        <View style={{ height: 20 }} />
      </ScrollView>

      {/* Create Modal */}
      <Modal
        visible={showCreateModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => {
          setShowCreateModal(false);
          resetForm();
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Thêm khách sạn mới</Text>
            {renderHotelForm(false)}
          </View>
        </View>
      </Modal>

      {/* Edit Modal */}
      <Modal
        visible={showEditModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => {
          setShowEditModal(false);
          setSelectedHotel(null);
          resetForm();
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Chỉnh sửa khách sạn</Text>
            {renderHotelForm(true)}
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
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
    color: '#1A1A1A',
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
    paddingVertical: 16,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    paddingHorizontal: 16,
    marginBottom: 12,
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
    paddingVertical: 14,
    color: '#1A1A1A',
    fontWeight: '500',
  },
  clearIcon: {
    fontSize: 16,
    color: '#999',
    padding: 4,
  },
  addButton: {
    backgroundColor: '#2196F3',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#2196F3',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  addButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  content: {
    flex: 1,
  },
  hotelCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 16,
    padding: 16,
    shadowColor: '#2196F3',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
    borderLeftWidth: 4,
    borderLeftColor: '#2196F3',
  },
  hotelHeader: {
    marginBottom: 12,
  },
  hotelInfo: {
    flex: 1,
  },
  hotelName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1A1A1A',
    marginBottom: 6,
  },
  hotelAddress: {
    fontSize: 14,
    color: '#666',
    marginBottom: 3,
  },
  hotelCity: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  hotelMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF9E6',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    marginRight: 12,
  },
  ratingIcon: {
    fontSize: 14,
    marginRight: 4,
  },
  ratingText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FF9500',
  },
  priceText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2196F3',
  },
  amenitiesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 8,
  },
  amenityBadge: {
    backgroundColor: '#E3F2FD',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 6,
    marginBottom: 4,
  },
  amenityText: {
    fontSize: 12,
    color: '#2196F3',
    fontWeight: '600',
  },
  moreAmenities: {
    fontSize: 12,
    color: '#999',
    marginLeft: 4,
    alignSelf: 'center',
  },
  hotelDate: {
    fontSize: 12,
    color: '#999',
  },
  hotelActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  editButton: {
    backgroundColor: '#2196F3',
  },
  deleteButton: {
    backgroundColor: '#FF3B30',
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  deleteButtonText: {
    color: '#FFFFFF',
  },
  pagination: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    marginHorizontal: 16,
    marginVertical: 16,
    backgroundColor: '#fff',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  pageButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#2196F3',
  },
  pageButtonDisabled: {
    backgroundColor: '#E0E0E0',
  },
  pageButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  pageButtonTextDisabled: {
    color: '#999',
  },
  pageInfo: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
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
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 24,
    width: '90%',
    maxWidth: 450,
    maxHeight: '85%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
    color: '#1A1A1A',
  },
  formContainer: {
    maxHeight: 500,
  },
  formLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 6,
    marginTop: 10,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    padding: 12,
    fontSize: 15,
    backgroundColor: '#fff',
    marginBottom: 10,
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  halfInput: {
    flex: 1,
    marginRight: 8,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },
  modalButton: {
    flex: 1,
    padding: 15,
    borderRadius: 12,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#F8F9FA',
  },
  cancelButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '600',
  },
  submitButton: {
    backgroundColor: '#2196F3',
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
