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
  private serverKey: string;
  private baseUrl: string;
  private region: string;
  private tokenTtlMs: number;
  private tokenCache: { token: string; expiresAt: number } | null = null;

  constructor() {
    this.apiKey = config.socialPlus.apiKey;
    this.serverKey = config.socialPlus.serverKey;
    this.baseUrl = config.socialPlus.baseUrl.replace(/\/$/, '');
    this.region = config.socialPlus.region;
    this.tokenTtlMs = config.socialPlus.tokenTtlMs || 300000;
    
    // Log para debug
    console.log('[SocialPlus] Client initialized:', {
      baseUrl: this.baseUrl,
      region: this.region,
      hasApiKey: !!this.apiKey,
      apiKeyLength: this.apiKey?.length || 0,
      hasServerKey: !!this.serverKey,
      serverKeyLength: this.serverKey?.length || 0,
      tokenTtlMs: this.tokenTtlMs,
    });
    
    if (!this.serverKey) {
      console.warn('[SocialPlus] ⚠️  Server key não configurada. Configure SOCIAL_PLUS_SERVER_KEY no arquivo .env');
    }
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

      // Se a resposta tiver estrutura { status, data: {...} }, preservar ambos
      if (data && typeof data === 'object' && 'data' in data && 'status' in data) {
        return {
          success: true,
          data: {
            status: (data as any).status,
            ...((data as any).data || {}),
          } as T,
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

  private async generateServerToken(userId?: string, forceRefresh = false): Promise<string> {
    if (!this.serverKey) {
      throw new Error('Social.plus server key not configured');
    }

    const cacheValid = this.tokenCache && this.tokenCache.expiresAt > Date.now();

    if (!forceRefresh && cacheValid && this.tokenCache) {
      return this.tokenCache.token;
    }

    // O endpoint exige userId, então usar um valor padrão se não fornecido
    const serverUserId = userId || 'server';
    const requestBody = { userId: serverUserId };

    const url = this.buildUrl('/v4/authentication/token');
    console.log('[SocialPlus] Generating server token, URL:', url, 'userId:', serverUserId);

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-server-key': this.serverKey,
      },
      body: JSON.stringify(requestBody),
    });

    const text = await response.text();

    if (!response.ok) {
      console.error('[SocialPlus] Erro ao gerar token de servidor:', {
        status: response.status,
        statusText: response.statusText,
        responseBody: text,
        hasServerKey: !!this.serverKey,
        serverKeyLength: this.serverKey?.length || 0,
      });
      throw new Error(text || `HTTP ${response.status}`);
    }

    const token = text.replace(/(^"|"$)/g, '').trim();
    // Cache do token sem TTL fixo - usar até expirar naturalmente ou forçar refresh
    this.tokenCache = {
      token,
      expiresAt: Date.now() + (5 * 60 * 1000), // 5 minutos padrão
    };

    console.log('[SocialPlus] Server token generated and cached');
    return token;
  }

  private async getServerToken(forceRefresh = false): Promise<string | null> {
    try {
      if (!this.serverKey) {
        console.warn('Social.plus server key não configurado. Configure SOCIAL_PLUS_SERVER_KEY nas variáveis de ambiente:', this.serverKey);
        return null;
      }

      return await this.generateServerToken(undefined, forceRefresh);
    } catch (error) {
      // Verificar diferentes variações de erro relacionadas a server key inválida
      const errorMessage = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();
      const isInvalidServerKey = 
        errorMessage.includes('invalid server key') ||
        errorMessage.includes('server key') && (errorMessage.includes('invalid') || errorMessage.includes('unauthorized') || errorMessage.includes('forbidden')) ||
        errorMessage.includes('401') ||
        errorMessage.includes('403');
      
      if (isInvalidServerKey) {
        console.warn('Server key inválido ou não autorizado. Usando API key diretamente como fallback.');
        console.warn('Detalhes do erro:', error instanceof Error ? error.message : String(error));
        console.warn('Verifique se SOCIAL_PLUS_SERVER_KEY está configurada corretamente no arquivo .env');
        return null;
      }
      console.error('Erro ao obter token da social.plus:', error);
      return null;
    }
  }

  /**
   * Método público para obter token de servidor
   * Usado para gerar tokens de usuário via API REST
   */
  async getServerTokenPublic(forceRefresh = false): Promise<string | null> {
    return this.getServerToken(forceRefresh);
  }

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

  /**
   * Lista comunidades usando a API v3 do Amity
   * Requer autenticação Bearer token
   */
  async listCommunities(params?: {
    userAccessToken?: string;
    page?: number;
    limit?: number;
    sortBy?: string;
    includeDeleted?: boolean;
  }): Promise<SocialPlusResponse<any>> {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.sortBy) queryParams.append('sortBy', params.sortBy);
    if (params?.includeDeleted !== undefined) queryParams.append('includeDeleted', params.includeDeleted.toString());

    const query = queryParams.toString();
    const endpoint = `/v3/communities${query ? `?${query}` : ''}`;

    // Se token de usuário fornecido, usar ele; caso contrário tentar token de servidor
    if (params?.userAccessToken) {
      return this.makeRequest<any>(
        'GET',
        endpoint,
        undefined,
        {
          useApiKey: true,
          bearerToken: params.userAccessToken,
        }
      );
    }

    // Tentar usar token de servidor
    let token: string | null = null;
    try {
      token = await this.getServerToken();
    } catch (error) {
      console.warn('Erro ao obter token de servidor para listCommunities:', error);
    }

    if (token) {
      return this.makeRequest<any>(
        'GET',
        endpoint,
        undefined,
        {
          useApiKey: true,
          bearerToken: token,
        }
      );
    }

    // Fallback: usar apenas API key (pode não funcionar para v3)
    return this.makeRequest<any>(
      'GET',
      endpoint,
      undefined,
      {
        useApiKey: true,
      }
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
  /**
   * Adiciona o usuário atual (autenticado via token) a uma comunidade
   * Usa o endpoint v4 que requer Bearer token de autenticação
   */
  async addMemberToCommunity(
    communityId: string,
    userAccessToken: string
  ): Promise<SocialPlusResponse<{ success: boolean }>> {
    return this.makeRequest<{ success: boolean }>(
      'POST',
      `/v4/communities/${communityId}/join`,
      undefined,
      {
        useApiKey: true,
        bearerToken: userAccessToken,
      }
    );
  }

  /**
   * Adiciona um usuário a todas as comunidades disponíveis
   * Requer token de acesso do usuário para listar comunidades
   */
  async addUserToAllCommunities(
    userId: string,
    userAccessToken?: string
  ): Promise<{ added: number; failed: number; errors: string[] }> {
    const result = { added: 0, failed: 0, errors: [] as string[] };

    try {
      // Se não tiver token de acesso do usuário, tentar usar apenas API key
      // (pode não funcionar para v3, mas tentamos)
      if (!userAccessToken) {
        console.warn('[SocialPlus] Token de acesso do usuário não fornecido. Tentando usar apenas API key...');
      }

      // Listar todas as comunidades (usando token de usuário se disponível)
      let allCommunities: any[] = [];
      let page = 1;
      const limit = 100;
      let hasMore = true;
      const maxPages = 50; // Limite de segurança para evitar loop infinito

      while (hasMore && page <= maxPages) {
        const response = await this.listCommunities({
          userAccessToken,
          page,
          limit,
          includeDeleted: false,
        });

        if (!response.success) {
          console.warn(`[SocialPlus] Erro ao listar comunidades na página ${page}:`, response.error);
          break;
        }

        const communities = response.data?.communities ?? [];
        if (communities.length === 0) {
          hasMore = false;
          break;
        }

        allCommunities = allCommunities.concat(communities);

        // Verificar se há mais páginas
        const paging = response.data?.paging;
        hasMore = !!paging?.next && communities.length === limit;
        page++;
      }

      if (allCommunities.length === 0) {
        console.log('[SocialPlus] Nenhuma comunidade encontrada para adicionar o usuário');
        return result;
      }

      if (!userAccessToken) {
        throw new Error('Token de acesso do usuário é obrigatório para adicionar membros às comunidades');
      }

      console.log(`[SocialPlus] Encontradas ${allCommunities.length} comunidades. Adicionando usuário ${userId} a todas...`);

      // Adicionar usuário a cada comunidade (processar em paralelo com limite)
      const batchSize = 10; // Processar 10 comunidades por vez
      for (let i = 0; i < allCommunities.length; i += batchSize) {
        const batch = allCommunities.slice(i, i + batchSize);
        const batchPromises = batch.map(async (community) => {
          const communityId = community.communityId || community.id || community._id;
          if (!communityId) {
            console.warn('[SocialPlus] Comunidade sem ID válido, pulando:', community);
            return { success: false, communityId: null, error: 'ID inválido' };
          }

          try {
            const addResponse = await this.addMemberToCommunity(communityId, userAccessToken);
            if (addResponse.success) {
              console.log(`[SocialPlus] Usuário ${userId} adicionado à comunidade ${communityId}`);
              return { success: true, communityId, error: null };
            } else {
              const errorMsg = addResponse.error || 'Erro desconhecido';
              console.warn(`[SocialPlus] Falha ao adicionar usuário à comunidade ${communityId}:`, errorMsg);
              return { success: false, communityId, error: errorMsg };
            }
          } catch (error) {
            const errorMsg = error instanceof Error ? error.message : 'Erro desconhecido';
            console.error(`[SocialPlus] Erro ao adicionar usuário à comunidade ${communityId}:`, error);
            return { success: false, communityId, error: errorMsg };
          }
        });

        const batchResults = await Promise.all(batchPromises);
        
        for (const batchResult of batchResults) {
          if (batchResult.success) {
            result.added++;
          } else if (batchResult.communityId) {
            result.failed++;
            result.errors.push(`Comunidade ${batchResult.communityId}: ${batchResult.error}`);
          }
        }
      }

      console.log(`[SocialPlus] Processo concluído: ${result.added} comunidades adicionadas, ${result.failed} falhas`);
      return result;
    } catch (error) {
      console.error('[SocialPlus] Erro ao adicionar usuário a todas as comunidades:', error);
      throw error;
    }
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

  /**
   * Obtém feed de conteúdo usando a API v3 do Amity
   * Requer autenticação Bearer token do usuário
   * Retorna posts aos quais o usuário tem acesso (incluindo públicos)
   */
  async getContentFeed(
    params?: {
      userAccessToken?: string;
      page?: number;
      limit?: number;
      sortBy?: string;
      includeDeleted?: boolean;
      targetType?: string;
      targetId?: string;
    }
  ): Promise<SocialPlusResponse<any>> {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.sortBy) queryParams.append('sortBy', params.sortBy);
    if (params?.includeDeleted !== undefined) queryParams.append('includeDeleted', params.includeDeleted.toString());
    if (params?.targetType) queryParams.append('targetType', params.targetType);
    if (params?.targetId) queryParams.append('targetId', params.targetId);

    const query = queryParams.toString();
    const endpoint = `/v3/content-feeds${query ? `?${query}` : ''}`;

    // O endpoint v3/content-feeds requer token de usuário
    if (!params?.userAccessToken) {
      return {
        success: false,
        error: 'Token de usuário é obrigatório para o endpoint v3/content-feeds. O usuário deve estar autenticado.',
      };
    }

    console.log('[SocialPlus] Obtendo feed de conteúdo usando token de usuário (v3/content-feeds)');
    return this.makeRequest<any>(
      'GET',
      endpoint,
      undefined,
      {
        useApiKey: true,
        bearerToken: params.userAccessToken,
      }
    );
  }

  async getGlobalFeed(
    params?: { page?: number; limit?: number; userAccessToken?: string }
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

    // Prioridade 1: Usar token de usuário se fornecido (autenticação do usuário)
    if (params?.userAccessToken) {
      console.log('[SocialPlus] Usando token de usuário para getGlobalFeed');
      return this.makeRequest<any>(
        'GET',
        `/v4/me/global-feeds${query ? `?${query}` : ''}`,
        undefined,
        {
          useApiKey: true, // Manter API key (modo seguro)
          bearerToken: params.userAccessToken,
        }
      );
    }

    // Prioridade 2: Tentar usar token de servidor se disponível
    let token: string | null = null;
    try {
      token = await this.getServerToken();
    } catch (error) {
      // Se houver erro ao obter token de servidor (ex: server key inválido), usar API key diretamente
      console.warn('Erro ao obter token de servidor, usando API key diretamente:', error);
      token = null;
    }
    
    if (token) {
      // Usar token de servidor (modo seguro requer AMBOS: API key + Bearer token)
      console.log('[SocialPlus] Usando token de servidor para getGlobalFeed');
      return this.makeRequest<any>(
        'GET',
        `/v4/me/global-feeds${query ? `?${query}` : ''}`,
        undefined,
        {
          useApiKey: true, // Manter API key mesmo com Bearer token (modo seguro)
          bearerToken: token,
        }
      );
    }

    // Fallback: usar API key diretamente
    console.log('[SocialPlus] Usando API key diretamente para getGlobalFeed');
    return this.makeRequest<any>(
      'GET',
      `/v4/me/global-feeds${query ? `?${query}` : ''}`,
      undefined,
      {
        useApiKey: true, // Usa X-API-Key header diretamente
      }
    );
  }
}

export const socialPlusClient = new SocialPlusClient();
export type { SocialPlusUser, SocialPlusCommunity, SocialPlusPost, SocialPlusResponse };

