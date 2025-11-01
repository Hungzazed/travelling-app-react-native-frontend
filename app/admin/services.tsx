import React, { useState, useEffect, useCallback, useRef } from 'react';
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
import {
  getServices,
  createService,
  updateService,
  deleteService,
  Service,
  ServiceType,
  getServiceTypeIcon,
  getServiceTypeLabel,
} from '../../services/serviceService';
import { getCurrentUser } from '../../services/authService';

const ITEMS_PER_PAGE = 10;

export default function AdminServicesScreen() {
  const router = useRouter();
  const [services, setServices] = useState<Service[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<ServiceType | 'all'>('all');
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalResults, setTotalResults] = useState(0);
  
  // Track if initial load is done
  const isInitialMount = useRef(true);
  
  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  
  // Form data
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    type: 'other' as ServiceType,
  });

  const serviceTypes: ServiceType[] = ['transport', 'food', 'guide', 'ticket', 'other'];

  useEffect(() => {
    checkUserRole();
  }, []);

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 500);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Reset to page 1 when search or filter changes (skip initial mount)
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    setCurrentPage(1);
  }, [debouncedSearch, typeFilter]);

  // Load services when page, search, or filter changes
  useEffect(() => {
    loadServices();
  }, [currentPage, debouncedSearch, typeFilter]);

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

  const loadServices = async () => {
    try {
      setIsLoading(true);
      const params: any = {
        page: currentPage,
        limit: ITEMS_PER_PAGE,
        sortBy: 'createdAt:desc',
      };

      if (debouncedSearch) {
        params.name = debouncedSearch;
      }

      if (typeFilter !== 'all') {
        params.type = typeFilter;
      }

      const response = await getServices(params);
      setServices(response.results);
      setTotalPages(response.totalPages);
      setTotalResults(response.totalResults);
    } catch (error: any) {
      console.error('Error loading services:', error);
      Alert.alert('Lỗi', error.message || 'Không thể tải danh sách dịch vụ');
    } finally {
      setIsLoading(false);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    setCurrentPage(1);
    await loadServices();
    setRefreshing(false);
  }, [typeFilter, debouncedSearch]);

  const handleSearch = () => {
    setDebouncedSearch(searchQuery);
    setCurrentPage(1);
  };

  const handleCreateService = async () => {
    if (!formData.name || !formData.price) {
      Alert.alert('Lỗi', 'Vui lòng điền đầy đủ thông tin bắt buộc');
      return;
    }

    try {
      const createData = {
        name: formData.name,
        description: formData.description,
        price: parseFloat(formData.price),
        type: formData.type,
      };

      await createService(createData);
      Alert.alert('Thành công', 'Tạo dịch vụ mới thành công');
      setShowCreateModal(false);
      resetForm();
      loadServices();
    } catch (error: any) {
      Alert.alert('Lỗi', error.message || 'Không thể tạo dịch vụ');
    }
  };

  const handleUpdateService = async () => {
    if (!selectedService) return;

    if (!formData.name || !formData.price) {
      Alert.alert('Lỗi', 'Vui lòng điền đầy đủ thông tin bắt buộc');
      return;
    }

    try {
      const updateData = {
        name: formData.name,
        description: formData.description,
        price: parseFloat(formData.price),
        type: formData.type,
      };

      await updateService(selectedService.id, updateData);
      Alert.alert('Thành công', 'Cập nhật dịch vụ thành công');
      setShowEditModal(false);
      setSelectedService(null);
      resetForm();
      loadServices();
    } catch (error: any) {
      Alert.alert('Lỗi', error.message || 'Không thể cập nhật dịch vụ');
    }
  };

  const handleDeleteService = (service: Service) => {
    Alert.alert(
      'Xác nhận xóa',
      `Bạn có chắc chắn muốn xóa dịch vụ "${service.name}"?`,
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Xóa',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteService(service.id);
              Alert.alert('Thành công', 'Xóa dịch vụ thành công');
              loadServices();
            } catch (error: any) {
              Alert.alert('Lỗi', error.message || 'Không thể xóa dịch vụ');
            }
          },
        },
      ]
    );
  };

  const openEditModal = (service: Service) => {
    setSelectedService(service);
    setFormData({
      name: service.name,
      description: service.description || '',
      price: service.price.toString(),
      type: service.type,
    });
    setShowEditModal(true);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      price: '',
      type: 'other',
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(amount);
  };

  const renderServiceForm = (isEdit: boolean) => (
    <ScrollView style={styles.formContainer}>
      <Text style={styles.formLabel}>Tên dịch vụ *</Text>
      <TextInput
        style={styles.input}
        value={formData.name}
        onChangeText={(text) => setFormData({ ...formData, name: text })}
        placeholder="Nhập tên dịch vụ"
      />

      <Text style={styles.formLabel}>Mô tả</Text>
      <TextInput
        style={[styles.input, styles.textArea]}
        value={formData.description}
        onChangeText={(text) => setFormData({ ...formData, description: text })}
        placeholder="Nhập mô tả dịch vụ"
        multiline
        numberOfLines={3}
      />

      <Text style={styles.formLabel}>Giá (VNĐ) *</Text>
      <TextInput
        style={styles.input}
        value={formData.price}
        onChangeText={(text) => setFormData({ ...formData, price: text.replace(/[^0-9]/g, '') })}
        placeholder="Nhập giá dịch vụ"
        keyboardType="numeric"
      />

      <Text style={styles.formLabel}>Loại dịch vụ *</Text>
      <View style={styles.typeGrid}>
        {serviceTypes.map((type) => (
          <TouchableOpacity
            key={type}
            style={[
              styles.typeOption,
              formData.type === type && styles.typeOptionActive,
            ]}
            onPress={() => setFormData({ ...formData, type })}
          >
            <Text style={styles.typeIcon}>{getServiceTypeIcon(type)}</Text>
            <Text
              style={[
                styles.typeText,
                formData.type === type && styles.typeTextActive,
              ]}
            >
              {getServiceTypeLabel(type).replace(/^[^\s]+\s/, '')}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.modalActions}>
        <TouchableOpacity
          style={[styles.modalButton, styles.cancelButton]}
          onPress={() => {
            if (isEdit) {
              setShowEditModal(false);
              setSelectedService(null);
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
          onPress={isEdit ? handleUpdateService : handleCreateService}
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
          <Text style={styles.headerTitle}>Dịch vụ</Text>
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
            placeholder="Tìm kiếm dịch vụ..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            onSubmitEditing={handleSearch}
            placeholderTextColor="#999"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => {
              setSearchQuery('');
              setDebouncedSearch('');
              setCurrentPage(1);
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
          <Text style={styles.addButtonText}>➕ Thêm dịch vụ</Text>
        </TouchableOpacity>

        {/* Type Filter */}
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          style={styles.filterScroll}
          contentContainerStyle={styles.filterContainer}
        >
          <TouchableOpacity
            style={[styles.filterChip, typeFilter === 'all' && styles.filterChipActive]}
            onPress={() => {
              setTypeFilter('all');
              setCurrentPage(1);
            }}
          >
            <Text style={[styles.filterChipText, typeFilter === 'all' && styles.filterChipTextActive]}>
              Tất cả
            </Text>
          </TouchableOpacity>
          {serviceTypes.map((type) => (
            <TouchableOpacity
              key={type}
              style={[styles.filterChip, typeFilter === type && styles.filterChipActive]}
              onPress={() => {
                setTypeFilter(type);
                setCurrentPage(1);
              }}
            >
              <Text style={styles.filterChipIcon}>{getServiceTypeIcon(type)}</Text>
              <Text style={[styles.filterChipText, typeFilter === type && styles.filterChipTextActive]}>
                {getServiceTypeLabel(type).replace(/^[^\s]+\s/, '')}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#2196F3" />}
      >
        {services.length > 0 ? (
          <>
            {services.map((service) => (
              <View key={service.id} style={styles.serviceCard}>
                <View style={styles.serviceHeader}>
                  <View style={styles.serviceIconContainer}>
                    <Text style={styles.serviceIcon}>{getServiceTypeIcon(service.type)}</Text>
                  </View>
                  <View style={styles.serviceInfo}>
                    <Text style={styles.serviceName}>{service.name}</Text>
                    <View style={styles.typeBadge}>
                      <Text style={styles.typeBadgeText}>
                        {getServiceTypeLabel(service.type)}
                      </Text>
                    </View>
                    {service.description && (
                      <Text style={styles.serviceDescription} numberOfLines={2}>
                        {service.description}
                      </Text>
                    )}
                    <Text style={styles.servicePrice}>{formatCurrency(service.price)}</Text>
                  </View>
                </View>

                <View style={styles.serviceActions}>
                  <TouchableOpacity
                    style={[styles.actionButton, styles.editButton]}
                    onPress={() => openEditModal(service)}
                  >
                    <Text style={styles.actionButtonText}>✏️ Sửa</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={[styles.actionButton, styles.deleteButton]}
                    onPress={() => handleDeleteService(service)}
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
                  Trang {currentPage}/{totalPages} ({totalResults} dịch vụ)
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
            <Text style={styles.emptyIcon}>�</Text>
            <Text style={styles.emptyText}>Không có dịch vụ nào</Text>
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
            <Text style={styles.modalTitle}>Thêm dịch vụ mới</Text>
            {renderServiceForm(false)}
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
          setSelectedService(null);
          resetForm();
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Chỉnh sửa dịch vụ</Text>
            {renderServiceForm(true)}
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
    marginBottom: 12,
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
  filterScroll: {
    maxHeight: 50,
  },
  filterContainer: {
    flexDirection: 'row',
    paddingVertical: 4,
    gap: 8,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  filterChipActive: {
    backgroundColor: '#2196F3',
  },
  filterChipIcon: {
    fontSize: 16,
    marginRight: 6,
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#666',
  },
  filterChipTextActive: {
    color: '#FFFFFF',
  },
  content: {
    flex: 1,
  },
  serviceCard: {
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
  serviceHeader: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  serviceIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: '#E3F2FD',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  serviceIcon: {
    fontSize: 28,
  },
  serviceInfo: {
    flex: 1,
  },
  serviceName: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#1A1A1A',
    marginBottom: 6,
  },
  typeBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#E3F2FD',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    marginBottom: 6,
  },
  typeBadgeText: {
    fontSize: 11,
    color: '#2196F3',
    fontWeight: '700',
  },
  serviceDescription: {
    fontSize: 13,
    color: '#666',
    marginBottom: 6,
    lineHeight: 18,
  },
  servicePrice: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#2196F3',
  },
  serviceActions: {
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
  typeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 10,
  },
  typeOption: {
    flex: 1,
    minWidth: '30%',
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#E0E0E0',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  typeOptionActive: {
    borderColor: '#2196F3',
    backgroundColor: '#E3F2FD',
  },
  typeIcon: {
    fontSize: 24,
    marginBottom: 4,
  },
  typeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
  },
  typeTextActive: {
    color: '#2196F3',
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
