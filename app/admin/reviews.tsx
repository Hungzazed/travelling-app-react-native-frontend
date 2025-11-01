import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Platform,
  Dimensions,
  Modal,
  Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { getReviews, deleteReview, Review } from '../../services/reviewService';
import { getCurrentUser } from '../../services/authService';

const { width } = Dimensions.get('window');
const ITEMS_PER_PAGE = 10;

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
    ? (['#4CAF50', '#4CAF50'] as const)
    : type === 'error'
    ? (['#FF3B30', '#FF3B30'] as const)
    : (['#2196F3', '#2196F3'] as const);

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
          <View style={styles.modalIconContainer}>
            <View style={styles.modalIconCircle}>
              <Text style={styles.modalIcon}>⚠️</Text>
            </View>
          </View>
          
          <View style={styles.modalBody}>
            <Text style={styles.modalTitle}>{title}</Text>
            <Text style={styles.modalMessage}>{message}</Text>
          </View>

          <View style={styles.modalFooter}>
            <TouchableOpacity style={styles.modalBtnCancel} onPress={onCancel}>
              <Text style={styles.modalBtnCancelText}>✕ Hủy bỏ</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.modalBtnConfirm} onPress={onConfirm}>
              <Text style={styles.modalBtnConfirmText}>🗑️ Xác nhận xóa</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
};

