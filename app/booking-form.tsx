import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Platform,
  Modal,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { StatusBar } from 'expo-status-bar';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { getTourById, Tour } from '../services/tourService';
import { createBooking } from '../services/bookingService';
import { getCurrentUser } from '../services/authService';
import { getServiceById, Service, getServiceTypeIcon, getServiceTypeLabel } from '../services/serviceService';

export default function BookingFormScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const tourId = params.tourId as string;
  const hotelId = params.hotelId as string | undefined; // Optional hotelId
  const servicesParam = params.services as string | undefined; // Comma-separated service IDs

  const [tour, setTour] = useState<Tour | null>(null);
  const [user, setUser] = useState<any>(null);
  const [selectedServices, setSelectedServices] = useState<Service[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [bookingId, setBookingId] = useState('');
  
  // Use useRef for isMounted to avoid closure issues
  const isMountedRef = React.useRef(true);

  // Form fields  
  const [startDate, setStartDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [numberOfPeople, setNumberOfPeople] = useState(1);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');

  // Error states for validation
  const [errors, setErrors] = useState({
    fullName: '',
    email: '',
    phone: '',
    address: '',
  });

  useEffect(() => {
    isMountedRef.current = true;
    loadData();
    
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [tourData, userData] = await Promise.all([
        getTourById(tourId),
        getCurrentUser(),
      ]);
      
      if (!isMountedRef.current) return;
      
      setTour(tourData);
      setUser(userData);

      // Load selected services if provided
      if (servicesParam) {
        const serviceIds = servicesParam.split(',').filter(id => id.trim());
        const servicesData = await Promise.all(
          serviceIds.map(id => getServiceById(id))
        );
        if (isMountedRef.current) {
          setSelectedServices(servicesData.filter(Boolean) as Service[]);
        }
      }
      
      // Check if user is not logged in
      if (!userData) {
        Alert.alert(
          'Chưa đăng nhập',
          'Bạn cần đăng nhập để đặt tour. Vui lòng đăng nhập trước.',
          [
            {
              text: 'Đăng nhập',
              onPress: () => {
                if (isMountedRef.current) {
                  router.replace('/(tabs)/profile');
                }
              },
            },
            {
              text: 'Quay lại',
              onPress: () => {
                if (isMountedRef.current) {
                  router.back();
                }
              },
              style: 'cancel',
            },
          ]
        );
        return;
      }
      
      // Pre-fill user info
      if (userData && isMountedRef.current) {
        setFullName(userData.name || '');
        setEmail(userData.email || '');
      }
    } catch (error) {
      if (isMountedRef.current) {
        Alert.alert('Lỗi', 'Không thể tải thông tin', [
          {
            text: 'OK',
            onPress: () => {
              if (isMountedRef.current) {
                router.back();
              }
            },
          },
        ]);
      }
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false);
      }
    }
  };

  const validateForm = () => {
    const newErrors = {
      fullName: '',
      email: '',
      phone: '',
      address: '',
    };

    let isValid = true;

    // Validate fullName
    if (!fullName.trim()) {
      newErrors.fullName = 'Vui lòng nhập họ và tên của bạn';
      isValid = false;
    } else if (fullName.trim().length < 3) {
      newErrors.fullName = 'Họ tên phải có ít nhất 3 ký tự';
      isValid = false;
    }

    // Validate email
    if (!email.trim()) {
      newErrors.email = 'Vui lòng nhập địa chỉ email';
      isValid = false;
    } else if (!email.includes('@') || !email.includes('.')) {
      newErrors.email = 'Vui lòng nhập đúng định dạng email (ví dụ: example@email.com)';
      isValid = false;
    }

    // Address is optional but show message if empty
    if (!address.trim()) {
      newErrors.address = 'Nên nhập địa chỉ để chúng tôi liên hệ tốt hơn';
      // Don't set isValid = false because address is optional
    }

    setErrors(newErrors);
    return isValid;
  };

  const clearError = (field: keyof typeof errors) => {
    setErrors(prev => ({ ...prev, [field]: '' }));
  };

  const handleSubmit = async () => {
    if (!validateForm() || !tour) return;

    if (!user) {
      Alert.alert(
        'Chưa đăng nhập',
        'Vui lòng đăng nhập để đặt tour',
        [
          {
            text: 'Đăng nhập',
            onPress: () => router.push('/(tabs)/profile'),
          },
          {
            text: 'Hủy',
            style: 'cancel',
          },
        ]
      );
      return;
    }

    if (!tour.id || tour.id.length !== 24) {
      Alert.alert('Lỗi', 'Tour ID không hợp lệ. Vui lòng thử lại sau.');
      return;
    }

    try {
      setIsSubmitting(true);

      // Calculate end date based on tour duration
      const durationMatch = tour.duration.match(/(\d+)\s*ngày/);
      const days = durationMatch ? parseInt(durationMatch[1]) : 1;
      const endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + days - 1);

      // Calculate total price including services
      const servicesTotal = selectedServices.reduce((total, service) => total + service.price, 0);
      const totalPrice = (tour.pricePerPerson * numberOfPeople) + servicesTotal;

      const bookingData = {
        tourId: tour.id,
        ...(hotelId && { hotelId }), // Add hotelId if exists
        ...(selectedServices.length > 0 && { services: selectedServices.map(s => s.id) }), // Add services if selected
        numberOfPeople,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        totalPrice,
      };
      
      const result = await createBooking(bookingData);

      if (!isMountedRef.current) return;

      // Set booking ID and show success modal
      setBookingId(result.id || 'N/A');
      setShowSuccessModal(true);
      setIsSubmitting(false);
    } catch (error: any) {
      if (!isMountedRef.current) return;
      
      let errorMessage = 'Không thể đặt tour. Vui lòng thử lại.';
      
      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.response?.status === 401) {
        errorMessage = 'Vui lòng đăng nhập để đặt tour';
      } else if (error.response?.status === 400) {
        errorMessage = 'Thông tin đặt tour không hợp lệ. Vui lòng kiểm tra lại.';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      Alert.alert('Lỗi', errorMessage);
    } finally {
      if (isMountedRef.current) {
        setIsSubmitting(false);
      }
    }
  };

  const formatPrice = (price: number): string => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(price);
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2196F3" />
        <Text style={styles.loadingText}>Đang tải...</Text>
      </View>
    );
  }

  if (!tour) return null;

  const servicesTotal = selectedServices.reduce((total, service) => total + service.price, 0);
  const totalPrice = (tour.pricePerPerson * numberOfPeople) + servicesTotal;

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Thông tin đặt tour</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Tour Summary */}
        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>📋 Thông tin tour</Text>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Tên tour:</Text>
            <Text style={styles.summaryValue} numberOfLines={2}>{tour.name}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Điểm đến:</Text>
            <Text style={styles.summaryValue}>{tour.destination}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Thời gian:</Text>
            <Text style={styles.summaryValue}>{tour.duration}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Ngày khởi hành:</Text>
            <Text style={styles.summaryValue}>{startDate.toLocaleDateString('vi-VN')}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Số người:</Text>
            <Text style={styles.summaryValue}>{numberOfPeople} người</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabelBold}>Tổng tiền:</Text>
            <Text style={styles.summaryPriceValue}>{formatPrice(totalPrice)}</Text>
          </View>
        </View>

        {/* Selected Services */}
        {selectedServices.length > 0 && (
          <View style={styles.servicesCard}>
            <Text style={styles.servicesTitle}>🎫 Dịch vụ đã chọn ({selectedServices.length})</Text>
            {selectedServices.map((service) => (
              <View key={service.id} style={styles.serviceItem}>
                <View style={styles.serviceHeader}>
                  <View style={styles.serviceIconBox}>
                    <Text style={styles.serviceIcon}>{getServiceTypeIcon(service.type)}</Text>
                  </View>
                  <View style={styles.serviceInfoContent}>
                    <View style={styles.serviceNameRow}>
                      <Text style={styles.serviceName}>{service.name}</Text>
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
                    <Text style={styles.servicePrice}>{formatPrice(service.price)}</Text>
                  </View>
                </View>
              </View>
            ))}
            <View style={styles.serviceDivider} />
            <View style={styles.serviceTotalRow}>
              <Text style={styles.serviceTotalLabel}>Tổng tiền dịch vụ:</Text>
              <Text style={styles.serviceTotalValue}>{formatPrice(servicesTotal)}</Text>
            </View>
          </View>
        )}

        {/* Date Picker Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📅 Chọn ngày khởi hành</Text>
          
          <TouchableOpacity 
            style={styles.datePickerButton}
            onPress={() => setShowDatePicker(true)}
            disabled={isSubmitting}
          >
            <Text style={styles.datePickerButtonText}>
              {startDate.toLocaleDateString('vi-VN', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}
            </Text>
          </TouchableOpacity>

          {showDatePicker && (
            <DateTimePicker
              value={startDate}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={(event, selectedDate) => {
                setShowDatePicker(Platform.OS === 'ios');
                if (selectedDate) {
                  setStartDate(selectedDate);
                }
              }}
              minimumDate={new Date()}
            />
          )}
        </View>

        {/* Number of People Selector */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>👥 Số lượng người</Text>
          
          <View style={styles.peopleSelector}>
            <TouchableOpacity 
              style={[styles.peopleButton, numberOfPeople <= 1 && styles.peopleButtonDisabled]}
              onPress={() => setNumberOfPeople(Math.max(1, numberOfPeople - 1))}
              disabled={numberOfPeople <= 1 || isSubmitting}
            >
              <Text style={styles.peopleButtonText}>−</Text>
            </TouchableOpacity>
            
            <View style={styles.peopleCountContainer}>
              <Text style={styles.peopleCount}>{numberOfPeople}</Text>
              <Text style={styles.peopleLabel}>người</Text>
            </View>
            
            <TouchableOpacity 
              style={[styles.peopleButton, numberOfPeople >= 20 && styles.peopleButtonDisabled]}
              onPress={() => setNumberOfPeople(Math.min(20, numberOfPeople + 1))}
              disabled={numberOfPeople >= 20 || isSubmitting}
            >
              <Text style={styles.peopleButtonText}>+</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.peopleNote}>
            💡 Giá tour: {formatPrice(tour.pricePerPerson)} × {numberOfPeople} người = {formatPrice(totalPrice)}
          </Text>
        </View>

        {/* Contact Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>👤 Thông tin liên hệ</Text>
          
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Họ và tên <Text style={styles.required}>*</Text></Text>
            <TextInput
              style={[styles.input, errors.fullName && styles.inputError]}
              placeholder="Nhập họ tên đầy đủ"
              value={fullName}
              onChangeText={(text) => {
                setFullName(text);
                if (errors.fullName) clearError('fullName');
              }}
              editable={!isSubmitting}
            />
            {errors.fullName ? (
              <View style={styles.errorContainer}>
                <Text style={styles.errorIcon}>⚠️</Text>
                <Text style={styles.errorText}>{errors.fullName}</Text>
              </View>
            ) : null}
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Email <Text style={styles.required}>*</Text></Text>
            <TextInput
              style={[styles.input, errors.email && styles.inputError]}
              placeholder="example@email.com"
              value={email}
              onChangeText={(text) => {
                setEmail(text);
                if (errors.email) clearError('email');
              }}
              keyboardType="email-address"
              autoCapitalize="none"
              editable={!isSubmitting}
            />
            {errors.email ? (
              <View style={styles.errorContainer}>
                <Text style={styles.errorIcon}>⚠️</Text>
                <Text style={styles.errorText}>{errors.email}</Text>
              </View>
            ) : null}
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Địa chỉ</Text>
            <TextInput
              style={[styles.input, errors.address && styles.inputWarning]}
              placeholder="Nhập địa chỉ của bạn"
              value={address}
              onChangeText={(text) => {
                setAddress(text);
                if (errors.address) clearError('address');
              }}
              editable={!isSubmitting}
            />
            {errors.address ? (
              <View style={styles.warningContainer}>
                <Text style={styles.warningIcon}>💡</Text>
                <Text style={styles.warningText}>{errors.address}</Text>
              </View>
            ) : null}
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Ghi chú</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Yêu cầu đặc biệt, câu hỏi..."
              value={notes}
              onChangeText={setNotes}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              editable={!isSubmitting}
            />
          </View>
        </View>

        {/* Terms */}
        <View style={styles.termsContainer}>
          <Text style={styles.termsIcon}>ℹ️</Text>
          <Text style={styles.termsText}>
            Bằng việc tiếp tục, bạn đồng ý với{' '}
            <Text style={styles.termsLink}>Điều khoản dịch vụ</Text> và{' '}
            <Text style={styles.termsLink}>Chính sách bảo mật</Text> của chúng tôi
          </Text>
        </View>
      </ScrollView>

      {/* Bottom Bar */}
      <View style={styles.bottomBar}>
        <View style={styles.bottomPrice}>
          <Text style={styles.bottomPriceLabel}>Tổng thanh toán</Text>
          <Text style={styles.bottomPriceValue}>{formatPrice(totalPrice)}</Text>
        </View>
        <TouchableOpacity
          style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={styles.submitButtonText}>Xác nhận đặt tour</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Success Modal */}
      <Modal
        visible={showSuccessModal}
        animationType="fade"
        transparent={true}
        onRequestClose={() => {
          setShowSuccessModal(false);
          router.replace('/(tabs)/bookings');
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            {/* Success Icon */}
            <View style={styles.successIconContainer}>
              <Text style={styles.successIcon}>✓</Text>
            </View>

            {/* Title */}
            <Text style={styles.modalTitle}>Đặt tour thành công!</Text>
            
            {/* Message */}
            <Text style={styles.modalMessage}>
              Chúc mừng! Booking của bạn đã được tạo thành công.
            </Text>

            {/* Booking Details */}
            <View style={styles.bookingDetails}>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>📋 Mã đặt tour:</Text>
                <Text style={styles.detailValue}>{bookingId}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>⏳ Trạng thái:</Text>
                <Text style={styles.detailValuePending}>Đang chờ xác nhận</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>🎫 Tour:</Text>
                <Text style={styles.detailValue} numberOfLines={2}>{tour?.name}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>👥 Số người:</Text>
                <Text style={styles.detailValue}>{numberOfPeople} người</Text>
              </View>
            </View>

            {/* Info Note */}
            <View style={styles.infoNote}>
              <Text style={styles.infoNoteText}>
                ℹ️ Bạn có thể xem chi tiết đặt tour trong mục "Tour đã đặt"
              </Text>
            </View>

            {/* Action Button */}
            <TouchableOpacity
              style={styles.modalButton}
              onPress={() => {
                setShowSuccessModal(false);
                router.replace('/(tabs)/bookings');
              }}
            >
              <Text style={styles.modalButtonText}>Xem tour đã đặt</Text>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    paddingTop: Platform.OS === 'ios' ? 60 : 30,
    paddingBottom: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backButtonText: {
    fontSize: 28,
    color: '#2196F3',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
  },
  summaryCard: {
    backgroundColor: '#fff',
    margin: 16,
    padding: 16,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 16,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  summaryLabel: {
    fontSize: 14,
    color: '#666',
    flex: 1,
  },
  summaryValue: {
    fontSize: 14,
    color: '#1a1a1a',
    fontWeight: '500',
    flex: 1,
    textAlign: 'right',
  },
  summaryLabelBold: {
    fontSize: 16,
    color: '#1a1a1a',
    fontWeight: 'bold',
  },
  summaryPriceValue: {
    fontSize: 18,
    color: '#2196F3',
    fontWeight: 'bold',
  },
  divider: {
    height: 1,
    backgroundColor: '#E0E0E0',
    marginVertical: 12,
  },
  servicesCard: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 16,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  servicesTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 12,
  },
  serviceItem: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  serviceHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  serviceIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#F0F8FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  serviceIcon: {
    fontSize: 24,
  },
  serviceInfoContent: {
    flex: 1,
  },
  serviceNameRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
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
    fontSize: 13,
    color: '#666',
    marginBottom: 6,
  },
  servicePrice: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  serviceInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  serviceDivider: {
    height: 1,
    backgroundColor: '#E0E0E0',
    marginTop: 8,
    marginBottom: 12,
  },
  serviceTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  serviceTotalLabel: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  serviceTotalValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2196F3',
  },
  section: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 16,
    borderRadius: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 16,
  },
  datePickerButton: {
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  datePickerButtonText: {
    fontSize: 15,
    color: '#1a1a1a',
    textAlign: 'center',
    fontWeight: '500',
  },
  peopleSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F5F5F5',
    borderRadius: 16,
    padding: 20,
    marginBottom: 12,
  },
  peopleButton: {
    width: 24,
    height: 24,
    borderRadius: 24,
    backgroundColor: '#2196F3',
    justifyContent: 'center',
    alignItems: 'center'
  },
  peopleButtonDisabled: {
    backgroundColor: '#B0B0B0',
    shadowOpacity: 0,
  },
  peopleButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  peopleCountContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 32,
    minWidth: 80,
  },
  peopleCount: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  peopleLabel: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  peopleNote: {
    fontSize: 13,
    color: '#666',
    textAlign: 'center',
    backgroundColor: '#E3F2FD',
    padding: 12,
    borderRadius: 12,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  required: {
    color: '#FF3B30',
  },
  input: {
    backgroundColor: '#F5F5F5',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    color: '#333',
  },
  inputError: {
    borderColor: '#FF3B30',
    borderWidth: 2,
    backgroundColor: '#FFF5F5',
  },
  inputWarning: {
    borderColor: '#FF9800',
    borderWidth: 1,
    backgroundColor: '#FFFBF0',
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    paddingHorizontal: 4,
  },
  errorIcon: {
    fontSize: 14,
    marginRight: 6,
  },
  errorText: {
    fontSize: 13,
    color: '#FF3B30',
    flex: 1,
    lineHeight: 18,
  },
  warningContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    paddingHorizontal: 4,
  },
  warningIcon: {
    fontSize: 14,
    marginRight: 6,
  },
  warningText: {
    fontSize: 13,
    color: '#FF9800',
    flex: 1,
    lineHeight: 18,
    fontStyle: 'italic',
  },
  textArea: {
    height: 100,
    paddingTop: 12,
  },
  termsContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFF3CD',
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 12,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#FF9800',
  },
  termsIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  termsText: {
    flex: 1,
    fontSize: 12,
    color: '#856404',
    lineHeight: 18,
  },
  termsLink: {
    color: '#2196F3',
    fontWeight: '600',
  },
  bottomBar: {
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 10,
  },
  bottomPrice: {
    marginBottom: 12,
  },
  bottomPriceLabel: {
    fontSize: 13,
    color: '#666',
    marginBottom: 4,
  },
  bottomPriceValue: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#2196F3',
  },
  submitButton: {
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
  submitButtonDisabled: {
    backgroundColor: '#999',
    shadowOpacity: 0,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  // Success Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContainer: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 30,
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  successIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#4CAF50',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  successIcon: {
    fontSize: 50,
    color: '#fff',
    fontWeight: 'bold',
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 12,
    textAlign: 'center',
  },
  modalMessage: {
    fontSize: 15,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  bookingDetails: {
    width: '100%',
    backgroundColor: '#F5F5F5',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  detailLabel: {
    fontSize: 14,
    color: '#666',
    flex: 1,
  },
  detailValue: {
    fontSize: 14,
    color: '#1a1a1a',
    fontWeight: '600',
    flex: 1,
    textAlign: 'right',
  },
  detailValuePending: {
    fontSize: 14,
    color: '#FF9800',
    fontWeight: '600',
    flex: 1,
    textAlign: 'right',
  },
  infoNote: {
    backgroundColor: '#E3F2FD',
    borderRadius: 12,
    padding: 12,
    marginBottom: 24,
    width: '100%',
  },
  infoNoteText: {
    fontSize: 13,
    color: '#1976D2',
    textAlign: 'center',
    lineHeight: 20,
  },
  modalButton: {
    backgroundColor: '#2196F3',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    width: '100%',
    alignItems: 'center',
    shadowColor: '#2196F3',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  modalButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
