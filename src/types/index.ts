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
  registerCompletedAt?: Date | null; // Data em que o registro foi completado (calculado)
  objectivesSelectedAt?: Date | null; // Data em que os objetivos foram selecionados (calculado)
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

// Interfaces para resposta do Amity Social API - Global Feed
export interface AmityVideoFileId {
  original?: string;
  low?: string;
  medium?: string;
  high?: string;
}

export interface AmityPostData {
  title?: string;
  text?: string;
  fileId?: string;
  thumbnailFileId?: string;
  videoFileId?: AmityVideoFileId;
  streamId?: string;
}

export interface AmityHashFlag {
  bits?: number;
  hashes?: number;
  hash?: string[];
}

export interface AmityReactions {
  [key: string]: number;
}

export interface AmityMentionee {
  type: string;
  userIds?: string[];
  userPublicIds?: string[];
  userInternalIds?: string[];
}

export interface AmityPost {
  _id?: string;
  path?: string;
  postId?: string;
  parentPostId?: string;
  postedUserId?: string;
  postedUserPublicId?: string;
  postedUserInternalId?: string;
  publisherId?: string;
  publisherPublicId?: string;
  sharedUserId?: string;
  sharedCount?: number;
  targetId?: string;
  targetPublicId?: string;
  targetInternalId?: string;
  targetType?: 'user' | 'community';
  dataType?: string;
  data?: AmityPostData;
  metadata?: Record<string, any>;
  flagCount?: number;
  hashFlag?: AmityHashFlag;
  editedAt?: string;
  createdAt?: string;
  updatedAt?: string;
  reactions?: AmityReactions;
  reactionsCount?: number;
  myReactions?: string[];
  commentsCount?: number;
  comments?: string[];
  children?: string[];
  childrenNumber?: number;
  isDeleted?: boolean;
  hasFlaggedComment?: boolean;
  hasFlaggedChildren?: boolean;
  feedId?: string;
  tags?: string[];
  hashtags?: string[];
  mentionees?: AmityMentionee[];
  impression?: number;
  reach?: number;
  structureType?: string;
}

export interface AmityCommentAttachment {
  type?: string;
  fileId?: string;
}

export interface AmityComment {
  _id?: string;
  path?: string;
  commentId?: string;
  userId?: string;
  userPublicId?: string;
  userInternalId?: string;
  parentId?: string;
  rootId?: string;
  referenceId?: string;
  referenceType?: string;
  dataType?: string;
  dataTypes?: string[];
  data?: Record<string, any>;
  metadata?: Record<string, any>;
  childrenNumber?: number;
  flagCount?: number;
  hashFlag?: AmityHashFlag;
  reactions?: AmityReactions;
  reactionsCount?: number;
  myReactions?: string[];
  isDeleted?: boolean;
  editedAt?: string;
  createdAt?: string;
  updatedAt?: string;
  children?: string[];
  segmentNumber?: number;
  mentionees?: AmityMentionee[];
  attachments?: AmityCommentAttachment[];
  targetId?: string;
  targetType?: string;
}

export interface AmityFileMetadata {
  exif?: Record<string, any>;
  gps?: Record<string, any>;
  height?: number;
  width?: number;
  isFull?: boolean;
}

export interface AmityFileAttributes {
  name?: string;
  extension?: string;
  size?: number;
  mimeType?: string;
  metadata?: AmityFileMetadata;
}

export interface AmityFile {
  fileId?: string;
  fileUrl?: string;
  type?: string;
  accessType?: string;
  altText?: string;
  createdAt?: string;
  updatedAt?: string;
  attributes?: AmityFileAttributes;
}

export interface AmityUser {
  _id?: string;
  path?: string;
  userId?: string;
  userInternalId?: string;
  userPublicId?: string;
  roles?: string[];
  permissions?: string[];
  displayName?: string;
  profileHandle?: string;
  description?: string;
  avatarFileId?: string;
  avatarCustomUrl?: string;
  flagCount?: number;
  hashFlag?: AmityHashFlag;
  metadata?: Record<string, any>;
  isGlobalBan?: boolean;
  isBrand?: boolean;
  createdAt?: string;
  updatedAt?: string;
  isDeleted?: boolean;
}

export interface AmityCommunity {
  _id?: string;
  path?: string;
  communityId?: string;
  channelId?: string;
  userId?: string;
  userPublicId?: string;
  userInternalId?: string;
  displayName?: string;
  avatarFileId?: string;
  description?: string;
  isOfficial?: boolean;
  isPublic?: boolean;
  onlyAdminCanPost?: boolean;
  tags?: string[];
  metadata?: Record<string, any>;
  postsCount?: number;
  membersCount?: number;
  isJoined?: boolean;
  categoryIds?: string[];
  isDeleted?: boolean;
  createdAt?: string;
  updatedAt?: string;
  hasFlaggedComment?: boolean;
  hasFlaggedPost?: boolean;
  needApprovalOnPostCreation?: boolean;
  moderatorMemberCount?: number;
  allowCommentInStory?: boolean;
  isDiscoverable?: boolean;
  requiresJoinApproval?: boolean;
  notificationMode?: string;
}

export interface AmityCommunityUser {
  userId?: string;
  userPublicId?: string;
  userInternalId?: string;
  channelId?: string;
  communityId?: string;
  communityMembership?: string;
  notMemberReason?: string;
  isBanned?: boolean;
  lastActivity?: string;
  roles?: string[];
  permissions?: string[];
  createdAt?: string;
  updatedAt?: string;
}

export interface AmityCategory {
  categoryId?: string;
  name?: string;
  metadata?: Record<string, any>;
  avatarFileId?: string;
  isDeleted?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface AmityPaging {
  next?: string;
  previous?: string;
}

export interface AmityGlobalFeedData {
  posts?: AmityPost[];
  postChildren?: AmityPost[];
  comments?: AmityComment[];
  users?: AmityUser[];
  files?: AmityFile[];
  communities?: AmityCommunity[];
  communityUsers?: AmityCommunityUser[];
  categories?: AmityCategory[];
  paging?: AmityPaging;
}

export interface AmityGlobalFeedResponse {
  status?: string;
  data?: AmityGlobalFeedData;
}
