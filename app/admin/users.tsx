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
  Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import {
  getUsers,
  updateUser,
  deleteUser,
  User,
  UpdateUserData,
} from '../../services/userService';
import { getCurrentUser } from '../../services/authService';

const ITEMS_PER_PAGE = 10;

// Toast Component
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
    ? (['#10b981', '#059669'] as const)
    : type === 'error'
    ? (['#ef4444', '#dc2626'] as const)
    : (['#3b82f6', '#2563eb'] as const);

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

// Confirm Modal Component
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
      <View style={styles.confirmModalOverlay}>
        <Animated.View style={[styles.confirmModalContent, { transform: [{ scale: scaleValue }] }]}>
          <LinearGradient
            colors={['#FF3B30', '#dc2626']}
            style={styles.confirmModalHeader}
          >
            <Text style={styles.confirmModalIcon}>⚠️</Text>
            <Text style={styles.confirmModalTitle}>{title}</Text>
          </LinearGradient>
          
          <View style={styles.confirmModalBody}>
            <Text style={styles.confirmModalMessage}>{message}</Text>
          </View>

          <View style={styles.confirmModalFooter}>
            <TouchableOpacity style={styles.confirmModalBtnCancel} onPress={onCancel}>
              <Text style={styles.confirmModalBtnCancelText}>Hủy</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={onConfirm}>
              <LinearGradient
                colors={['#ef4444', '#dc2626']}
                style={styles.confirmModalBtnConfirm}
              >
                <Text style={styles.confirmModalBtnConfirmText}>Xóa</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
};

