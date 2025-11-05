import { Request } from 'express';
import { User } from '@prisma/client';

export interface AuthenticatedRequest extends Request {
  user?: User;
}

export interface CreateUserData {
  username?: string;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  surname?: string;
  phone?: string;
  birthdate?: string;
  avatar?: string;
}

export interface UpdateUserData {
  username?: string;
  firstName?: string;
  lastName?: string;
  surname?: string;
  birthdate?: string;
  avatar?: string;
}

export interface AuthResponse {
  user: Omit<User, 'password'>;
  token: string;
}

export interface AnamneseAnswer {
  questionId: string;
  answer: string;
}

export interface CreateAnamneseData {
  answers: AnamneseAnswer[];
}

export interface CreateActivityData {
  title: string;
  description?: string;
  category: 'exercise' | 'nutrition' | 'mental' | 'medical';
  duration?: number;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  scheduledAt?: string;
}

export interface UpdateActivityData {
  title?: string;
  description?: string;
  category?: 'exercise' | 'nutrition' | 'mental' | 'medical';
  duration?: number;
  difficulty?: 'Easy' | 'Medium' | 'Hard';
  completed?: boolean;
  scheduledAt?: string;
}

export interface CreateWellnessData {
  category: 'physical' | 'mental' | 'emotional' | 'social';
  score: number;
  notes?: string;
  date?: string;
}

export interface CreatePostData {
  content: string;
  category: 'tips' | 'experiences' | 'questions' | 'achievements';
  tags?: string[];
}

export interface UpdatePostData {
  content?: string;
  category?: 'tips' | 'experiences' | 'questions' | 'achievements';
  tags?: string[];
}

export interface CreateProductData {
  title: string;
  description: string;
  category: 'supplements' | 'equipment' | 'books' | 'courses';
  price: number;
  originalPrice?: number;
  discount?: number;
  image?: string;
  inStock?: boolean;
  stock?: number;
}

export interface UpdateProductData {
  title?: string;
  description?: string;
  category?: 'supplements' | 'equipment' | 'books' | 'courses';
  price?: number;
  originalPrice?: number;
  discount?: number;
  image?: string;
  inStock?: boolean;
  stock?: number;
}

export interface CreateOrderData {
  items: {
    productId: string;
    quantity: number;
  }[];
  address: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };
}

export interface CreateHealthProviderData {
  name: string;
  specialty: string;
  description?: string;
  experience: number;
}

export interface UpdateHealthProviderData {
  name?: string;
  specialty?: string;
  description?: string;
  experience?: number;
  isAvailable?: boolean;
}

export interface CreateAppointmentData {
  providerId: string;
  date: string;
  duration: number;
  notes?: string;
}

export interface UpdateAppointmentData {
  date?: string;
  duration?: number;
  status?: 'scheduled' | 'completed' | 'cancelled';
  notes?: string;
}

export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  error?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface PaginationQuery {
  page?: number;
  limit?: number;
}

export interface SearchQuery extends PaginationQuery {
  search?: string;
  category?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}
