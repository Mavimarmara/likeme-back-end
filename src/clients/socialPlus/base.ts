import { config } from '@/config';

export interface SocialPlusResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Constructor<T = object> = new (...args: any[]) => T;

export class SocialPlusBase {
  readonly apiKey: string;
  readonly serverKey: string;
  readonly baseUrl: string;
  readonly region: string;
  readonly tokenTtlMs: number;
  #tokenCache: { token: string; expiresAt: number } | null = null;

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

  buildUrl(endpoint: string): string {
    if (endpoint.startsWith('http')) return endpoint;
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    return `${this.baseUrl}${cleanEndpoint}`;
  }

  async makeRequest<T>(
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

      const fetchOptions: RequestInit = { method, headers: defaultHeaders };
      if (body && method !== 'GET') {
        fetchOptions.body = JSON.stringify(body);
      }

      console.log('[SocialPlus] Making request:', { method, url, headers: defaultHeaders, hasBody: !!body });

      const response = await fetch(url, fetchOptions);
      const contentType = response.headers.get('content-type');
      const data = contentType?.includes('application/json')
        ? ((await response.json()) as unknown)
        : await response.text();

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
          status: response.status, statusText: response.statusText,
          error: errorMessage, url, method, fullData: data,
        });
        return { success: false, error: errorMessage, message: errorDataMessage };
      }

      if (typeof data === 'string') {
        return { success: true, data: data as unknown as T };
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

      const finalData =
        data && typeof data === 'object' && 'data' in data && (data as { data?: unknown }).data
          ? (data as { data: unknown }).data
          : data;

      return { success: true, data: finalData as T };
    } catch (error) {
      console.error('Social.plus API error:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  async generateServerToken(userId?: string, forceRefresh = false): Promise<string> {
    if (!this.serverKey) {
      throw new Error('Social.plus server key not configured');
    }

    const cacheValid = this.#tokenCache && this.#tokenCache.expiresAt > Date.now();
    if (!forceRefresh && cacheValid && this.#tokenCache) {
      return this.#tokenCache.token;
    }

    const serverUserId = userId || 'server';
    const url = this.buildUrl('/v4/authentication/token');
    console.log('[SocialPlus] Generating server token, URL:', url, 'userId:', serverUserId);

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-server-key': this.serverKey },
      body: JSON.stringify({ userId: serverUserId }),
    });

    const text = await response.text();
    if (!response.ok) {
      console.error('[SocialPlus] Erro ao gerar token de servidor:', {
        status: response.status, statusText: response.statusText, responseBody: text,
        hasServerKey: !!this.serverKey, serverKeyLength: this.serverKey?.length || 0,
      });
      throw new Error(text || `HTTP ${response.status}`);
    }

    const token = text.replace(/(^"|"$)/g, '').trim();
    this.#tokenCache = { token, expiresAt: Date.now() + 5 * 60 * 1000 };
    console.log('[SocialPlus] Server token generated and cached');
    return token;
  }

  async getServerToken(forceRefresh = false): Promise<string | null> {
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
        (errorMessage.includes('server key') &&
          (errorMessage.includes('invalid') || errorMessage.includes('unauthorized') || errorMessage.includes('forbidden'))) ||
        errorMessage.includes('401') ||
        errorMessage.includes('403');

      if (isInvalidServerKey) {
        console.warn('Server key inválido ou não autorizado. Usando API key diretamente como fallback.');
        console.warn('Verifique se SOCIAL_PLUS_SERVER_KEY está configurada corretamente no arquivo .env');
        return null;
      }
      console.error('Erro ao obter token da social.plus:', error);
      return null;
    }
  }

  /**
   * Common pattern: try user token → server token → api key only.
   */
  async requestWithFallback<T>(
    method: string,
    endpoint: string,
    userAccessToken?: string,
    requestOptions?: { useApiKey?: boolean; body?: unknown }
  ): Promise<SocialPlusResponse<T>> {
    const useApiKey = requestOptions?.useApiKey ?? true;

    if (userAccessToken) {
      return this.makeRequest<T>(method, endpoint, requestOptions?.body, {
        useApiKey,
        bearerToken: userAccessToken,
      });
    }

    let token: string | null = null;
    try {
      token = await this.getServerToken();
    } catch (error) {
      console.warn(`Erro ao obter token de servidor para ${endpoint}:`, error);
      token = null;
    }

    if (token) {
      return this.makeRequest<T>(method, endpoint, requestOptions?.body, {
        useApiKey,
        bearerToken: token,
      });
    }

    return this.makeRequest<T>(method, endpoint, requestOptions?.body, { useApiKey });
  }
}
