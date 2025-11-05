import api from './api';
import { CacheService, CacheTTL, createCacheKey } from './cacheService';

export interface Review {
  id: string;
  userId: string | {
    id: string;
    name: string;
    email: string;
  };
  targetType: 'tour' | 'hotel';
  targetId: string;
  rating: number;
  comment?: string;
  createdAt: string;
  updatedAt: string;
}

export interface GetReviewsParams {
  targetType?: 'tour' | 'hotel';
  targetId?: string;
  rating?: number;
  sortBy?: string;
  limit?: number;
  page?: number;
}

export interface ReviewsResponse {
  results: Review[];
  page: number;
  limit: number;
  totalPages: number;
  totalResults: number;
}

export interface CreateReviewData {
  targetType: 'tour' | 'hotel';
  targetId: string;
  rating: number;
  comment?: string;
}

/**
 * Get reviews với caching
 */
export const getReviews = async (
  params?: GetReviewsParams,
  onUpdate?: (data: ReviewsResponse) => void
): Promise<ReviewsResponse> => {
  const cacheKey = createCacheKey.reviews(params?.targetType, params?.targetId, params?.rating);
  
  return CacheService.getWithSWR<ReviewsResponse>(
    cacheKey,
    'generic_cache',
    async () => {
      const response = await api.get('/reviews', { params });
      return response.data;
    },
    onUpdate,
    CacheTTL.TOURS // 5 phút
  );
};

/**
 * Get review by ID với caching
 */
export const getReviewById = async (
  reviewId: string,
  onUpdate?: (data: Review) => void
): Promise<Review> => {
  const cacheKey = createCacheKey.reviewDetail(reviewId);
  
  return CacheService.getWithSWR<Review>(
    cacheKey,
    'generic_cache',
    async () => {
      const response = await api.get(`/reviews/${reviewId}`);
      return response.data;
    },
    onUpdate,
    CacheTTL.TOURS
  );
};

/**
 * Create review - Invalidate cache
 */
export const createReview = async (data: CreateReviewData): Promise<Review> => {
  const response = await api.post('/reviews', data);
  
  // Invalidate reviews cache cho target này
  await CacheService.invalidatePattern('reviews:', 'generic_cache');
  
  // Nếu là tour review, cũng invalidate tour cache để cập nhật rating
  if (data.targetType === 'tour') {
    await CacheService.invalidate(createCacheKey.tourDetail(data.targetId), 'tours_cache');
  }
  
  return response.data;
};

/**
 * Update review - Invalidate cache
 */
export const updateReview = async (reviewId: string, data: Partial<CreateReviewData>): Promise<Review> => {
  const response = await api.patch(`/reviews/${reviewId}`, data);
  
  // Invalidate specific review và all reviews
  await CacheService.invalidate(createCacheKey.reviewDetail(reviewId), 'generic_cache');
  await CacheService.invalidatePattern('reviews:', 'generic_cache');
  
  // Invalidate tour/hotel cache nếu có
  if (data.targetId && data.targetType === 'tour') {
    await CacheService.invalidate(createCacheKey.tourDetail(data.targetId), 'tours_cache');
  }
  
  return response.data;
};

/**
 * Delete review - Invalidate cache
 */
export const deleteReview = async (reviewId: string): Promise<void> => {
  await api.delete(`/reviews/${reviewId}`);
  
  // Invalidate all reviews cache
  await CacheService.invalidate(createCacheKey.reviewDetail(reviewId), 'generic_cache');
  await CacheService.invalidatePattern('reviews:', 'generic_cache');
};
