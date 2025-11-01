import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Modal,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { getServices, Service, ServiceType, getServiceTypeLabel, getServiceTypeIcon } from '../../services/serviceService';
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
export default function ServicesScreen() {
  const [searchQuery, setSearchQuery] = useState('');
  const [services, setServices] = useState<Service[]>([]);
  const [filteredServices, setFilteredServices] = useState<Service[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedType, setSelectedType] = useState<ServiceType | 'all'>('all');
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  const serviceTypes: Array<{ type: ServiceType | 'all'; label: string; icon: string }> = [
    { type: 'all', label: 'Tất cả', icon: '📋' },
    { type: 'transport', label: 'Vận chuyển', icon: '🚗' },
    { type: 'food', label: 'Ăn uống', icon: '🍽️' },
    { type: 'guide', label: 'Hướng dẫn viên', icon: '👨‍🏫' },
    { type: 'ticket', label: 'Vé tham quan', icon: '🎫' },
    { type: 'other', label: 'Khác', icon: '📦' },
  ];

  useEffect(() => {
    loadServices();
  }, []);

  useEffect(() => {
    filterServices();
  }, [services, searchQuery, selectedType]);

  const loadServices = async () => {
    try {
      setIsLoading(true);
      const response = await getServices({ limit: 100, sortBy: 'name:asc' });
      setServices(response.results);
    } catch (error) {
      console.error('Error loading services:', error);
      Alert.alert('Lỗi', 'Không thể tải danh sách dịch vụ');
    } finally {
      setIsLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadServices();
    setRefreshing(false);
  };

  const filterServices = () => {
    let filtered = services;

    // Filter by type
    if (selectedType !== 'all') {
      filtered = filtered.filter(service => service.type === selectedType);
    }

    // Filter by search query
    if (searchQuery.trim()) {
      filtered = filtered.filter(service =>
        service.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        service.description?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    setFilteredServices(filtered);
  };

  const handleServicePress = (service: Service) => {
    setSelectedService(service);
    setShowDetailModal(true);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('vi-VN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2196F3" />
        <Text style={styles.loadingText}>Đang tải dịch vụ...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Dịch vụ</Text>
        <Text style={styles.headerSubtitle}>
          {services.length} dịch vụ du lịch đa dạng
        </Text>

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <Ionicons name="search-outline" size={20} color="#2196F3" style={{ marginRight: 8 }} />
          <TextInput
            style={styles.searchInput}
            placeholder="Tìm kiếm dịch vụ..."
            placeholderTextColor="#999"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Text style={styles.clearIcon}>✕</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Type Filter */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.filterContainer}
          contentContainerStyle={styles.filterContent}
        >
          {serviceTypes.map((item) => (
            <TouchableOpacity
              key={item.type}
              style={[
                styles.filterChip,
                selectedType === item.type && styles.filterChipActive,
              ]}
              onPress={() => setSelectedType(item.type)}
            >
              <Text style={styles.filterChipIcon}>{item.icon}</Text>
              <Text
                style={[
                  styles.filterChipText,
                  selectedType === item.type && styles.filterChipTextActive,
                ]}
              >
                {item.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Services Grid */}
        <View style={styles.servicesGrid}>
          {filteredServices.length > 0 ? (
            filteredServices.map((service) => (
              <TouchableOpacity
                key={service.id}
                style={styles.serviceCard}
                activeOpacity={0.7}
                onPress={() => handleServicePress(service)}
              >
                <View style={styles.serviceIconContainer}>
                  <Text style={styles.serviceIcon}>
                    {getServiceTypeIcon(service.type)}
                  </Text>
                </View>
                <View style={styles.serviceInfo}>
                  <View style={styles.serviceHeader}>
                    <Text style={styles.serviceTitle} numberOfLines={1}>
                      {service.name}
                    </Text>
                    <View style={styles.serviceTypeBadge}>
                      <Text style={styles.serviceTypeBadgeText}>
                        {service.type}
                      </Text>
                    </View>
                  </View>
                  {service.description && (
                    <Text style={styles.serviceDescription} numberOfLines={2}>
                      {service.description}
                    </Text>
                  )}
                  <View style={styles.servicePriceRow}>
                    <Text style={styles.servicePriceLabel}>Giá:</Text>
                    <Text style={styles.servicePrice}>
                      {service.price.toLocaleString('vi-VN')}₫
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            ))
          ) : (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyIcon}>🔍</Text>
              <Text style={styles.emptyText}>
                {searchQuery
                  ? 'Không tìm thấy dịch vụ phù hợp'
                  : 'Chưa có dịch vụ nào'}
              </Text>
              {searchQuery && (
                <TouchableOpacity
                  style={styles.clearButton}
                  onPress={() => {
                    setSearchQuery('');
                    setSelectedType('all');
                  }}
                >
                  <Text style={styles.clearButtonText}>Xóa bộ lọc</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>

        <View style={{ height: 20 }} />
      </ScrollView>

      {/* Detail Modal */}
      <Modal
        visible={showDetailModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowDetailModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {selectedService && (
              <>
                <View style={styles.modalHeader}>
                  <View style={styles.modalIconContainer}>
                    <Text style={styles.modalIcon}>
                      {getServiceTypeIcon(selectedService.type)}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={styles.modalCloseButton}
                    onPress={() => setShowDetailModal(false)}
                  >
                    <Text style={styles.modalCloseText}>✕</Text>
                  </TouchableOpacity>
                </View>

                <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
                  <Text style={styles.modalTitle}>{selectedService.name}</Text>

                  <View style={styles.modalBadge}>
                    <Text style={styles.modalBadgeText}>
                      {getServiceTypeLabel(selectedService.type)}
                    </Text>
                  </View>

                  <View style={styles.modalSection}>
                    <Text style={styles.modalSectionTitle}>📝 Mô tả</Text>
                    <Text style={styles.modalSectionContent}>
                      {selectedService.description || 'Không có mô tả chi tiết'}
                    </Text>
                  </View>

                  <View style={styles.modalSection}>
                    <Text style={styles.modalSectionTitle}>💰 Giá dịch vụ</Text>
                    <Text style={styles.modalPrice}>
                      {selectedService.price.toLocaleString('vi-VN')}₫
                    </Text>
                  </View>

                  <View style={styles.modalSection}>
                    <Text style={styles.modalSectionTitle}>🏷️ Loại dịch vụ</Text>
                    <Text style={styles.modalSectionContent}>
                      {getServiceTypeLabel(selectedService.type)}
                    </Text>
                  </View>

                  <View style={styles.modalSection}>
                    <Text style={styles.modalSectionTitle}>📅 Thông tin hệ thống</Text>
                    <View style={styles.modalInfoRow}>
                      <Text style={styles.modalInfoLabel}>ID:</Text>
                      <Text style={styles.modalInfoValue}>{selectedService.id}</Text>
                    </View>
                    {selectedService.createdAt && (
                      <View style={styles.modalInfoRow}>
                        <Text style={styles.modalInfoLabel}>Ngày tạo:</Text>
                        <Text style={styles.modalInfoValue}>
                          {formatDate(selectedService.createdAt)}
                        </Text>
                      </View>
                    )}
                    {selectedService.updatedAt && (
                      <View style={styles.modalInfoRow}>
                        <Text style={styles.modalInfoLabel}>Cập nhật:</Text>
                        <Text style={styles.modalInfoValue}>
                          {formatDate(selectedService.updatedAt)}
                        </Text>
                      </View>
                    )}
                  </View>
                </ScrollView>

                <TouchableOpacity
                  style={styles.modalButton}
                  onPress={() => setShowDetailModal(false)}
                >
                  <Text style={styles.modalButtonText}>Đóng</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
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
  header: {
    backgroundColor: '#FFFFFF',
    paddingTop: 30,
    paddingBottom: 20,
    paddingHorizontal: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1A1A1A',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 20,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F7FA',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  searchIcon: {
    fontSize: 20,
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#333',
  },
  clearIcon: {
    fontSize: 18,
    color: '#999',
    paddingHorizontal: 8,
  },
  content: {
    flex: 1,
  },
  filterContainer: {
    marginTop: 16,
    marginBottom: 8,
  },
  filterContent: {
    paddingHorizontal: 24,
    gap: 10,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    gap: 6,
  },
  filterChipActive: {
    backgroundColor: '#2196F3',
    borderColor: '#2196F3',
  },
  filterChipIcon: {
    fontSize: 16,
  },
  filterChipText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  filterChipTextActive: {
    color: '#fff',
  },
  servicesGrid: {
    paddingHorizontal: 24,
    marginTop: 12,
  },
  serviceCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  serviceIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 12,
    backgroundColor: '#F0F8FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  serviceIcon: {
    fontSize: 28,
  },
  serviceInfo: {
    flex: 1,
  },
  serviceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  serviceTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    marginRight: 8,
  },
  serviceTypeBadge: {
    backgroundColor: '#E3F2FD',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  serviceTypeBadgeText: {
    fontSize: 10,
    color: '#2196F3',
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  serviceDescription: {
    fontSize: 13,
    color: '#666',
    lineHeight: 18,
    marginBottom: 8,
  },
  servicePriceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
  },
  servicePriceLabel: {
    fontSize: 12,
    color: '#999',
  },
  servicePrice: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#4CAF50',
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
    marginBottom: 20,
  },
  clearButton: {
    backgroundColor: '#2196F3',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 20,
  },
  clearButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  serviceArrow: {
    fontSize: 28,
    color: '#ddd',
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
    paddingBottom: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  modalIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#F0F8FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalIcon: {
    fontSize: 32,
  },
  modalCloseButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalCloseText: {
    fontSize: 20,
    color: '#666',
    fontWeight: '300',
  },
  modalBody: {
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 12,
  },
  modalBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#E3F2FD',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    marginBottom: 20,
  },
  modalBadgeText: {
    fontSize: 12,
    color: '#2196F3',
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  modalSection: {
    marginBottom: 20,
  },
  modalSectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  modalSectionContent: {
    fontSize: 15,
    color: '#666',
    lineHeight: 22,
  },
  modalPrice: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  modalInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5',
  },
  modalInfoLabel: {
    fontSize: 14,
    color: '#999',
    flex: 1,
  },
  modalInfoValue: {
    fontSize: 14,
    color: '#1a1a1a',
    flex: 2,
    textAlign: 'right',
  },
  modalButton: {
    backgroundColor: '#2196F3',
    marginHorizontal: 20,
    marginTop: 10,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
