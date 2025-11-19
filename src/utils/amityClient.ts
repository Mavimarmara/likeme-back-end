import { config } from '@/config';

let amityClient: any = null;
let isInitialized = false;

interface AmitySessionHandler {
  sessionWillRenewAccessToken(renewal: { renew: () => void }): void;
}

const sessionHandler: AmitySessionHandler = {
  sessionWillRenewAccessToken(renewal) {
    renewal.renew();
  },
};

export const initializeAmityClient = async (): Promise<void> => {
  if (isInitialized && amityClient) {
    return;
  }

  try {
    // Dynamic import para evitar erro se o pacote não estiver instalado
    // @ts-ignore - Pacote pode não estar instalado ainda
    const amityModule = await import('@amityco/ts-sdk').catch(() => null);
    
    if (!amityModule) {
      console.warn('Amity SDK não encontrado. Execute: npm install @amityco/ts-sdk');
      return;
    }

    const { Client } = amityModule;

    if (!config.socialPlus.apiKey || !config.socialPlus.region) {
      console.warn('Amity: API Key ou Region não configurados. Cliente não será inicializado.');
      return;
    }

    try {
      amityClient = Client.createClient(config.socialPlus.apiKey, config.socialPlus.region);
      isInitialized = true;
      console.log('Amity client inicializado com sucesso');
    } catch (createError: any) {
      // Se a API key não for válida para o SDK, apenas logar e não inicializar
      if (createError?.code === 400100 || createError?.message?.includes('API Key is not usable')) {
        console.warn('Amity SDK: API Key não é utilizável para o SDK. O cliente não será inicializado, mas a API REST continuará funcionando.');
        isInitialized = false;
        amityClient = null;
        return;
      }
      throw createError;
    }
  } catch (error) {
    console.error('Erro ao inicializar Amity client:', error);
    // Não lança erro para não bloquear a aplicação
    isInitialized = false;
    amityClient = null;
  }
};

export const loginToAmity = async (
  userId: string,
  displayName: string
): Promise<{ userId: string; accessToken: string | null } | null> => {
  try {
    // Primeiro, tentar gerar o access token para o usuário (pode falhar se API key não for válida para SDK)
    let accessToken: string | null = null;
    try {
      accessToken = await createUserAccessToken(userId);
    } catch (tokenError: any) {
      // Se falhar, não é crítico - o sistema pode funcionar sem o token
      if (tokenError?.code === 400100 || tokenError?.message?.includes('API Key is not usable')) {
        console.warn(`Amity SDK: API Key não é utilizável para gerar token do usuário ${userId}. O sistema continuará funcionando, mas o token não será gerado.`);
      } else {
        console.warn(`Erro ao gerar access token para usuário ${userId}:`, tokenError?.message || tokenError);
      }
    }

    // Tentar inicializar o cliente, mas não falhar se a API key não for válida para o SDK
    if (!isInitialized || !amityClient) {
      try {
        await initializeAmityClient();
      } catch (initError: any) {
        // Se a API key não for válida para o SDK, apenas logar e continuar
        if (initError?.code === 400100 || initError?.message?.includes('API Key is not usable')) {
          console.warn('Amity SDK: API Key não é utilizável para o SDK. Continuando sem login no SDK.');
          // Retornar o userId mesmo sem token - o sistema pode funcionar sem o SDK
          return { userId, accessToken };
        }
        console.warn('Erro ao inicializar Amity client:', initError?.message || initError);
        return { userId, accessToken };
      }
    }

    if (!amityClient) {
      console.warn('Amity client não disponível. Login não será realizado no SDK, mas o sistema continuará funcionando.');
      return { userId, accessToken };
    }

    // Dynamic import para evitar erro se o pacote não estiver instalado
    // @ts-ignore - Pacote pode não estar instalado ainda
    const amityModule = await import('@amityco/ts-sdk').catch(() => null);
    
    if (!amityModule) {
      console.warn('Amity SDK não encontrado. Execute: npm install @amityco/ts-sdk');
      return { userId, accessToken };
    }

    const { Client } = amityModule;

    try {
      const loginResult: any = await Client.login({ userId, displayName }, sessionHandler);

      // Verificar se o login retornou um userId (pode ser diferente do que passamos)
      const returnedUserId = loginResult?.userId || loginResult?.user?.userId || userId;

      console.log(`Usuário ${userId} (${displayName}) logado no Amity com sucesso. UserId retornado: ${returnedUserId}`);

      // Retornar o userId retornado pelo Amity e o access token
      return {
        userId: returnedUserId || userId,
        accessToken,
      };
    } catch (loginError: any) {
      // Se o erro for relacionado à API key não ser utilizável, apenas logar e retornar o userId
      if (loginError?.code === 400100 || loginError?.message?.includes('API Key is not usable')) {
        console.warn(`Amity SDK: API Key não é utilizável para login do usuário ${userId}. O sistema continuará funcionando sem o SDK.`);
        return { userId, accessToken };
      }
      // Para outros erros, logar mas não falhar
      console.warn(`Erro ao fazer login no SDK para usuário ${userId}:`, loginError?.message || loginError);
      return { userId, accessToken };
    }
  } catch (error: any) {
    // Não falhar o fluxo de autenticação por causa do Amity
    console.error(`Erro ao fazer login no Amity para usuário ${userId}:`, error?.message || error);
    // Retornar o userId mesmo sem token - o sistema pode funcionar sem o Amity SDK
    return { userId, accessToken: null };
  }
};

