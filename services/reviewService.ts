import api from './api';

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

export const getReviews = async (params?: GetReviewsParams): Promise<ReviewsResponse> => {
  const response = await api.get('/reviews', { params });
  return response.data;
};

export const getReviewById = async (reviewId: string): Promise<Review> => {
  const response = await api.get(`/reviews/${reviewId}`);
  return response.data;
};

export const createReview = async (data: CreateReviewData): Promise<Review> => {
  const response = await api.post('/reviews', data);
  return response.data;
};

export const updateReview = async (reviewId: string, data: Partial<CreateReviewData>): Promise<Review> => {
  const response = await api.patch(`/reviews/${reviewId}`, data);
  return response.data;
};

export const deleteReview = async (reviewId: string): Promise<void> => {
  await api.delete(`/reviews/${reviewId}`);
};
