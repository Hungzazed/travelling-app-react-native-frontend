import api from './api';
import { CacheService, CacheTTL, createCacheKey } from './cacheService';

export type NotificationType = 'booking' | 'system' | 'service' | 'promotion' | 'reminder';
export type NotificationPriority = 'low' | 'normal' | 'high';
export type RelatedType = 'booking' | 'tour' | 'service' | 'hotel' | 'review';

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  relatedId?: string;
  relatedType?: RelatedType;
  isRead: boolean;
  priority: NotificationPriority;
  data?: any;
  createdAt: string;
  updatedAt: string;
}

export interface GetNotificationsParams {
  type?: NotificationType;
  isRead?: boolean;
  priority?: NotificationPriority;
  sortBy?: string;
  limit?: number;
  page?: number;
}

export interface NotificationsResponse {
  results: Notification[];
  page: number;
  limit: number;
  totalPages: number;
  totalResults: number;
}

/**
 * Get notifications với caching
 */
export const getNotifications = async (
  params?: GetNotificationsParams,
  onUpdate?: (data: NotificationsResponse) => void
): Promise<NotificationsResponse> => {
  const cacheKey = createCacheKey.notifications('current-user', params?.isRead === false);
  
  return CacheService.getWithSWR<NotificationsResponse>(
    cacheKey,
    'notifications_cache',
    async () => {
      const response = await api.get('/notifications', { params });
      return response.data;
    },
    onUpdate,
    CacheTTL.NOTIFICATIONS
  );
};

/**
 * Get notification by ID (không cache vì thường chỉ xem 1 lần)
 */
export const getNotificationById = async (notificationId: string): Promise<Notification> => {
  const response = await api.get(`/notifications/${notificationId}`);
  return response.data;
};

/**
 * Mark as read - Invalidate cache
 */
export const markAsRead = async (notificationId: string): Promise<Notification> => {
  const response = await api.patch(`/notifications/${notificationId}/read`);
  
  // Invalidate notifications cache
  await CacheService.invalidatePattern('notifications:', 'notifications_cache');
  
  return response.data;
};

/**
 * Mark all as read - Invalidate cache
 */
export const markAllAsRead = async (): Promise<void> => {
  await api.patch('/notifications/mark-all-read');
  
  // Invalidate all notifications cache
  await CacheService.invalidatePattern('notifications:', 'notifications_cache');
};

/**
 * Delete notification - Invalidate cache
 */
export const deleteNotification = async (notificationId: string): Promise<void> => {
  await api.delete(`/notifications/${notificationId}`);
  
  // Invalidate notifications cache
  await CacheService.invalidatePattern('notifications:', 'notifications_cache');
};

/**
 * Get unread count với caching
 */
export const getUnreadCount = async (
  onUpdate?: (count: number) => void
): Promise<number> => {
  const cacheKey = createCacheKey.notificationCount('current-user');
  
  const result = await CacheService.getWithSWR<{ count: number }>(
    cacheKey,
    'notifications_cache',
    async () => {
      const response = await api.get('/notifications/unread-count');
      return { count: response.data.count };
    },
    (data) => {
      if (onUpdate) {
        onUpdate(data.count);
      }
    },
    CacheTTL.NOTIFICATIONS
  );
  
  return result.count;
};

// Helper functions
export const getNotificationIcon = (type: NotificationType): string => {
  const icons: Record<NotificationType, string> = {
    booking: '🎫',
    system: '📢',
    service: '🎁',
    promotion: '🎊',
    reminder: '⏰',
  };
  return icons[type] || '📬';
};

export const getNotificationColor = (type: NotificationType): string => {
  const colors: Record<NotificationType, string> = {
    booking: '#007AFF',
    system: '#FF9500',
    service: '#34C759',
    promotion: '#FF2D55',
    reminder: '#5856D6',
  };
  return colors[type] || '#8E8E93';
};

export const getPriorityColor = (priority: NotificationPriority): string => {
  const colors: Record<NotificationPriority, string> = {
    low: '#8E8E93',
    normal: '#007AFF',
    high: '#FF3B30',
  };
  return colors[priority] || '#8E8E93';
};

export const formatNotificationTime = (dateString: string): string => {
  const date = new Date(dateString);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  
  if (minutes < 1) return 'Vừa xong';
  if (minutes < 60) return `${minutes} phút trước`;
  if (hours < 24) return `${hours} giờ trước`;
  if (days < 7) return `${days} ngày trước`;
  
  return date.toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
};