export default function AdminUsersScreen() {
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRole, setSelectedRole] = useState<'all' | 'user' | 'admin'>('all');
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  
  // Toast state
  const [toast, setToast] = useState({ visible: false, message: '', type: 'info' as 'success' | 'error' | 'info' });
  
  // Confirm modal state
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [userToDelete, setUserToDelete] = useState<{ id: string; name: string } | null>(null);
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalResults, setTotalResults] = useState(0);
  
  // Form data - chỉ có role
  const [selectedUserRole, setSelectedUserRole] = useState<'user' | 'admin'>('user');

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToast({ visible: true, message, type });
  };

  useEffect(() => {
    checkUserRole();
  }, []);

  useEffect(() => {
    loadUsers();
  }, [currentPage, selectedRole]);

  const checkUserRole = async () => {
    try {
      const user = await getCurrentUser();
      if (!user || user.role !== 'admin') {
        showToast('Bạn không có quyền truy cập trang này', 'error');
        setTimeout(() => router.back(), 2000);
        return;
      }
    } catch (error) {
      showToast('Không thể xác thực người dùng', 'error');
      setTimeout(() => router.back(), 2000);
    }
  };

  const loadUsers = async () => {
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

      if (selectedRole !== 'all') {
        params.role = selectedRole;
      }

      const response = await getUsers(params);
      setUsers(response.results);
      setFilteredUsers(response.results);
      setTotalPages(response.totalPages);
      setTotalResults(response.totalResults);
    } catch (error: any) {
      console.error('Error loading users:', error);
      showToast(error.message || 'Không thể tải danh sách người dùng', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    setCurrentPage(1);
    await loadUsers();
    setRefreshing(false);
  }, [selectedRole, searchQuery]);

  const handleSearch = () => {
    setCurrentPage(1);
    loadUsers();
  };

  const handleDeleteUser = async (userId: string, userName: string) => {
    setUserToDelete({ id: userId, name: userName });
    setShowConfirmModal(true);
  };

  const confirmDelete = async () => {
    if (!userToDelete) return;
    
    setShowConfirmModal(false);
    try {
      await deleteUser(userToDelete.id);
      showToast('Đã xóa người dùng thành công', 'success');
      loadUsers();
    } catch (error: any) {
      showToast(error.message || 'Không thể xóa người dùng', 'error');
    } finally {
      setUserToDelete(null);
    }
  };

  const handleEditUser = (user: User) => {
    setSelectedUser(user);
    setSelectedUserRole(user.role as 'user' | 'admin');
    setShowEditModal(true);
  };

  const handleUpdateUserRole = async () => {
    if (!selectedUser) return;

    try {
      const updateData: UpdateUserData = {
        role: selectedUserRole,
      };

      await updateUser(selectedUser.id, updateData);
      showToast('Cập nhật vai trò thành công', 'success');
      setShowEditModal(false);
      setSelectedUser(null);
      loadUsers();
    } catch (error: any) {
      showToast(error.message || 'Không thể cập nhật vai trò', 'error');
    }
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

      <Toast 
        visible={toast.visible}
        message={toast.message}
        type={toast.type}
        onHide={() => setToast({ ...toast, visible: false })}
      />

      <ConfirmModal
        visible={showConfirmModal}
        title="Xóa người dùng"
        message={`Bạn có chắc chắn muốn xóa người dùng "${userToDelete?.name}"?`}
        onConfirm={confirmDelete}
        onCancel={() => {
          setShowConfirmModal(false);
          setUserToDelete(null);
        }}
      />

      {/* Header - Đồng bộ với dashboard */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Quản lý người dùng</Text>
        </View>
        <View style={styles.headerBadge}>
          <Text style={styles.headerBadgeText}>{totalResults}</Text>
        </View>
      </View>

      {/* Search */}
      <View style={styles.searchContainer}>
        <View style={styles.searchRow}>
          <View style={styles.searchBox}>
            <Text style={styles.searchIcon}>🔍</Text>
            <TextInput
              style={styles.searchInput}
              placeholder="Tìm kiếm theo tên hoặc email..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              onSubmitEditing={handleSearch}
              returnKeyType="search"
              placeholderTextColor="#999"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => {
                setSearchQuery('');
                setCurrentPage(1);
                loadUsers();
              }}>
                <Text style={styles.clearIcon}>✕</Text>
              </TouchableOpacity>
            )}
          </View>
          <TouchableOpacity 
            style={styles.searchButton}
            onPress={handleSearch}
          >
            <Text style={styles.searchButtonText}>Tìm</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.filterTabs}>
          <TouchableOpacity
            style={[styles.filterTab, selectedRole === 'all' && styles.filterTabActive]}
            onPress={() => {
              setSelectedRole('all');
              setCurrentPage(1);
            }}
          >
            <Text style={[styles.filterText, selectedRole === 'all' && styles.filterTextActive]}>
              Tất cả ({totalResults})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterTab, selectedRole === 'user' && styles.filterTabActive]}
            onPress={() => {
              setSelectedRole('user');
              setCurrentPage(1);
            }}
          >
            <Text style={[styles.filterText, selectedRole === 'user' && styles.filterTextActive]}>
              👤 User
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterTab, selectedRole === 'admin' && styles.filterTabActive]}
            onPress={() => {
              setSelectedRole('admin');
              setCurrentPage(1);
            }}
          >
            <Text style={[styles.filterText, selectedRole === 'admin' && styles.filterTextActive]}>
              👑 Admin
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#2196F3" />
        }
      >
        {filteredUsers.length > 0 ? (
          <>
            {filteredUsers.map((user) => (
              <View key={user.id} style={styles.userCard}>
                <View style={styles.userHeader}>
                  <View style={[
                    styles.userAvatar,
                    { backgroundColor: user.role === 'admin' ? '#FF3B30' : '#2196F3' }
                  ]}>
                    <Text style={styles.userAvatarText}>{user.name.charAt(0).toUpperCase()}</Text>
                  </View>
                  <View style={styles.userInfo}>
                    <Text style={styles.userName}>{user.name}</Text>
                    <View style={styles.userDetailsRow}>
                      <Text style={styles.userEmail}>📧 {user.email}</Text>
                    </View>
                    <View style={styles.userMeta}>
                      <Text style={styles.userMetaText}>📅 {formatDate(user.createdAt)}</Text>
                      {user.isEmailVerified && (
                        <Text style={styles.verifiedBadge}>✓ Đã xác thực</Text>
                      )}
                    </View>
                  </View>
                  <View
                    style={[
                      styles.roleBadge,
                      { backgroundColor: user.role === 'admin' ? '#FFF3CD' : '#E3F2FD' },
                    ]}
                  >
                    <Text style={[
                      styles.roleBadgeText,
                      { color: user.role === 'admin' ? '#856404' : '#2196F3' }
                    ]}>
                      {user.role === 'admin' ? 'ADMIN' : 'USER'}
                    </Text>
                  </View>
                </View>

                <View style={styles.userActions}>
                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => handleEditUser(user)}
                  >
                    <Text style={styles.actionButtonText}>✏️ Phân quyền</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.deleteButton}
                    onPress={() => handleDeleteUser(user.id, user.name)}
                  >
                    <Text style={styles.deleteButtonText}>🗑️ Xóa</Text>
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
                  {currentPage}/{totalPages}
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
            <Text style={styles.emptyIcon}>👥</Text>
            <Text style={styles.emptyText}>Không tìm thấy người dùng</Text>
          </View>
        )}

        <View style={{ height: 20 }} />
      </ScrollView>

      {/* Edit Modal */}
      <Modal visible={showEditModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Phân quyền người dùng</Text>
            {selectedUser && (
              <ScrollView>
                <View style={styles.modalUserInfo}>
                  <View style={[
                    styles.modalAvatar,
                    { backgroundColor: selectedUser.role === 'admin' ? '#FF3B30' : '#2196F3' }
                  ]}>
                    <Text style={styles.modalAvatarText}>
                      {selectedUser.name.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                  <View style={styles.modalUserDetails}>
                    <Text style={styles.modalUserName}>{selectedUser.name}</Text>
                    <Text style={styles.modalUserEmail}>{selectedUser.email}</Text>
                  </View>
                </View>
                
                <Text style={styles.modalSectionTitle}>Chọn vai trò:</Text>
                <View style={styles.roleOptions}>
                  <TouchableOpacity
                    style={[
                      styles.roleOption,
                      selectedUserRole === 'user' && styles.roleOptionActive,
                    ]}
                    onPress={() => setSelectedUserRole('user')}
                  >
                    <Text style={styles.roleOptionIcon}>👤</Text>
                    <Text
                      style={[
                        styles.roleOptionText,
                        selectedUserRole === 'user' && styles.roleOptionTextActive,
                      ]}
                    >
                      User
                    </Text>
                    <Text style={styles.roleOptionDesc}>Người dùng thông thường</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.roleOption,
                      selectedUserRole === 'admin' && styles.roleOptionActive,
                    ]}
                    onPress={() => setSelectedUserRole('admin')}
                  >
                    <Text style={styles.roleOptionIcon}>👑</Text>
                    <Text
                      style={[
                        styles.roleOptionText,
                        selectedUserRole === 'admin' && styles.roleOptionTextActive,
                      ]}
                    >
                      Admin
                    </Text>
                    <Text style={styles.roleOptionDesc}>Quản trị viên</Text>
                  </TouchableOpacity>
                </View>
                
                <View style={styles.modalActions}>
                  <TouchableOpacity
                    style={styles.modalCancelButton}
                    onPress={() => {
                      setShowEditModal(false);
                      setSelectedUser(null);
                    }}
                  >
                    <Text style={styles.modalCancelButtonText}>Hủy</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.modalConfirmButton}
                    onPress={handleUpdateUserRole}
                  >
                    <Text style={styles.modalConfirmButtonText}>Cập nhật</Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
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
  
  // Header - Đồng bộ với dashboard
  header: {
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
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F8F9FA',
    justifyContent: 'center',
    alignItems: 'center',
  },
  backButtonText: {
    fontSize: 24,
    color: '#1A1A1A',
    fontWeight: '600',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 12,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#2196F3',
  },
  headerBadge: {
    backgroundColor: '#2196F3',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    minWidth: 44,
    alignItems: 'center',
  },
  headerBadgeText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  
  // Search
  searchContainer: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F2F5',
  },
  searchRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  searchBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    paddingHorizontal: 16,
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
    paddingVertical: 12,
    color: '#1A1A1A',
    fontWeight: '500',
  },
  clearIcon: {
    fontSize: 16,
    color: '#999',
    padding: 4,
  },
  searchButton: {
    backgroundColor: '#2196F3',
    borderRadius: 12,
    paddingHorizontal: 20,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 70,
  },
  searchButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  filterTabs: {
    flexDirection: 'row',
    gap: 8,
  },
  filterTab: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    backgroundColor: '#F8F9FA',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  filterTabActive: {
    backgroundColor: '#2196F3',
    borderColor: '#2196F3',
  },
  filterText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#666',
  },
  filterTextActive: {
    color: '#FFFFFF',
  },
  
  // Content
  content: {
    flex: 1,
  },
  
  // User Card
  userCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 20,
    marginTop: 12,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  userHeader: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  userAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  userAvatarText: {
    fontSize: 24,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 6,
  },
  userDetailsRow: {
    marginBottom: 6,
  },
  userEmail: {
    fontSize: 13,
    color: '#666',
    fontWeight: '500',
  },
  userMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  userMetaText: {
    fontSize: 12,
    color: '#999',
    fontWeight: '500',
  },
  verifiedBadge: {
    fontSize: 12,
    color: '#4CAF50',
    fontWeight: '600',
  },
  roleBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    height: 28,
    justifyContent: 'center',
  },
  roleBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  userActions: {
    flexDirection: 'row',
    gap: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F0F2F5',
  },
  actionButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#2196F3',
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#2196F3',
  },
  deleteButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#FF3B30',
  },
  deleteButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FF3B30',
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
  
  // Pagination
  pagination: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 20,
    marginVertical: 16,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
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
    fontWeight: '700',
  },
  pageButtonTextDisabled: {
    color: '#999',
  },
  pageInfo: {
    fontSize: 14,
    color: '#666',
    fontWeight: '600',
  },
  
  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    maxHeight: '85%',
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1A1A1A',
    marginBottom: 20,
    textAlign: 'center',
  },
  modalUserInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
  },
  modalAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  modalAvatarText: {
    fontSize: 24,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  modalUserDetails: {
    flex: 1,
  },
  modalUserName: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 4,
  },
  modalUserEmail: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  modalSectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 12,
  },
  roleOptions: {
    gap: 12,
    marginBottom: 24,
  },
  roleOption: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#E0E0E0',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
  },
  roleOptionActive: {
    borderColor: '#2196F3',
    backgroundColor: '#E3F2FD',
  },
  roleOptionIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  roleOptionText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#666',
    marginBottom: 4,
  },
  roleOptionTextActive: {
    color: '#2196F3',
  },
  roleOptionDesc: {
    fontSize: 13,
    color: '#999',
    fontWeight: '500',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  modalCancelButton: {
    flex: 1,
    backgroundColor: '#F8F9FA',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  modalCancelButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#666',
  },
  modalConfirmButton: {
    flex: 1,
    backgroundColor: '#2196F3',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalConfirmButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
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
  
  // Confirm Modal Styles
  confirmModalOverlay: { 
    flex: 1, 
    backgroundColor: 'rgba(0, 0, 0, 0.6)', 
    justifyContent: 'center', 
    alignItems: 'center', 
    padding: 20 
  },
  confirmModalContent: { 
    backgroundColor: '#fff', 
    borderRadius: 24, 
    width: '100%', 
    maxWidth: 360, 
    overflow: 'hidden' 
  },
  confirmModalHeader: { 
    padding: 24, 
    alignItems: 'center' 
  },
  confirmModalIcon: { 
    fontSize: 48, 
    marginBottom: 12 
  },
  confirmModalTitle: { 
    fontSize: 24, 
    fontWeight: '800', 
    color: '#fff' 
  },
  confirmModalBody: { 
    padding: 24 
  },
  confirmModalMessage: { 
    fontSize: 16, 
    color: '#64748b', 
    textAlign: 'center', 
    lineHeight: 24 
  },
  confirmModalFooter: { 
    flexDirection: 'row', 
    padding: 16, 
    gap: 12 
  },
  confirmModalBtnCancel: { 
    flex: 1, 
    paddingVertical: 14, 
    borderRadius: 16, 
    backgroundColor: '#f1f5f9', 
    alignItems: 'center' 
  },
  confirmModalBtnCancelText: { 
    fontSize: 16, 
    fontWeight: '700', 
    color: '#64748b' 
  },
  confirmModalBtnConfirm: { 
    flex: 1, 
    paddingVertical: 14, 
    borderRadius: 16, 
    alignItems: 'center' 
  },
  confirmModalBtnConfirmText: { 
    fontSize: 16, 
    fontWeight: '700', 
    color: '#fff' 
  },
});