export const getAmityClient = () => {
  return amityClient;
};

export const isAmityReady = () => {
  return isInitialized && amityClient !== null;
};

const mapRegionToApiRegion = (region: string): string => {
  const regionMap: Record<string, string> = {
    US: 'US',
    EU: 'EU',
    SG: 'SG',
  };
  return regionMap[region.toUpperCase()] || 'US';
};

export const createUserAccessToken = async (userId: string): Promise<string | null> => {
  try {
    // PRIORIDADE: Usar Server Key via API REST (método recomendado e seguro)
    if (config.socialPlus.serverKey) {
      try {
        const token = await createUserAccessTokenViaREST(userId);
        if (token) {
          return token;
        }
      } catch (restError: any) {
        console.warn(`Erro ao gerar token via REST com server key: ${restError?.message || restError}. Tentando SDK como fallback.`);
      }
    }

    // Fallback: Tentar usar o SDK (pode não funcionar se API key não for válida para SDK)
    if (!config.socialPlus.apiKey || !config.socialPlus.region) {
      console.warn('Amity: API Key ou Region não configurados. Token não será gerado.');
      return null;
    }

    try {
      // Inicializar cliente antes de gerar token (necessário para o SDK)
      if (!isInitialized || !amityClient) {
        await initializeAmityClient();
      }

      // Dynamic import para evitar erro se o pacote não estiver instalado
      // @ts-ignore - Pacote pode não estar instalado ainda
      const amityModule = await import('@amityco/ts-sdk').catch(() => null);
      
      if (!amityModule) {
        console.warn('Amity SDK não encontrado. Token não será gerado.');
        return null;
      }

      const { createUserToken, API_REGIONS } = amityModule;
      const apiRegion = mapRegionToApiRegion(config.socialPlus.region);
      const regionConstant = API_REGIONS[apiRegion as keyof typeof API_REGIONS] || API_REGIONS.US;

      const { accessToken } = await createUserToken(
        config.socialPlus.apiKey,
        regionConstant,
        { userId }
      );

      console.log(`Access token gerado com sucesso via SDK para o usuário ${userId}`);
      return accessToken;
    } catch (sdkError: any) {
      // Se o erro for relacionado à API key não ser utilizável para o SDK, apenas logar
      if (sdkError?.code === 400100 || sdkError?.message?.includes('API Key is not usable')) {
        console.warn(`Amity SDK: API Key não é utilizável para o SDK (código: ${sdkError?.code}). Use Server Key para gerar tokens.`);
        return null;
      }
      // Se for outro erro do SDK, logar e retornar null
      console.warn(`Erro ao gerar token via SDK (${sdkError?.code || sdkError?.message}):`, sdkError);
      return null;
    }
  } catch (error) {
    console.error(`Erro ao gerar access token para usuário ${userId}:`, error);
    return null;
  }
};

/**
 * Gera access token usando a API REST do Social.plus/Amity com Server Key
 * Este é o método recomendado e seguro para gerar tokens de usuário
 */
const createUserAccessTokenViaREST = async (userId: string): Promise<string | null> => {
  try {
    if (!config.socialPlus.serverKey) {
      console.warn('[Amity REST] Server key não configurada. Configure SOCIAL_PLUS_SERVER_KEY no arquivo .env');
      return null;
    }

    // Obter token de servidor usando server key
    const { socialPlusClient } = await import('@/utils/socialPlus');
    const serverToken = await socialPlusClient.getServerTokenPublic();

    if (!serverToken) {
      console.warn('[Amity REST] Não foi possível obter token de servidor. Verifique se SOCIAL_PLUS_SERVER_KEY está correta.');
      return null;
    }

    // Gerar token de usuário usando o token de servidor
    // O endpoint correto é /v4/authentication/token com userId no body
    const baseUrl = config.socialPlus.baseUrl.replace(/\/$/, '');
    const url = `${baseUrl}/v4/authentication/token`;

    console.log(`[Amity REST] Gerando token de usuário para ${userId} usando server token`);

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${serverToken}`,
        'X-API-Key': config.socialPlus.apiKey, // Manter API key também (modo seguro)
        'X-Region': config.socialPlus.region,
      },
      body: JSON.stringify({ userId }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[Amity REST] Erro ao gerar token de usuário: ${response.status} - ${errorText}`);
      return null;
    }

    const tokenText = await response.text();
    const accessToken = tokenText.replace(/(^"|"$)/g, '').trim();

    console.log(`[Amity REST] Token de usuário gerado com sucesso para ${userId}`);
    return accessToken;
  } catch (error) {
    console.error('[Amity REST] Erro ao gerar token de usuário via REST:', error);
    return null;
  }
};

