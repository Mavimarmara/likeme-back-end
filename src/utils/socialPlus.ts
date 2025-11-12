import { config } from '@/config';

interface SocialPlusUser {
  id?: string;
  username?: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  avatar?: string;
  metadata?: Record<string, any>;
}

interface SocialPlusCommunity {
  id?: string;
  name: string;
  description?: string;
  type?: 'public' | 'private' | 'official' | 'unofficial';
  avatar?: string;
  metadata?: Record<string, any>;
}

interface SocialPlusPost {
  id?: string;
  communityId: string;
  userId: string;
  content: string;
  media?: string[];
  metadata?: Record<string, any>;
}

interface SocialPlusResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

class SocialPlusClient {
  private apiKey: string;
  private baseUrl: string;
  private region: string;

  constructor() {
    this.apiKey = config.socialPlus.apiKey;
    this.baseUrl = config.socialPlus.baseUrl;
    this.region = config.socialPlus.region;
  }

  private async makeRequest<T>(
    method: string,
    endpoint: string,
    body?: any,
    headers?: Record<string, string>
  ): Promise<SocialPlusResponse<T>> {
    try {
      if (!this.apiKey) {
        throw new Error('Social.plus API key not configured');
      }

      const url = `${this.baseUrl}/v1${endpoint}`;
      const defaultHeaders: Record<string, string> = {
        'Content-Type': 'application/json',
        'X-API-Key': this.apiKey,
        'X-Region': this.region,
        ...headers,
      };

      const options: RequestInit = {
        method,
        headers: defaultHeaders,
      };

      if (body && method !== 'GET') {
        options.body = JSON.stringify(body);
      }

      const response = await fetch(url, options);
      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: data.message || data.error || `HTTP ${response.status}`,
          message: data.message,
        };
      }

      return {
        success: true,
        data: data.data || data,
      };
    } catch (error) {
      console.error('Social.plus API error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  // User Management
  async createUser(userData: SocialPlusUser): Promise<SocialPlusResponse<{ id: string }>> {
    return this.makeRequest<{ id: string }>('POST', '/users', userData);
  }

  async getUser(userId: string): Promise<SocialPlusResponse<SocialPlusUser>> {
    return this.makeRequest<SocialPlusUser>('GET', `/users/${userId}`);
  }

  async updateUser(userId: string, userData: Partial<SocialPlusUser>): Promise<SocialPlusResponse<SocialPlusUser>> {
    return this.makeRequest<SocialPlusUser>('PUT', `/users/${userId}`, userData);
  }

  async deleteUser(userId: string): Promise<SocialPlusResponse<void>> {
    return this.makeRequest<void>('DELETE', `/users/${userId}`);
  }

  // Community Management
  async createCommunity(communityData: SocialPlusCommunity): Promise<SocialPlusResponse<{ id: string }>> {
    return this.makeRequest<{ id: string }>('POST', '/communities', communityData);
  }

  async getCommunity(communityId: string): Promise<SocialPlusResponse<SocialPlusCommunity>> {
    return this.makeRequest<SocialPlusCommunity>('GET', `/communities/${communityId}`);
  }

  async listCommunities(params?: {
    page?: number;
    limit?: number;
    type?: string;
  }): Promise<SocialPlusResponse<{ communities: SocialPlusCommunity[]; total: number }>> {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.type) queryParams.append('type', params.type);

    const query = queryParams.toString();
    return this.makeRequest<{ communities: SocialPlusCommunity[]; total: number }>(
      'GET',
      `/communities${query ? `?${query}` : ''}`
    );
  }

  async updateCommunity(
    communityId: string,
    communityData: Partial<SocialPlusCommunity>
  ): Promise<SocialPlusResponse<SocialPlusCommunity>> {
    return this.makeRequest<SocialPlusCommunity>('PUT', `/communities/${communityId}`, communityData);
  }

  async deleteCommunity(communityId: string): Promise<SocialPlusResponse<void>> {
    return this.makeRequest<void>('DELETE', `/communities/${communityId}`);
  }

  // Community Members
  async addMemberToCommunity(
    communityId: string,
    userId: string
  ): Promise<SocialPlusResponse<{ success: boolean }>> {
    return this.makeRequest<{ success: boolean }>('POST', `/communities/${communityId}/members`, { userId });
  }

  async removeMemberFromCommunity(
    communityId: string,
    userId: string
  ): Promise<SocialPlusResponse<{ success: boolean }>> {
    return this.makeRequest<{ success: boolean }>('DELETE', `/communities/${communityId}/members/${userId}`);
  }

  async getCommunityMembers(
    communityId: string,
    params?: { page?: number; limit?: number }
  ): Promise<SocialPlusResponse<{ members: SocialPlusUser[]; total: number }>> {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());

    const query = queryParams.toString();
    return this.makeRequest<{ members: SocialPlusUser[]; total: number }>(
      'GET',
      `/communities/${communityId}/members${query ? `?${query}` : ''}`
    );
  }

  // Posts
  async createPost(postData: SocialPlusPost): Promise<SocialPlusResponse<{ id: string }>> {
    return this.makeRequest<{ id: string }>('POST', '/posts', postData);
  }

  async getPost(postId: string): Promise<SocialPlusResponse<SocialPlusPost>> {
    return this.makeRequest<SocialPlusPost>('GET', `/posts/${postId}`);
  }

  async getCommunityPosts(
    communityId: string,
    params?: { page?: number; limit?: number }
  ): Promise<SocialPlusResponse<{ posts: SocialPlusPost[]; total: number }>> {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());

    const query = queryParams.toString();
    return this.makeRequest<{ posts: SocialPlusPost[]; total: number }>(
      'GET',
      `/communities/${communityId}/posts${query ? `?${query}` : ''}`
    );
  }

  async updatePost(postId: string, postData: Partial<SocialPlusPost>): Promise<SocialPlusResponse<SocialPlusPost>> {
    return this.makeRequest<SocialPlusPost>('PUT', `/posts/${postId}`, postData);
  }

  async deletePost(postId: string): Promise<SocialPlusResponse<void>> {
    return this.makeRequest<void>('DELETE', `/posts/${postId}`);
  }

  // Feed
  async getUserFeed(
    userId: string,
    params?: { page?: number; limit?: number }
  ): Promise<SocialPlusResponse<{ posts: SocialPlusPost[]; total: number }>> {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());

    const query = queryParams.toString();
    return this.makeRequest<{ posts: SocialPlusPost[]; total: number }>(
      'GET',
      `/users/${userId}/feed${query ? `?${query}` : ''}`
    );
  }
}

export const socialPlusClient = new SocialPlusClient();
export type { SocialPlusUser, SocialPlusCommunity, SocialPlusPost, SocialPlusResponse };

