import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { getTourById, Tour } from '../services/tourService';
import { getServices, Service, ServiceType, getServiceTypeIcon, getServiceTypeLabel } from '../services/serviceService';

export default function ServiceSelectionScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const tourId = params.tourId as string;
  const hotelId = params.hotelId as string | undefined;

  const [tour, setTour] = useState<Tour | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedType, setSelectedType] = useState<ServiceType | 'all'>('all');

  const serviceTypes: Array<{ type: ServiceType | 'all'; label: string; icon: string }> = [
    { type: 'all', label: 'Tất cả', icon: '📋' },
    { type: 'transport', label: 'Vận chuyển', icon: '🚗' },
    { type: 'food', label: 'Ăn uống', icon: '🍽️' },
    { type: 'guide', label: 'Hướng dẫn', icon: '👨‍🏫' },
    { type: 'ticket', label: 'Vé tham quan', icon: '🎫' },
    { type: 'other', label: 'Khác', icon: '📦' },
  ];

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [tourData, servicesData] = await Promise.all([
        getTourById(tourId),
        getServices({ limit: 100, sortBy: 'name:asc' }),
      ]);
      setTour(tourData);
      setServices(servicesData.results);
    } catch (error) {
      console.error('Error loading data:', error);
      Alert.alert('Lỗi', 'Không thể tải dữ liệu');
    } finally {
      setIsLoading(false);
    }
  };

  const toggleService = (serviceId: string) => {
    setSelectedServices(prev => {
      if (prev.includes(serviceId)) {
        return prev.filter(id => id !== serviceId);
      } else {
        return [...prev, serviceId];
      }
    });
  };

  const getSelectedServicesTotal = (): number => {
    return services
      .filter(service => selectedServices.includes(service.id))
      .reduce((total, service) => total + service.price, 0);
  };

  const handleContinue = () => {
    if (!tour) return;

    router.push({
      pathname: '/booking-form' as any,
      params: {
        tourId: tour.id,
        ...(hotelId && { hotelId }),
        services: selectedServices.join(','), // Convert array to comma-separated string
      },
    });
  };

  const handleSkip = () => {
    if (!tour) return;

    router.push({
      pathname: '/booking-form' as any,
      params: {
        tourId: tour.id,
        ...(hotelId && { hotelId }),
      },
    });
  };

  const filteredServices = selectedType === 'all'
    ? services
    : services.filter(s => s.type === selectedType);

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
            Chọn dịch vụ thêm
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
          {selectedServices.length > 0 && (
            <View style={styles.selectedBadge}>
              <Text style={styles.selectedBadgeText}>
                ✓ Đã chọn {selectedServices.length} dịch vụ
              </Text>
            </View>
          )}
        </View>

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

        {/* Services List */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            📦 Dịch vụ bổ sung ({filteredServices.length})
          </Text>
          <Text style={styles.sectionSubtitle}>
            Chọn các dịch vụ bạn muốn thêm vào chuyến đi
          </Text>

          {filteredServices.length > 0 ? (
            filteredServices.map((service) => {
              const isSelected = selectedServices.includes(service.id);
              
              return (
                <TouchableOpacity
                  key={service.id}
                  style={[
                    styles.serviceCard,
                    isSelected && styles.serviceCardSelected,
                  ]}
                  onPress={() => toggleService(service.id)}
                >
                  <View style={styles.serviceCheckbox}>
                    {isSelected ? (
                      <View style={styles.checkboxChecked}>
                        <Text style={styles.checkboxIcon}>✓</Text>
                      </View>
                    ) : (
                      <View style={styles.checkboxUnchecked} />
                    )}
                  </View>

                  <View style={styles.serviceIconContainer}>
                    <Text style={styles.serviceIcon}>
                      {getServiceTypeIcon(service.type)}
                    </Text>
                  </View>

                  <View style={styles.serviceInfo}>
                    <View style={styles.serviceHeader}>
                      <Text style={styles.serviceName} numberOfLines={1}>
                        {service.name}
                      </Text>
                      <View style={styles.serviceTypeBadge}>
                        <Text style={styles.serviceTypeBadgeText}>
                          {getServiceTypeLabel(service.type)}
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
              );
            })
          ) : (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>Không có dịch vụ nào</Text>
            </View>
          )}
        </View>

        <View style={{ height: 140 }} />
      </ScrollView>

      {/* Bottom Bar */}
      <View style={styles.bottomBar}>
        <View style={styles.bottomInfo}>
          <Text style={styles.bottomLabel}>Tổng phí dịch vụ thêm</Text>
          <Text style={styles.bottomPrice}>
            {getSelectedServicesTotal().toLocaleString('vi-VN')}₫
          </Text>
          <Text style={styles.bottomNote}>
            Chưa bao gồm giá tour và khách sạn
          </Text>
        </View>
        
        <View style={styles.bottomButtons}>
          <TouchableOpacity
            style={styles.skipButton}
            onPress={handleSkip}
          >
            <Text style={styles.skipButtonText}>Bỏ qua</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.continueButton}
            onPress={handleContinue}
          >
            <Text style={styles.continueButtonText}>
              {selectedServices.length > 0 
                ? `Tiếp tục (${selectedServices.length})` 
                : 'Tiếp tục'}
            </Text>
          </TouchableOpacity>
        </View>
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
    paddingTop: 30,
    paddingBottom: 16,
    paddingHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    backgroundColor: '#F5F7FA',
    borderRadius: 20,
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
  selectedBadge: {
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    alignSelf: 'flex-start',
    marginTop: 12,
  },
  selectedBadgeText: {
    fontSize: 13,
    color: '#4CAF50',
    fontWeight: '600',
  },
  filterContainer: {
    marginVertical: 12,
  },
  filterContent: {
    paddingHorizontal: 20,
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
  serviceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    padding: 14,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: '#E0E0E0',
  },
  serviceCardSelected: {
    backgroundColor: '#E3F2FD',
    borderColor: '#2196F3',
  },
  serviceCheckbox: {
    marginRight: 12,
  },
  checkboxUnchecked: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#B0B0B0',
    backgroundColor: '#fff',
  },
  checkboxChecked: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#2196F3',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxIcon: {
    fontSize: 14,
    color: '#fff',
    fontWeight: 'bold',
  },
  serviceIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  serviceIcon: {
    fontSize: 24,
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
  serviceName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1a1a1a',
    flex: 1,
    marginRight: 8,
  },
  serviceTypeBadge: {
    backgroundColor: '#E3F2FD',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  serviceTypeBadgeText: {
    fontSize: 9,
    color: '#2196F3',
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  serviceDescription: {
    fontSize: 12,
    color: '#666',
    lineHeight: 16,
    marginBottom: 8,
  },
  servicePriceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
  },
  servicePriceLabel: {
    fontSize: 11,
    color: '#999',
  },
  servicePrice: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#4CAF50',
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
  bottomButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  skipButton: {
    flex: 1,
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#2196F3',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  skipButtonText: {
    color: '#2196F3',
    fontSize: 16,
    fontWeight: 'bold',
  },
  continueButton: {
    flex: 2,
    backgroundColor: '#2196F3',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  continueButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
