import { SocialPlusBase, SocialPlusResponse, Constructor } from './base';

export function PollMixin<T extends Constructor<SocialPlusBase>>(Base: T) {
  return class extends Base {
    async getPoll(pollId: string, userAccessToken?: string): Promise<SocialPlusResponse<unknown>> {
      if (!this.apiKey) {
        return { success: false, error: 'Social.plus API key não configurado. Configure SOCIAL_PLUS_API_KEY nas variáveis de ambiente.' };
      }
      return this.requestWithFallback<unknown>('GET', `/v3/polls/${pollId}`, userAccessToken, {
        useApiKey: false,
      });
    }

    async votePoll(
      pollId: string,
      answerIds: string[],
      userAccessToken: string
    ): Promise<SocialPlusResponse<unknown>> {
      if (!userAccessToken) {
        return { success: false, error: 'User access token is required to vote in poll.' };
      }
      if (!answerIds || answerIds.length === 0) {
        return { success: false, error: 'At least one answer ID is required to vote.' };
      }

      const putResponse = await this.makeRequest<unknown>(
        'PUT',
        `/v3/polls/${pollId}/votes`,
        { answerIds },
        { useApiKey: false, bearerToken: userAccessToken }
      );

      if (putResponse.success) return putResponse;

      console.warn(`[SocialPlus] PUT falhou para votePoll, tentando POST: ${putResponse.error}`);
      return this.makeRequest<unknown>(
        'POST',
        `/v3/polls/${pollId}/votes`,
        { answerIds },
        { useApiKey: false, bearerToken: userAccessToken }
      );
    }
  };
}
