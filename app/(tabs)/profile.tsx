import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
  ActivityIndicator,
  TextInput,
  Modal,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useRouter, useFocusEffect } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getCurrentUser, logout, updateCachedUser } from '../../services/authService';
import { updateUser } from '../../services/userService';

export default function ProfileScreen() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editName, setEditName] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [showContactModal, setShowContactModal] = useState(false);
  const [showAboutModal, setShowAboutModal] = useState(false);

  useEffect(() => {
    loadUser();
  }, []);

  // Reload user data when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      loadUser();
    }, [])
  );

  const loadUser = async () => {
    try {
      const userData = await getCurrentUser();
      setUser(userData);
      setEditName(userData?.name || '');
    } catch (error) {
      console.error('Error loading user:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditProfile = () => {
    setEditName(user?.name || '');
    setShowEditModal(true);
  };

  const handleUpdateProfile = async () => {
    if (!editName.trim()) {
      Alert.alert('Lỗi', 'Vui lòng nhập họ tên');
      return;
    }

    try {
      setIsUpdating(true);
      console.log('Updating user with name:', editName.trim());
      const updatedUser = await updateUser(user.id, {
        name: editName.trim(),
      });
      console.log('Updated user data received:', updatedUser);
      
      // Cập nhật state
      setUser(updatedUser);
      
      // QUAN TRỌNG: Cập nhật AsyncStorage cache
      await updateCachedUser(updatedUser);
      console.log('Cache updated with new user data');
      
      setShowEditModal(false);
      Alert.alert('Thành công', 'Cập nhật tên thành công');
    } catch (error: any) {
      console.error('Error updating profile:', error);
      Alert.alert('Lỗi', error.response?.data?.message || 'Không thể cập nhật thông tin');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleLogout = async () => {
    try {
      console.log('🔄 Starting logout...');
      setIsLoggingOut(true);
      
      // Logout và xóa tokens
      await logout();
      console.log('✅ Logout successful');
      
      // Clear user state
      setUser(null);
      
      // Chuyển về trang login
      console.log('➡️ Redirecting to login...');
      router.replace('/login');
      
    } catch (error) {
      console.error('❌ Logout failed:', error);
      setIsLoggingOut(false);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2196F3" />
      </View>
    );
  }

  // Nếu chưa đăng nhập, hiển thị màn hình yêu cầu đăng nhập
  if (!user) {
    return (
      <View style={styles.container}>
        <StatusBar style="dark" />
        <View style={styles.loginPromptContainer}>
          <View style={styles.loginPromptIcon}>
            <Text style={styles.loginPromptIconText}>👤</Text>
          </View>
          <Text style={styles.loginPromptTitle}>Chưa đăng nhập</Text>
          <Text style={styles.loginPromptText}>
            Vui lòng đăng nhập để sử dụng đầy đủ tính năng
          </Text>
          <TouchableOpacity
            style={styles.loginPromptButton}
            onPress={() => router.replace('/login')}
          >
            <Text style={styles.loginPromptButtonText}>Đăng nhập ngay</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.avatarContainer}>
          <Text style={styles.avatarText}>
            {user?.name?.charAt(0).toUpperCase() || 'U'}
          </Text>
        </View>
        <Text style={styles.userName}>{user?.name || 'User'}</Text>
        <Text style={styles.userEmail}>{user?.email || ''}</Text>
        {user?.isEmailVerified ? (
          <View style={styles.verifiedBadge}>
            <Text style={styles.verifiedText}>✓ Email đã xác thực</Text>
          </View>
        ) : (
          <View style={styles.unverifiedBadge}>
            <Text style={styles.unverifiedText}>⚠️ Chưa xác thực email</Text>
          </View>
        )}
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Admin Dashboard Button - Only show for admin */}
        {user?.role === 'admin' && (
          <View style={styles.adminSection}>
            <TouchableOpacity
              style={styles.adminButton}
              onPress={() => router.push('/admin')}
            >
              <View style={styles.adminButtonContent}>
                <Text style={styles.adminButtonIcon}>⚡</Text>
                <View style={styles.adminButtonTextContainer}>
                  <Text style={styles.adminButtonTitle}>Admin Dashboard</Text>
                  <Text style={styles.adminButtonSubtitle}>Quản lý hệ thống</Text>
                </View>
                <Text style={styles.adminButtonArrow}>→</Text>
              </View>
            </TouchableOpacity>
          </View>
        )}

        {/* Menu Items */}
        <View style={styles.menuSection}>
          <Text style={styles.sectionTitle}>Tài khoản</Text>
          
          <TouchableOpacity 
            style={styles.menuItem}
            onPress={handleEditProfile}
          >
            <Text style={styles.menuIcon}>👤</Text>
            <Text style={styles.menuText}>Thông tin cá nhân</Text>
            <Text style={styles.menuArrow}>›</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.menuItem}
            onPress={() => router.push('/(tabs)/bookings')}
          >
            <Text style={styles.menuIcon}>📋</Text>
            <Text style={styles.menuText}>Đơn đặt tour</Text>
            <Text style={styles.menuArrow}>›</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.menuItem}
            onPress={() => router.push('/(tabs)/notifications')}
          >
            <Text style={styles.menuIcon}>🔔</Text>
            <Text style={styles.menuText}>Thông báo</Text>
            <Text style={styles.menuArrow}>›</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.menuSection}>
          <Text style={styles.sectionTitle}>Khám phá</Text>
          
          <TouchableOpacity 
            style={styles.menuItem}
            onPress={() => router.push('/(tabs)')}
          >
            <Text style={styles.menuIcon}>🎫</Text>
            <Text style={styles.menuText}>Tour du lịch</Text>
            <Text style={styles.menuArrow}>›</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.menuItem}
            onPress={() => router.push('/(tabs)/services')}
          >
            <Text style={styles.menuIcon}>🛎️</Text>
            <Text style={styles.menuText}>Dịch vụ</Text>
            <Text style={styles.menuArrow}>›</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.menuSection}>
          <Text style={styles.sectionTitle}>Hỗ trợ</Text>
          
          <TouchableOpacity 
            style={styles.menuItem}
            onPress={() => setShowHelpModal(true)}
          >
            <Text style={styles.menuIcon}>❓</Text>
            <Text style={styles.menuText}>Trợ giúp</Text>
            <Text style={styles.menuArrow}>›</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.menuItem}
            onPress={() => setShowContactModal(true)}
          >
            <Text style={styles.menuIcon}>📞</Text>
            <Text style={styles.menuText}>Liên hệ</Text>
            <Text style={styles.menuArrow}>›</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.menuItem}
            onPress={() => setShowAboutModal(true)}
          >
            <Text style={styles.menuIcon}>ℹ️</Text>
            <Text style={styles.menuText}>Về chúng tôi</Text>
            <Text style={styles.menuArrow}>›</Text>
          </TouchableOpacity>
        </View>

        {/* Logout Button */}
        <TouchableOpacity 
          style={[styles.logoutButton, isLoggingOut && styles.logoutButtonDisabled]} 
          onPress={() => {
            console.log('=== LOGOUT BUTTON CLICKED ===');
            handleLogout();
          }}
          disabled={isLoggingOut}
          activeOpacity={0.7}
        >
          {isLoggingOut ? (
            <ActivityIndicator color="#FF3B30" />
          ) : (
            <Text style={styles.logoutText}>🚪 Đăng xuất</Text>
          )}
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Edit Profile Modal */}
      <Modal
        visible={showEditModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => !isUpdating && setShowEditModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Chỉnh sửa thông tin</Text>
              <TouchableOpacity
                onPress={() => setShowEditModal(false)}
                disabled={isUpdating}
              >
                <Text style={styles.modalCloseText}>✕</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.modalContent}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Họ và tên <Text style={styles.required}>*</Text></Text>
                <TextInput
                  style={styles.input}
                  placeholder="Nhập họ tên"
                  value={editName}
                  onChangeText={setEditName}
                  editable={!isUpdating}
                  autoFocus
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Email</Text>
                <TextInput
                  style={[styles.input, styles.inputDisabled]}
                  value={user?.email}
                  editable={false}
                />
                <Text style={styles.inputNote}>Email không thể thay đổi</Text>
              </View>
            </View>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setShowEditModal(false)}
                disabled={isUpdating}
              >
                <Text style={styles.cancelButtonText}>Hủy</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.saveButton]}
                onPress={handleUpdateProfile}
                disabled={isUpdating}
              >
                {isUpdating ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.saveButtonText}>Lưu</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Help Modal */}
      <Modal
        visible={showHelpModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowHelpModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.infoModalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Trung tâm trợ giúp</Text>
              <TouchableOpacity onPress={() => setShowHelpModal(false)}>
                <Text style={styles.modalCloseText}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.infoModalContent} showsVerticalScrollIndicator={false}>
              <View style={styles.infoSection}>
                <View style={styles.infoIconContainer}>
                  <Text style={styles.infoIcon}>📞</Text>
                </View>
                <Text style={styles.infoTitle}>Hotline 24/7</Text>
                <Text style={styles.infoText}>1900-xxxx</Text>
                <Text style={styles.infoSubText}>Hỗ trợ khẩn cấp bất cứ lúc nào</Text>
              </View>

              <View style={styles.infoSection}>
                <View style={styles.infoIconContainer}>
                  <Text style={styles.infoIcon}>📧</Text>
                </View>
                <Text style={styles.infoTitle}>Email hỗ trợ</Text>
                <Text style={styles.infoText}>support@travel.vn</Text>
                <Text style={styles.infoSubText}>Phản hồi trong vòng 24 giờ</Text>
              </View>

              <View style={styles.infoSection}>
                <View style={styles.infoIconContainer}>
                  <Text style={styles.infoIcon}>💬</Text>
                </View>
                <Text style={styles.infoTitle}>Chat trực tuyến</Text>
                <Text style={styles.infoText}>8:00 - 22:00 hàng ngày</Text>
                <Text style={styles.infoSubText}>Tư vấn viên sẵn sàng hỗ trợ</Text>
              </View>

              <View style={styles.infoSection}>
                <View style={styles.infoIconContainer}>
                  <Text style={styles.infoIcon}>❓</Text>
                </View>
                <Text style={styles.infoTitle}>Câu hỏi thường gặp</Text>
                <Text style={styles.infoText}>FAQ & Hướng dẫn</Text>
                <Text style={styles.infoSubText}>Tìm câu trả lời nhanh chóng</Text>
              </View>

              <View style={styles.helpNote}>
                <Text style={styles.helpNoteText}>
                  💡 Chúng tôi luôn sẵn sàng hỗ trợ bạn trong suốt hành trình du lịch!
                </Text>
              </View>
            </ScrollView>

            <TouchableOpacity 
              style={styles.infoModalButton}
              onPress={() => setShowHelpModal(false)}
            >
              <Text style={styles.infoModalButtonText}>Đóng</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Contact Modal */}
      <Modal
        visible={showContactModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowContactModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.infoModalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Liên hệ với chúng tôi</Text>
              <TouchableOpacity onPress={() => setShowContactModal(false)}>
                <Text style={styles.modalCloseText}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.infoModalContent} showsVerticalScrollIndicator={false}>
              <View style={styles.infoSection}>
                <View style={styles.infoIconContainer}>
                  <Text style={styles.infoIcon}>🏢</Text>
                </View>
                <Text style={styles.infoTitle}>Công ty TNHH Du lịch Travel Vietnam</Text>
              </View>

              <View style={styles.contactItem}>
                <Text style={styles.contactLabel}>📍 Địa chỉ</Text>
                <Text style={styles.contactValue}>123 Đường Nguyễn Huệ, Quận 1</Text>
                <Text style={styles.contactValue}>TP. Hồ Chí Minh, Việt Nam</Text>
              </View>

              <View style={styles.contactItem}>
                <Text style={styles.contactLabel}>📞 Hotline</Text>
                <Text style={styles.contactValue}>• Tổng đài: 1900-xxxx</Text>
                <Text style={styles.contactValue}>• Zalo/Viber: 0909-xxx-xxx</Text>
              </View>

              <View style={styles.contactItem}>
                <Text style={styles.contactLabel}>📧 Email</Text>
                <Text style={styles.contactValue}>• Tư vấn: support@travel.vn</Text>
                <Text style={styles.contactValue}>• Hợp tác: partner@travel.vn</Text>
              </View>

              <View style={styles.contactItem}>
                <Text style={styles.contactLabel}>🕐 Giờ làm việc</Text>
                <Text style={styles.contactValue}>• Thứ 2 - Thứ 6: 8:00 - 18:00</Text>
                <Text style={styles.contactValue}>• Thứ 7: 8:00 - 12:00</Text>
                <Text style={styles.contactValue}>• Chủ nhật: Nghỉ</Text>
              </View>

              <View style={styles.contactItem}>
                <Text style={styles.contactLabel}>🌐 Mạng xã hội</Text>
                <Text style={styles.contactValue}>• Website: www.travel.vn</Text>
                <Text style={styles.contactValue}>• Facebook: fb.com/travelvietnam</Text>
              </View>
            </ScrollView>

            <TouchableOpacity 
              style={styles.infoModalButton}
              onPress={() => setShowContactModal(false)}
            >
              <Text style={styles.infoModalButtonText}>Đóng</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* About Modal */}
      <Modal
        visible={showAboutModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowAboutModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.infoModalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Về Travel Vietnam</Text>
              <TouchableOpacity onPress={() => setShowAboutModal(false)}>
                <Text style={styles.modalCloseText}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.infoModalContent} showsVerticalScrollIndicator={false}>
              <View style={styles.aboutHeader}>
                <View style={styles.aboutLogoContainer}>
                  <Text style={styles.aboutLogo}>✈️</Text>
                </View>
                <Text style={styles.aboutSlogan}>Đồng hành cùng hành trình khám phá của bạn!</Text>
              </View>

              <View style={styles.aboutSection}>
                <Text style={styles.aboutDescription}>
                  Với hơn 10 năm kinh nghiệm trong lĩnh vực du lịch, chúng tôi tự hào là đơn vị tiên phong trong việc mang đến những trải nghiệm du lịch chất lượng, an toàn và đáng nhớ cho hàng triệu du khách.
                </Text>
              </View>

              <View style={styles.aboutSection}>
                <Text style={styles.aboutSectionTitle}>✨ Giá trị cốt lõi</Text>
                <View style={styles.valueItem}>
                  <Text style={styles.valueBullet}>•</Text>
                  <Text style={styles.valueText}>Chất lượng dịch vụ hàng đầu</Text>
                </View>
                <View style={styles.valueItem}>
                  <Text style={styles.valueBullet}>•</Text>
                  <Text style={styles.valueText}>Giá cả minh bạch, cạnh tranh</Text>
                </View>
                <View style={styles.valueItem}>
                  <Text style={styles.valueBullet}>•</Text>
                  <Text style={styles.valueText}>Đội ngũ hướng dẫn viên chuyên nghiệp</Text>
                </View>
                <View style={styles.valueItem}>
                  <Text style={styles.valueBullet}>•</Text>
                  <Text style={styles.valueText}>Hỗ trợ khách hàng 24/7</Text>
                </View>
              </View>

              <View style={styles.aboutSection}>
                <Text style={styles.aboutSectionTitle}>🏆 Thành tựu</Text>
                <View style={styles.achievementGrid}>
                  <View style={styles.achievementItem}>
                    <Text style={styles.achievementNumber}>Top 10</Text>
                    <Text style={styles.achievementLabel}>Công ty du lịch uy tín VN</Text>
                  </View>
                  <View style={styles.achievementItem}>
                    <Text style={styles.achievementNumber}>500K+</Text>
                    <Text style={styles.achievementLabel}>Khách hàng tin tưởng</Text>
                  </View>
                  <View style={styles.achievementItem}>
                    <Text style={styles.achievementNumber}>4.8/5⭐</Text>
                    <Text style={styles.achievementLabel}>Đánh giá từ khách hàng</Text>
                  </View>
                  <View style={styles.achievementItem}>
                    <Text style={styles.achievementNumber}>100+</Text>
                    <Text style={styles.achievementLabel}>Tour trong & ngoài nước</Text>
                  </View>
                </View>
              </View>

              <View style={styles.versionContainer}>
                <Text style={styles.versionText}>Phiên bản 1.0.0</Text>
              </View>

              <View style={styles.thankYouContainer}>
                <Text style={styles.thankYouText}>
                  💙 Cảm ơn bạn đã tin tưởng và đồng hành cùng chúng tôi!
                </Text>
              </View>
            </ScrollView>

            <TouchableOpacity 
              style={styles.infoModalButton}
              onPress={() => setShowAboutModal(false)}
            >
              <Text style={styles.infoModalButtonText}>Đóng</Text>
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
  header: {
    backgroundColor: '#FFFFFF',
    paddingTop: 60,
    paddingBottom: 30,
    paddingHorizontal: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  avatarContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#E3F2FD',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  avatarText: {
    fontSize: 40,
    fontWeight: 'bold',
    color: '#2196F3',
  },
  userName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1A1A1A',
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 16,
    color: '#666',
    marginBottom: 12,
  },
  verifiedBadge: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
  },
  verifiedText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  unverifiedBadge: {
    backgroundColor: '#FF9800',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
  },
  unverifiedText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  content: {
    flex: 1,
    marginTop: 20,
  },
  adminSection: {
    paddingHorizontal: 24,
    marginBottom: 20,
  },
  adminButton: {
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
  },
  adminButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
  },
  adminButtonIcon: {
    fontSize: 32,
    marginRight: 16,
  },
  adminButtonTextContainer: {
    flex: 1,
  },
  adminButtonTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  adminButtonSubtitle: {
    fontSize: 13,
    color: '#ccc',
  },
  adminButtonArrow: {
    fontSize: 24,
    color: '#fff',
    fontWeight: 'bold',
  },
  menuSection: {
    marginBottom: 24,
    paddingHorizontal: 24,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#999',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  menuIcon: {
    fontSize: 24,
    marginRight: 16,
  },
  menuText: {
    flex: 1,
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  menuArrow: {
    fontSize: 24,
    color: '#ccc',
  },
  logoutButton: {
    marginHorizontal: 24,
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#FF3B30',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 16,
  },
  logoutButtonDisabled: {
    opacity: 0.5,
  },
  logoutText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FF3B30',
  },
  loginPromptContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  loginPromptIcon: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#E3F2FD',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  loginPromptIconText: {
    fontSize: 60,
  },
  loginPromptTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 12,
  },
  loginPromptText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  loginPromptButton: {
    backgroundColor: '#2196F3',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 12,
    shadowColor: '#2196F3',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  loginPromptButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  // Edit Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1A1A1A',
  },
  modalCloseText: {
    fontSize: 28,
    color: '#666',
    fontWeight: '300',
  },
  modalContent: {
    padding: 20,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
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
  inputDisabled: {
    backgroundColor: '#F8F8F8',
    color: '#999',
  },
  inputNote: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
    fontStyle: 'italic',
  },
  modalFooter: {
    flexDirection: 'row',
    padding: 20,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  modalButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    backgroundColor: '#F5F5F5',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  saveButton: {
    backgroundColor: '#2196F3',
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  // Info Modal Styles
  infoModalContainer: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '85%',
  },
  infoModalContent: {
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  infoSection: {
    alignItems: 'center',
    marginBottom: 24,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  infoIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#E3F2FD',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  infoIcon: {
    fontSize: 32,
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1A1A1A',
    marginBottom: 8,
    textAlign: 'center',
  },
  infoText: {
    fontSize: 16,
    color: '#2196F3',
    fontWeight: '600',
    marginBottom: 4,
    textAlign: 'center',
  },
  infoSubText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  helpNote: {
    backgroundColor: '#FFF3E0',
    padding: 16,
    borderRadius: 12,
    marginTop: 8,
    marginBottom: 16,
  },
  helpNoteText: {
    fontSize: 14,
    color: '#E65100',
    textAlign: 'center',
    lineHeight: 20,
  },
  infoModalButton: {
    margin: 20,
    backgroundColor: '#2196F3',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  infoModalButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  // Contact Modal Styles
  contactItem: {
    marginBottom: 24,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  contactLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1A1A1A',
    marginBottom: 8,
  },
  contactValue: {
    fontSize: 15,
    color: '#666',
    marginBottom: 4,
    lineHeight: 22,
  },
  // About Modal Styles
  aboutHeader: {
    alignItems: 'center',
    marginBottom: 24,
    paddingBottom: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  aboutLogoContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#E3F2FD',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  aboutLogo: {
    fontSize: 40,
  },
  aboutSlogan: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2196F3',
    textAlign: 'center',
  },
  aboutSection: {
    marginBottom: 24,
  },
  aboutDescription: {
    fontSize: 15,
    color: '#666',
    lineHeight: 24,
    textAlign: 'justify',
  },
  aboutSectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1A1A1A',
    marginBottom: 12,
  },
  valueItem: {
    flexDirection: 'row',
    marginBottom: 8,
    paddingLeft: 8,
  },
  valueBullet: {
    fontSize: 16,
    color: '#2196F3',
    marginRight: 8,
    fontWeight: 'bold',
  },
  valueText: {
    fontSize: 15,
    color: '#666',
    flex: 1,
    lineHeight: 22,
  },
  achievementGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  achievementItem: {
    width: '48%',
    backgroundColor: '#F5F5F5',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 12,
  },
  achievementNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2196F3',
    marginBottom: 8,
  },
  achievementLabel: {
    fontSize: 13,
    color: '#666',
    textAlign: 'center',
    lineHeight: 18,
  },
  versionContainer: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  versionText: {
    fontSize: 13,
    color: '#999',
  },
  thankYouContainer: {
    backgroundColor: '#E3F2FD',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  thankYouText: {
    fontSize: 15,
    color: '#1565C0',
    textAlign: 'center',
    lineHeight: 22,
  },
});
