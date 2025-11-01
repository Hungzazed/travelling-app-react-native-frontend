import api from './api';
import { Hotel } from './hotelService';

export interface Tour {
  id: string;
  name: string;
  description?: string;
  destination: string;
  duration: string;
  pricePerPerson: number;
  itinerary: {
    day: number;
    activities: string[];
  }[];
  images: string[];
  includedServices: string[];
  hotels: string[] | Hotel[]; // Can be populated
  createdAt: string;
  updatedAt: string;
}

export interface GetToursParams {
  destination?: string;
  name?: string;
  minPrice?: number;
  maxPrice?: number;
  sortBy?: string;
  limit?: number;
  page?: number;
}

export interface ToursResponse {
  results: Tour[];
  page: number;
  limit: number;
  totalPages: number;
  totalResults: number;
}

export const getTours = async (params?: GetToursParams): Promise<ToursResponse> => {
  const response = await api.get('/tours', { params });
  return response.data;
};

export const getTourById = async (tourId: string): Promise<Tour> => {
  const response = await api.get(`/tours/${tourId}`);
  return response.data;
};

export const searchTours = async (params: GetToursParams): Promise<ToursResponse> => {
  const response = await api.get('/tours/search', { params });
  return response.data;
};
