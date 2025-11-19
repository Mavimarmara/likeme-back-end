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
      console.log(`[Amity] Tentando gerar token de usuário ${userId} usando Server Key via REST API`);
      const token = await createUserAccessTokenViaREST(userId);
      if (token) {
        console.log(`[Amity] Token de usuário gerado com sucesso via Server Key para ${userId}`);
        return token;
      }
      // Se Server Key está configurada mas falhou, não tentar SDK (Server Key é o método correto)
      console.warn(`[Amity] Server Key configurada mas não foi possível gerar token. Verifique se SOCIAL_PLUS_SERVER_KEY está correta.`);
      return null;
    }

    // Se Server Key não está configurada, tentar SDK como fallback (não recomendado)
    console.warn('[Amity] Server Key não configurada. Tentando SDK como fallback (não recomendado). Configure SOCIAL_PLUS_SERVER_KEY para usar o método seguro.');
    
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

      console.log(`[Amity] Access token gerado com sucesso via SDK para o usuário ${userId}`);
      return accessToken;
    } catch (sdkError: any) {
      // Se o erro for relacionado à API key não ser utilizável para o SDK
      if (sdkError?.code === 400100 || sdkError?.message?.includes('API Key is not usable')) {
        console.warn(`[Amity] API Key não é utilizável para o SDK (código: ${sdkError?.code}). Configure SOCIAL_PLUS_SERVER_KEY para usar o método correto.`);
        return null;
      }
      // Se for outro erro do SDK, logar e retornar null
      console.warn(`[Amity] Erro ao gerar token via SDK (${sdkError?.code || sdkError?.message}):`, sdkError);
      return null;
    }
  } catch (error) {
    console.error(`[Amity] Erro ao gerar access token para usuário ${userId}:`, error);
    return null;
  }
};

/**
 * Gera access token usando a API REST do Social.plus/Amity com Server Key
 * Seguindo a documentação oficial:
 * 1. GET /v3/authentication/token?userId=<userId> com x-server-key header
 * 2. POST /v3/sessions com o authToken obtido
 */
const createUserAccessTokenViaREST = async (userId: string): Promise<string | null> => {
  try {
    if (!config.socialPlus.serverKey) {
      console.warn('[Amity REST] Server key não configurada. Configure SOCIAL_PLUS_SERVER_KEY no arquivo .env');
      return null;
    }

    if (!config.socialPlus.apiKey) {
      console.warn('[Amity REST] API key não configurada. Configure SOCIAL_PLUS_API_KEY no arquivo .env');
      return null;
    }

    const baseUrl = config.socialPlus.baseUrl.replace(/\/$/, '');

    // Passo 1: Obter token de autenticação usando server key
    // GET /v3/authentication/token?userId=<userId> com header x-server-key
    const authTokenUrl = `${baseUrl}/v3/authentication/token?userId=${encodeURIComponent(userId)}`;
    
    console.log(`[Amity REST] Passo 1: Obtendo token de autenticação para ${userId}`);

    const authResponse = await fetch(authTokenUrl, {
      method: 'GET',
      headers: {
        'x-server-key': config.socialPlus.serverKey,
      },
    });

    if (!authResponse.ok) {
      const errorText = await authResponse.text();
      console.error(`[Amity REST] Erro ao obter token de autenticação: ${authResponse.status} - ${errorText}`);
      console.error(`[Amity REST] URL: ${authTokenUrl}, hasServerKey: ${!!config.socialPlus.serverKey}`);
      return null;
    }

    const authTokenText = await authResponse.text();
    const authToken = authTokenText.replace(/(^"|"$)/g, '').trim();

    if (!authToken) {
      console.warn(`[Amity REST] Token de autenticação vazio retornado para ${userId}`);
      return null;
    }

    console.log(`[Amity REST] Token de autenticação obtido com sucesso (${authToken.length} caracteres)`);

    // Passo 2: Criar sessão usando o token de autenticação
    // POST /v3/sessions com authToken no body
    const sessionUrl = `${baseUrl}/v3/sessions`;
    
    console.log(`[Amity REST] Passo 2: Criando sessão para ${userId}`);

    const sessionResponse = await fetch(sessionUrl, {
      method: 'POST',
      headers: {
        'x-api-key': config.socialPlus.apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userId,
        deviceId: 'server',
        authToken,
      }),
    });

    if (!sessionResponse.ok) {
      const errorText = await sessionResponse.text();
      console.error(`[Amity REST] Erro ao criar sessão: ${sessionResponse.status} - ${errorText}`);
      return null;
    }

    const sessionData: any = await sessionResponse.json();
    
    // O accessToken pode estar em sessionData.accessToken ou sessionData.token
    const accessToken = sessionData?.accessToken || sessionData?.token || authToken;

    if (!accessToken) {
      console.warn(`[Amity REST] Access token não encontrado na resposta da sessão para ${userId}`);
      // Retornar o authToken como fallback
      return authToken;
    }

    console.log(`[Amity REST] Sessão criada com sucesso para ${userId}, accessToken obtido (${accessToken.length} caracteres)`);
    return accessToken;
  } catch (error) {
    console.error('[Amity REST] Erro ao gerar token de usuário via REST:', error);
    return null;
  }
};