export default function AdminReviewsScreen() {
  const router = useRouter();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [targetTypeFilter, setTargetTypeFilter] = useState<'all' | 'tour' | 'hotel'>('all');
  const [ratingFilter, setRatingFilter] = useState<number | 'all'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalResults, setTotalResults] = useState(0);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [reviewToDelete, setReviewToDelete] = useState<Review | null>(null);
  const [toast, setToast] = useState({ visible: false, message: '', type: 'info' });

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToast({ visible: true, message, type });
  };

  useEffect(() => {
    checkUserRole();
  }, []);

  useEffect(() => {
    loadReviews();
  }, [currentPage, targetTypeFilter, ratingFilter]);

  const checkUserRole = async () => {
    try {
      const user = await getCurrentUser();
      if (!user || user.role !== 'admin') {
        showToast('Bạn không có quyền truy cập', 'error');
        setTimeout(() => router.back(), 2000);
        return;
      }
    } catch (error) {
      showToast('Không thể xác thực người dùng', 'error');
      setTimeout(() => router.back(), 2000);
    }
  };

  const loadReviews = async () => {
    try {
      setIsLoading(true);
      const params: any = {
        page: currentPage,
        limit: ITEMS_PER_PAGE,
        sortBy: 'createdAt:desc',
      };

      if (targetTypeFilter !== 'all') {
        params.targetType = targetTypeFilter;
      }

      if (ratingFilter !== 'all') {
        params.rating = ratingFilter;
      }

      const response = await getReviews(params);
      setReviews(response.results);
      setTotalPages(response.totalPages);
      setTotalResults(response.totalResults);
    } catch (error: any) {
      console.error('Error:', error);
      showToast(error.message || 'Không thể tải dữ liệu', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    setCurrentPage(1);
    await loadReviews();
    setRefreshing(false);
  }, [targetTypeFilter, ratingFilter]);

  const handleDeleteReview = (review: Review) => {
    setReviewToDelete(review);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (!reviewToDelete) return;
    
    setShowDeleteModal(false);
    try {
      await deleteReview(reviewToDelete.id);
      showToast('Đã xóa đánh giá thành công', 'success');
      loadReviews();
    } catch (error: any) {
      showToast(error.message || 'Không thể xóa đánh giá', 'error');
    }
    setReviewToDelete(null);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (days === 0) return 'Hôm nay';
    if (days === 1) return 'Hôm qua';
    if (days < 7) return `${days} ngày trước`;
    if (days < 30) return `${Math.floor(days / 7)} tuần trước`;
    
    return date.toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const getUserName = (userId: Review['userId']) => {
    if (typeof userId === 'object') return userId.name;
    return 'Unknown';
  };

  const getUserEmail = (userId: Review['userId']) => {
    if (typeof userId === 'object') return userId.email;
    return '';
  };

  const getTypeColor = (type: string) => {
    return type === 'tour' ? ['#667eea', '#764ba2'] as const : ['#f093fb', '#f5576c'] as const;
  };

  const getTypeIcon = (type: string) => {
    return type === 'tour' ? '🗺️' : '🏨';
  };

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
      
      <Toast 
        visible={toast.visible}
        message={toast.message}
        type={toast.type}
        onHide={() => setToast({ ...toast, visible: false })}
      />

      <ConfirmModal
        visible={showDeleteModal}
        title="Xóa đánh giá"
        message={`Bạn có chắc muốn xóa đánh giá của "${reviewToDelete ? getUserName(reviewToDelete.userId) : 'người dùng này'}"?`}
        onConfirm={confirmDelete}
        onCancel={() => {
          setShowDeleteModal(false);
          setReviewToDelete(null);
        }}
      />
      
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Text style={styles.backIcon}>←</Text>
          </TouchableOpacity>
          <View style={styles.headerTitleBox}>
            <Text style={styles.headerSubtitle}>Quản lý</Text>
            <Text style={styles.headerTitle}>Đánh giá</Text>
          </View>
          <View style={styles.countBadge}>
            <Text style={styles.countBadgeText}>{totalResults}</Text>
          </View>
        </View>

        {/* Filters */}
        <View style={styles.filtersContainer}>
          <View style={styles.filterGroup}>
            <Text style={styles.filterLabel}>Loại</Text>
            <View style={styles.filterChips}>
              <TouchableOpacity
                style={[styles.chip, targetTypeFilter === 'all' && styles.chipActive]}
                onPress={() => { setTargetTypeFilter('all'); setCurrentPage(1); }}
              >
                <Text style={[styles.chipText, targetTypeFilter === 'all' && styles.chipTextActive]}>
                  Tất cả
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.chip, targetTypeFilter === 'tour' && styles.chipActive]}
                onPress={() => { setTargetTypeFilter('tour'); setCurrentPage(1); }}
              >
                <Text style={[styles.chipText, targetTypeFilter === 'tour' && styles.chipTextActive]}>
                  🗺️ Tour
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.chip, targetTypeFilter === 'hotel' && styles.chipActive]}
                onPress={() => { setTargetTypeFilter('hotel'); setCurrentPage(1); }}
              >
                <Text style={[styles.chipText, targetTypeFilter === 'hotel' && styles.chipTextActive]}>
                  🏨 Hotel
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.filterGroup}>
            <Text style={styles.filterLabel}>Đánh giá</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.filterChips}>
                <TouchableOpacity
                  style={[styles.chip, ratingFilter === 'all' && styles.chipActive]}
                  onPress={() => { setRatingFilter('all'); setCurrentPage(1); }}
                >
                  <Text style={[styles.chipText, ratingFilter === 'all' && styles.chipTextActive]}>
                    Tất cả
                  </Text>
                </TouchableOpacity>
                {[5, 4, 3, 2, 1].map((rating) => (
                  <TouchableOpacity
                    key={rating}
                    style={[styles.chip, ratingFilter === rating && styles.chipActive]}
                    onPress={() => { setRatingFilter(rating); setCurrentPage(1); }}
                  >
                    <Text style={[styles.chipText, ratingFilter === rating && styles.chipTextActive]}>
                      {rating} ⭐
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          </View>
        </View>
      </View>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#2196F3" />}
      >
        {reviews.length > 0 ? (
          <>
            {reviews.map((review) => (
              <View key={review.id} style={styles.reviewCard}>
                
                <View style={styles.cardHeader}>
                  <View style={styles.userSection}>
                    <View style={styles.avatarGradient}>
                      <View style={styles.avatar}>
                        <Text style={styles.avatarText}>
                          {getUserName(review.userId).charAt(0).toUpperCase()}
                        </Text>
                      </View>
                    </View>
                    <View style={styles.userDetails}>
                      <Text style={styles.userName}>{getUserName(review.userId)}</Text>
                      <Text style={styles.userEmail}>{getUserEmail(review.userId)}</Text>
                    </View>
                  </View>
                  
                  <TouchableOpacity
                    style={styles.deleteBtn}
                    onPress={() => handleDeleteReview(review)}
                  >
                    <View style={styles.deleteBtnGradient}>
                      <Text style={styles.deleteIcon}>🗑️</Text>
                    </View>
                  </TouchableOpacity>
                </View>

                <View style={styles.ratingSection}>
                  <View style={styles.starsBox}>
                    {[...Array(5)].map((_, i) => (
                      <Text key={i} style={[styles.star, { opacity: i < review.rating ? 1 : 0.2 }]}>
                        
                      </Text>
                    ))}
                  </View>
                  <Text style={styles.ratingText}>{review.rating}.0</Text>
                  <View style={styles.typeBadge}>
                    <View style={styles.typeBadgeGradient}>
                      <Text style={styles.typeBadgeIcon}>{getTypeIcon(review.targetType)}</Text>
                      <Text style={styles.typeBadgeText}>
                        {review.targetType === 'tour' ? 'Tour' : 'Hotel'}
                      </Text>
                    </View>
                  </View>
                </View>

                {review.comment && (
                  <View style={styles.commentBox}>
                    <Text style={styles.commentIcon}></Text>
                    <Text style={styles.commentText}>{review.comment}</Text>
                  </View>
                )}

                <View style={styles.footer}>
                  <View style={styles.timeBox}>
                    <Text style={styles.timeIcon}></Text>
                    <Text style={styles.timeText}>{formatDate(review.createdAt)}</Text>
                  </View>
                </View>
              </View>
            ))}

            {totalPages > 1 && (
              <View style={styles.pagination}>
                <TouchableOpacity
                  style={[styles.pageBtn, currentPage === 1 && styles.pageBtnDisabled]}
                  onPress={() => currentPage > 1 && setCurrentPage(currentPage - 1)}
                  disabled={currentPage === 1}
                >
                  <Text style={[styles.pageBtnText, currentPage === 1 && styles.pageBtnTextDisabled]}>
                     Trước
                  </Text>
                </TouchableOpacity>
                
                <View style={styles.pageInfo}>
                  <Text style={styles.pageNumber}>{currentPage}</Text>
                  <Text style={styles.pageTotal}>/ {totalPages}</Text>
                </View>

                <TouchableOpacity
                  style={[styles.pageBtn, currentPage === totalPages && styles.pageBtnDisabled]}
                  onPress={() => currentPage < totalPages && setCurrentPage(currentPage + 1)}
                  disabled={currentPage === totalPages}
                >
                  <Text style={[styles.pageBtnText, currentPage === totalPages && styles.pageBtnTextDisabled]}>
                    Sau 
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </>
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}></Text>
            <Text style={styles.emptyTitle}>Không có đánh giá</Text>
            <Text style={styles.emptySubtitle}>Chưa có đánh giá nào phù hợp với bộ lọc</Text>
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
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
    marginTop: 16,
    fontSize: 16,
    color: '#2196F3',
    fontWeight: '600',
  },

  // Header
  header: {
    backgroundColor: '#FFFFFF',
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: 24,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    shadowColor: '#2196F3',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F8F9FA',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  backIcon: {
    fontSize: 24,
    color: '#2196F3',
    fontWeight: '600',
  },
  headerTitleBox: {
    flex: 1,
    marginLeft: 16,
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#999',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#2196F3',
    marginTop: 2,
  },
  countBadge: {
    backgroundColor: '#2196F3',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
    minWidth: 56,
    alignItems: 'center',
  },
  countBadgeText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
  },

  // Filters
  filtersContainer: {
    gap: 16,
  },
  filterGroup: {
    gap: 8,
  },
  filterLabel: {
    fontSize: 13,
    color: '#666',
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  filterChips: {
    flexDirection: 'row',
    gap: 8,
  },
  chip: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  chipActive: {
    backgroundColor: '#2196F3',
    borderColor: '#2196F3',
  },
  chipText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '600',
  },
  chipTextActive: {
    color: '#FFFFFF',
  },

  // Content
  content: {
    flex: 1,
    backgroundColor: '#F0F2F5',
  },

  // Review Card
  reviewCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 20,
    marginTop: 20,
    borderRadius: 24,
    padding: 20,
    shadowColor: '#2196F3',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 5,
    position: 'relative',
    overflow: 'hidden',
    borderLeftWidth: 4,
    borderLeftColor: '#2196F3',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  cardAccent: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 0,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  userSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatarGradient: {
    marginRight: 12,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#2196F3',
    backgroundColor: '#2196F3',
  },
  avatarText: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  userDetails: {
    flex: 1,
  },
  userName: {
    fontSize: 17,
    fontWeight: '800',
    color: '#1e293b',
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 13,
    color: '#64748b',
    fontWeight: '500',
  },
  deleteBtn: {
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#FF3B30',
  },
  deleteBtnGradient: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FF3B30',
  },
  deleteIcon: {
    fontSize: 20,
    color: '#FFFFFF',
  },

  // Rating
  ratingSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 12,
  },
  starsBox: {
    flexDirection: 'row',
    gap: 2,
  },
  star: {
    fontSize: 18,
  },
  ratingText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1e293b',
  },
  typeBadge: {
    marginLeft: 'auto',
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#2196F3',
  },
  typeBadgeGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    gap: 6,
    backgroundColor: '#2196F3',
  },
  typeBadgeIcon: {
    fontSize: 16,
  },
  typeBadgeText: {
    fontSize: 13,
    color: '#FFFFFF',
    fontWeight: '700',
  },

  // Comment
  commentBox: {
    flexDirection: 'row',
    backgroundColor: '#f8f9fa',
    padding: 16,
    borderRadius: 16,
    marginBottom: 16,
    gap: 12,
  },
  commentIcon: {
    fontSize: 20,
  },
  commentText: {
    flex: 1,
    fontSize: 15,
    color: '#1e293b',
    lineHeight: 22,
    fontWeight: '500',
  },

  // Footer
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  timeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  timeIcon: {
    fontSize: 14,
  },
  timeText: {
    fontSize: 13,
    color: '#64748b',
    fontWeight: '600',
  },

  // Pagination
  pagination: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: 20,
    marginTop: 24,
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  pageBtn: {
    backgroundColor: '#E3F2FD',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 14,
  },
  pageBtnDisabled: {
    backgroundColor: '#F8F9FA',
  },
  pageBtnText: {
    fontSize: 14,
    color: '#2196F3',
    fontWeight: '700',
  },
  pageBtnTextDisabled: {
    color: '#999',
  },
  pageInfo: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
  },
  pageNumber: {
    fontSize: 24,
    fontWeight: '800',
    color: '#1e293b',
  },
  pageTotal: {
    fontSize: 16,
    color: '#64748b',
    fontWeight: '600',
  },

  // Empty State
  emptyState: {
    alignItems: 'center',
    paddingVertical: 80,
  },
  emptyIcon: {
    fontSize: 80,
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1e293b',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 15,
    color: '#64748b',
    fontWeight: '500',
  },

  // Toast
  toastContainer: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 50 : 30,
    left: 20,
    right: 20,
    zIndex: 9999,
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
    elevation: 8,
  },
  toastIcon: {
    fontSize: 24,
    marginRight: 12,
    color: '#FFFFFF',
  },
  toastText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    width: '100%',
    maxWidth: 380,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 15,
  },
  modalIconContainer: {
    alignItems: 'center',
    paddingTop: 32,
    paddingBottom: 16,
  },
  modalIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FFF3E0',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#FF9500',
  },
  modalIcon: {
    fontSize: 42,
  },
  modalBody: {
    paddingHorizontal: 28,
    paddingBottom: 24,
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1A1A1A',
    marginBottom: 12,
    textAlign: 'center',
  },
  modalMessage: {
    fontSize: 15,
    color: '#666',
    textAlign: 'center',
    lineHeight: 22,
    fontWeight: '500',
  },
  modalFooter: {
    flexDirection: 'row',
    padding: 20,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  modalBtnCancel: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 16,
    backgroundColor: '#F8F9FA',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  modalBtnCancelText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#666',
  },
  modalBtnConfirm: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    backgroundColor: '#FF3B30',
    shadowColor: '#FF3B30',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  modalBtnConfirmText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
