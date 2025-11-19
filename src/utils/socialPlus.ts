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
    this.baseUrl = config.socialPlus.baseUrl.replace(/\/$/, '');
    this.region = config.socialPlus.region;
    
    // Log para debug (remover em produção se necessário)
    console.log('SocialPlusClient initialized with baseUrl:', this.baseUrl);
  }

  private buildUrl(endpoint: string): string {
    if (endpoint.startsWith('http')) {
      return endpoint;
    }

    // Garantir que baseUrl termina sem barra e endpoint começa com barra
    const cleanBaseUrl = this.baseUrl.replace(/\/$/, '');
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    const fullUrl = `${cleanBaseUrl}${cleanEndpoint}`;
    
    return fullUrl;
  }

  private async makeRequest<T>(
    method: string,
    endpoint: string,
    body?: any,
    options?: {
      headers?: Record<string, string>;
      useApiKey?: boolean;
      bearerToken?: string;
    }
  ): Promise<SocialPlusResponse<T>> {
    try {
      const url = this.buildUrl(endpoint);
      const useApiKey = options?.useApiKey !== false;

      if (useApiKey && !this.apiKey) {
        throw new Error('Social.plus API key not configured');
      }

      const defaultHeaders: Record<string, string> = {
        'Content-Type': 'application/json',
        ...(options?.headers || {}),
      };

      // X-Region pode não ser necessário para todos os endpoints
      // Adicionar apenas se não estiver nas opções
      if (!options?.headers?.['X-Region']) {
        defaultHeaders['X-Region'] = this.region;
      }

      if (useApiKey) {
        defaultHeaders['X-API-Key'] = this.apiKey;
        console.log('[SocialPlus] Using API Key (first 10 chars):', this.apiKey.substring(0, 10) + '...');
      }

      if (options?.bearerToken) {
        defaultHeaders.Authorization = `Bearer ${options.bearerToken}`;
      }

      const fetchOptions: RequestInit = {
        method,
        headers: defaultHeaders,
      };

      if (body && method !== 'GET') {
        fetchOptions.body = JSON.stringify(body);
      }

      console.log('[SocialPlus] Making request:', {
        method,
        url,
        headers: defaultHeaders,
        hasBody: !!body,
      });

      const response = await fetch(url, fetchOptions);
      const contentType = response.headers.get('content-type');
      const data = contentType?.includes('application/json') ? ((await response.json()) as any) : await response.text();

      console.log('[SocialPlus] Response:', {
        status: response.status,
        statusText: response.statusText,
        contentType,
        dataPreview: typeof data === 'string' ? data.substring(0, 200) : JSON.stringify(data).substring(0, 200),
      });

      if (!response.ok) {
        const errorMessage = (data && (data.message || data.error)) || `HTTP ${response.status}`;
        console.error('[SocialPlus] Request failed:', {
          status: response.status,
          statusText: response.statusText,
          error: errorMessage,
          fullData: data,
        });
        return {
          success: false,
          error: errorMessage,
          message: data?.message,
        };
      }

      if (typeof data === 'string') {
        return {
          success: true,
          data: data as unknown as T,
        };
      }

      return {
        success: true,
        data: (data.data || data) as T,
      };
    } catch (error) {
      console.error('Social.plus API error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  // Métodos de server token removidos - não são mais necessários
  // A API key é usada diretamente via header X-API-Key

  // User Management
  async createUser(userData: SocialPlusUser): Promise<SocialPlusResponse<{ id: string }>> {
    return this.makeRequest<{ id: string }>('POST', '/v1/users', userData);
  }

  async getUser(userId: string): Promise<SocialPlusResponse<SocialPlusUser>> {
    return this.makeRequest<SocialPlusUser>('GET', `/v1/users/${userId}`);
  }

  async updateUser(userId: string, userData: Partial<SocialPlusUser>): Promise<SocialPlusResponse<SocialPlusUser>> {
    return this.makeRequest<SocialPlusUser>('PUT', `/v1/users/${userId}`, userData);
  }

  async deleteUser(userId: string): Promise<SocialPlusResponse<void>> {
    return this.makeRequest<void>('DELETE', `/v1/users/${userId}`);
  }

  // Community Management
  async createCommunity(communityData: SocialPlusCommunity): Promise<SocialPlusResponse<{ id: string }>> {
    return this.makeRequest<{ id: string }>('POST', '/v1/communities', communityData);
  }

  async getCommunity(communityId: string): Promise<SocialPlusResponse<SocialPlusCommunity>> {
    return this.makeRequest<SocialPlusCommunity>('GET', `/v1/communities/${communityId}`);
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
      `/v1/communities${query ? `?${query}` : ''}`
    );
  }

  async updateCommunity(
    communityId: string,
    communityData: Partial<SocialPlusCommunity>
  ): Promise<SocialPlusResponse<SocialPlusCommunity>> {
    return this.makeRequest<SocialPlusCommunity>('PUT', `/v1/communities/${communityId}`, communityData);
  }

  async deleteCommunity(communityId: string): Promise<SocialPlusResponse<void>> {
    return this.makeRequest<void>('DELETE', `/v1/communities/${communityId}`);
  }

  // Community Members
  async addMemberToCommunity(
    communityId: string,
    userId: string
  ): Promise<SocialPlusResponse<{ success: boolean }>> {
    return this.makeRequest<{ success: boolean }>('POST', `/v1/communities/${communityId}/members`, { userId });
  }

  async removeMemberFromCommunity(
    communityId: string,
    userId: string
  ): Promise<SocialPlusResponse<{ success: boolean }>> {
    return this.makeRequest<{ success: boolean }>('DELETE', `/v1/communities/${communityId}/members/${userId}`);
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
      `/v1/communities/${communityId}/members${query ? `?${query}` : ''}`
    );
  }

  async getUserCommunities(
    userId: string,
    params?: { page?: number; limit?: number }
  ): Promise<SocialPlusResponse<{ communities: SocialPlusCommunity[] | any[]; total: number }>> {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());

    const query = queryParams.toString();
    return this.makeRequest<{ communities: SocialPlusCommunity[] | any[]; total: number }>(
      'GET',
      `/v1/users/${userId}/communities${query ? `?${query}` : ''}`
    );
  }

  // Posts
  async createPost(postData: SocialPlusPost): Promise<SocialPlusResponse<{ id: string }>> {
    return this.makeRequest<{ id: string }>('POST', '/v1/posts', postData);
  }

  async getPost(postId: string): Promise<SocialPlusResponse<SocialPlusPost>> {
    return this.makeRequest<SocialPlusPost>('GET', `/v1/posts/${postId}`);
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
      `/v1/communities/${communityId}/posts${query ? `?${query}` : ''}`
    );
  }

  async updatePost(postId: string, postData: Partial<SocialPlusPost>): Promise<SocialPlusResponse<SocialPlusPost>> {
    return this.makeRequest<SocialPlusPost>('PUT', `/v1/posts/${postId}`, postData);
  }

  async deletePost(postId: string): Promise<SocialPlusResponse<void>> {
    return this.makeRequest<void>('DELETE', `/v1/posts/${postId}`);
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
      `/v1/users/${userId}/feed${query ? `?${query}` : ''}`
    );
  }

  async getGlobalFeed(
    params?: { page?: number; limit?: number }
  ): Promise<SocialPlusResponse<any>> {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());

    if (!this.apiKey) {
      return {
        success: false,
        error: 'Social.plus API key não configurado. Configure SOCIAL_PLUS_API_KEY nas variáveis de ambiente.',
      };
    }

    const query = queryParams.toString();

    // Usar API key diretamente
    return this.makeRequest<any>(
      'GET',
      `/v3/global-feeds${query ? `?${query}` : ''}`,
      undefined,
      {
        useApiKey: true, // Usa X-API-Key header diretamente
      }
    );
  }
}

export const socialPlusClient = new SocialPlusClient();
export type { SocialPlusUser, SocialPlusCommunity, SocialPlusPost, SocialPlusResponse };

