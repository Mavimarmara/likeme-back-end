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
    // Primeiro, gerar o access token para o usuário
    const accessToken = await createUserAccessToken(userId);

    if (!accessToken) {
      console.warn('Não foi possível gerar access token. Tentando login sem token.');
    }

    // Tentar inicializar o cliente, mas não falhar se a API key não for válida para o SDK
    if (!isInitialized || !amityClient) {
      try {
        await initializeAmityClient();
      } catch (initError: any) {
        // Se a API key não for válida para o SDK, apenas logar e continuar
        if (initError?.code === 400100 || initError?.message?.includes('API Key is not usable')) {
          console.warn('Amity SDK: API Key não é utilizável para o SDK. Continuando sem login no SDK.');
          return accessToken ? { userId, accessToken } : null;
        }
        throw initError;
      }
    }

    if (!amityClient) {
      console.warn('Amity client não disponível. Login não será realizado.');
      return accessToken ? { userId, accessToken } : null;
    }

    // Dynamic import para evitar erro se o pacote não estiver instalado
    // @ts-ignore - Pacote pode não estar instalado ainda
    const amityModule = await import('@amityco/ts-sdk').catch(() => null);
    
    if (!amityModule) {
      console.warn('Amity SDK não encontrado. Execute: npm install @amityco/ts-sdk');
      return accessToken ? { userId, accessToken } : null;
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
      // Se o erro for relacionado à API key não ser utilizável, apenas logar e retornar o access token
      if (loginError?.code === 400100 || loginError?.message?.includes('API Key is not usable')) {
        console.warn(`Amity SDK: API Key não é utilizável para login do usuário ${userId}. Retornando apenas access token.`);
        return accessToken ? { userId, accessToken } : null;
      }
      throw loginError;
    }
  } catch (error) {
    console.error(`Erro ao fazer login no Amity para usuário ${userId}:`, error);
    // Tenta retornar pelo menos o access token se foi gerado
    try {
      const accessToken = await createUserAccessToken(userId).catch(() => null);
      return accessToken ? { userId, accessToken } : null;
    } catch {
      return null;
    }
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
    if (!config.socialPlus.apiKey || !config.socialPlus.region) {
      console.warn('Amity: API Key ou Region não configurados. Token não será gerado.');
      return null;
    }

    // Inicializar cliente antes de gerar token (necessário para o SDK)
    if (!isInitialized || !amityClient) {
      await initializeAmityClient();
    }

    // Dynamic import para evitar erro se o pacote não estiver instalado
    // @ts-ignore - Pacote pode não estar instalado ainda
    const amityModule = await import('@amityco/ts-sdk').catch(() => null);
    
    if (!amityModule) {
      console.warn('Amity SDK não encontrado. Execute: npm install @amityco/ts-sdk');
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

    console.log(`Access token gerado com sucesso para o usuário ${userId}`);
    return accessToken;
  } catch (error) {
    console.error(`Erro ao gerar access token para usuário ${userId}:`, error);
    return null;
  }
};

