import { SocialPlusBase, SocialPlusResponse, Constructor } from './base';

export interface GetUserFeedParams {
  page?: number;
  limit?: number;
  userAccessToken?: string;
  search?: string;
}

export function FeedMixin<T extends Constructor<SocialPlusBase>>(Base: T) {
  return class extends Base {
    async getUserFeed(params?: GetUserFeedParams): Promise<SocialPlusResponse<unknown>> {
      if (!this.apiKey) {
        return { success: false, error: 'Social.plus API key não configurado. Configure SOCIAL_PLUS_API_KEY nas variáveis de ambiente.' };
      }
      console.log('[SocialPlus] getUserFeed chamado - query params removidos para evitar erro de validação da API');
      return this.requestWithFallback<unknown>('GET', '/v4/me/global-feeds', params?.userAccessToken);
    }
  };
}
