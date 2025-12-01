import { config } from '@/config';

export interface SocialPlusUser {
  id?: string;
  username?: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  avatar?: string;
  metadata?: Record<string, unknown>;
}

export interface SocialPlusResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface ListCommunitiesParams {
  userAccessToken?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  includeDeleted?: boolean;
}

export interface GetUserFeedParams {
  page?: number;
  limit?: number;
  userAccessToken?: string;
  search?: string;
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

    const cleanBaseUrl = this.baseUrl.replace(/\/$/, '');
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    const fullUrl = `${cleanBaseUrl}${cleanEndpoint}`;
    
    return fullUrl;
  }

  private async makeRequest<T>(
    method: string,
    endpoint: string,
    body?: unknown,
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
      const data = contentType?.includes('application/json') ? ((await response.json()) as unknown) : await response.text();

      console.log('[SocialPlus] Response:', {
        status: response.status,
        statusText: response.statusText,
        contentType,
        dataPreview: typeof data === 'string' ? data.substring(0, 200) : JSON.stringify(data).substring(0, 200),
      });

      if (!response.ok) {
        let errorMessage = `HTTP ${response.status}`;
        let errorDataMessage: string | undefined;
        
        if (data && typeof data === 'object') {
          const dataObj = data as Record<string, unknown>;
          if ('message' in dataObj && dataObj.message) {
            errorMessage = String(dataObj.message);
            errorDataMessage = String(dataObj.message);
          } else if ('error' in dataObj && dataObj.error) {
            errorMessage = String(dataObj.error);
            errorDataMessage = String(dataObj.error);
          } else if ('errors' in dataObj && Array.isArray(dataObj.errors) && dataObj.errors.length > 0) {
            errorMessage = String(dataObj.errors[0]);
            errorDataMessage = String(dataObj.errors[0]);
          }
        }
        
        console.error('[SocialPlus] Request failed:', {
          status: response.status,
          statusText: response.statusText,
          error: errorMessage,
          url: url,
          method: method,
          fullData: data,
        });
        return {
          success: false,
          error: errorMessage,
          message: errorDataMessage,
        };
      }

      if (typeof data === 'string') {
        return {
          success: true,
          data: data as unknown as T,
        };
      }

      if (data && typeof data === 'object' && 'data' in data && 'status' in data) {
        const dataObj = data as { status?: unknown; data?: unknown };
        return {
          success: true,
          data: {
            status: dataObj.status,
            ...(dataObj.data && typeof dataObj.data === 'object' ? dataObj.data : {}),
          } as T,
        };
      }

      const finalData = (data && typeof data === 'object' && 'data' in data && (data as { data?: unknown }).data) 
        ? (data as { data: unknown }).data 
        : data;
      
      return {
        success: true,
        data: finalData as T,
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
    this.tokenCache = {
      token,
      expiresAt: Date.now() + (5 * 60 * 1000),
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
      const errorMessage = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();
      const isInvalidServerKey = 
        errorMessage.includes('invalid server key') ||
        (errorMessage.includes('server key') && (errorMessage.includes('invalid') || errorMessage.includes('unauthorized') || errorMessage.includes('forbidden'))) ||
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

  async createUser(userData: SocialPlusUser): Promise<SocialPlusResponse<{ id: string }>> {
    return this.makeRequest<{ id: string }>('POST', '/v1/users', userData);
  }

  async listCommunities(params?: ListCommunitiesParams): Promise<SocialPlusResponse<unknown>> {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.sortBy) queryParams.append('sortBy', params.sortBy);
    if (params?.includeDeleted !== undefined) queryParams.append('includeDeleted', params.includeDeleted.toString());

    const query = queryParams.toString();
    const endpoint = `/v3/communities${query ? `?${query}` : ''}`;

    if (params?.userAccessToken) {
      return this.makeRequest<unknown>(
        'GET',
        endpoint,
        undefined,
        {
          useApiKey: true,
          bearerToken: params.userAccessToken,
        }
      );
    }

    let token: string | null = null;
    try {
      token = await this.getServerToken();
    } catch (error) {
      console.warn('Erro ao obter token de servidor para listCommunities:', error);
    }

    if (token) {
      return this.makeRequest<unknown>(
        'GET',
        endpoint,
        undefined,
        {
          useApiKey: true,
          bearerToken: token,
        }
      );
    }

    return this.makeRequest<unknown>(
      'GET',
      endpoint,
      undefined,
      {
        useApiKey: true,
      }
    );
  }

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

  async getPoll(pollId: string, userAccessToken?: string): Promise<SocialPlusResponse<unknown>> {
    if (!this.apiKey) {
      return {
        success: false,
        error: 'Social.plus API key não configurado. Configure SOCIAL_PLUS_API_KEY nas variáveis de ambiente.',
      };
    }

    if (userAccessToken) {
      return this.makeRequest<unknown>(
        'GET',
        `/v3/polls/${pollId}`,
        undefined,
        {
          useApiKey: false,
          bearerToken: userAccessToken,
        }
      );
    }

    let token: string | null = null;
    try {
      token = await this.getServerToken();
    } catch (error) {
      console.warn('Erro ao obter token de servidor para getPoll:', error);
      token = null;
    }
    
    if (token) {
      return this.makeRequest<unknown>(
        'GET',
        `/v3/polls/${pollId}`,
        undefined,
        {
          useApiKey: false,
          bearerToken: token,
        }
      );
    }

    return {
      success: false,
      error: 'Token de autenticação necessário para buscar dados de poll',
    };
  }

  async votePoll(
    pollId: string,
    answerIds: string[],
    userAccessToken: string
  ): Promise<SocialPlusResponse<unknown>> {
    if (!userAccessToken) {
      return {
        success: false,
        error: 'User access token is required to vote in poll.',
      };
    }

    if (!answerIds || answerIds.length === 0) {
      return {
        success: false,
        error: 'At least one answer ID is required to vote.',
      };
    }

    const putResponse = await this.makeRequest<unknown>(
      'PUT',
      `/v3/polls/${pollId}/votes`,
      { answerIds },
      {
        useApiKey: false,
        bearerToken: userAccessToken,
      }
    );

    if (putResponse.success) {
      return putResponse;
    }

    console.warn(`[SocialPlus] PUT falhou para votePoll, tentando POST: ${putResponse.error}`);
    
    return this.makeRequest<unknown>(
      'POST',
      `/v3/polls/${pollId}/votes`,
      { answerIds },
      {
        useApiKey: false,
        bearerToken: userAccessToken,
      }
    );
  }

  async addCommentReaction(
    commentId: string,
    reactionName: string,
    userAccessToken: string
  ): Promise<SocialPlusResponse<unknown>> {
    if (!userAccessToken) {
      return {
        success: false,
        error: 'Token de autenticação do usuário é obrigatório para reagir a comentários.',
      };
    }

    if (!reactionName || reactionName.trim() === '') {
      return {
        success: false,
        error: 'reactionName é obrigatório.',
      };
    }

    return this.makeRequest<unknown>(
      'POST',
      `/v3/comments/${commentId}/reactions`,
      { reaction: reactionName },
      {
        useApiKey: false,
        bearerToken: userAccessToken,
      }
    );
  }

  async removeCommentReaction(
    commentId: string,
    reactionName: string,
    userAccessToken: string
  ): Promise<SocialPlusResponse<unknown>> {
    if (!userAccessToken) {
      return {
        success: false,
        error: 'Token de autenticação do usuário é obrigatório para remover reações.',
      };
    }

    if (!reactionName || reactionName.trim() === '') {
      return {
        success: false,
        error: 'reactionName é obrigatório.',
      };
    }

    return this.makeRequest<unknown>(
      'DELETE',
      `/v3/comments/${commentId}/reactions/${reactionName}`,
      undefined,
      {
        useApiKey: false,
        bearerToken: userAccessToken,
      }
    );
  }

  async getUserFeed(params?: GetUserFeedParams): Promise<SocialPlusResponse<unknown>> {
    const queryParams = new URLSearchParams();
    // A API v4 do Amity (/v4/me/global-feeds) não aceita parâmetros de query
    // Todos os parâmetros devem ser enviados via headers ou não são suportados
    // Removemos todos os query params para evitar erro de validação
    
    // Nota: O parâmetro 'search' também não é suportado pela API v4
    // A busca deve ser feita localmente após receber os dados

    if (!this.apiKey) {
      return {
        success: false,
        error: 'Social.plus API key não configurado. Configure SOCIAL_PLUS_API_KEY nas variáveis de ambiente.',
      };
    }

    const query = queryParams.toString();
    console.log('[SocialPlus] getUserFeed chamado - query params removidos para evitar erro de validação da API');

    if (params?.userAccessToken) {
      console.log('[SocialPlus] Usando token de usuário para getUserFeed');
      return this.makeRequest<unknown>(
        'GET',
        `/v4/me/global-feeds${query ? `?${query}` : ''}`,
        undefined,
        {
          useApiKey: true,
          bearerToken: params.userAccessToken,
        }
      );
    }

    let token: string | null = null;
    try {
      token = await this.getServerToken();
    } catch (error) {
      console.warn('Erro ao obter token de servidor, usando API key diretamente:', error);
      token = null;
    }
    
    if (token) {
      console.log('[SocialPlus] Usando token de servidor para getUserFeed');
      return this.makeRequest<unknown>(
        'GET',
        `/v4/me/global-feeds${query ? `?${query}` : ''}`,
        undefined,
        {
          useApiKey: true,
          bearerToken: token,
        }
      );
    }

    console.log('[SocialPlus] Usando API key diretamente para getUserFeed');
    return this.makeRequest<unknown>(
      'GET',
      `/v4/me/global-feeds${query ? `?${query}` : ''}`,
      undefined,
      {
        useApiKey: true,
      }
    );
  }
}

export const socialPlusClient = new SocialPlusClient();

