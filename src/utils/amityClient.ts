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

    amityClient = Client.createClient(config.socialPlus.apiKey, config.socialPlus.region);
    isInitialized = true;

    console.log('Amity client inicializado com sucesso');
  } catch (error) {
    console.error('Erro ao inicializar Amity client:', error);
    // Não lança erro para não bloquear a aplicação
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

    if (!isInitialized || !amityClient) {
      await initializeAmityClient();
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

    const loginResult: any = await Client.login({ userId, displayName }, sessionHandler);

    // Verificar se o login retornou um userId (pode ser diferente do que passamos)
    const returnedUserId = loginResult?.userId || loginResult?.user?.userId || userId;

    console.log(`Usuário ${userId} (${displayName}) logado no Amity com sucesso. UserId retornado: ${returnedUserId}`);

    // Retornar o userId retornado pelo Amity e o access token
    return {
      userId: returnedUserId || userId,
      accessToken,
    };
  } catch (error) {
    console.error(`Erro ao fazer login no Amity para usuário ${userId}:`, error);
    // Tenta retornar pelo menos o access token se foi gerado
    const accessToken = await createUserAccessToken(userId).catch(() => null);
    return accessToken ? { userId, accessToken } : null;
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

