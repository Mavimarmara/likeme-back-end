import { socialPlusClient, SocialPlusUser } from '@/clients/socialPlus/socialPlusClient';
import { communityService } from '../community/communityService';
import { userTokenService } from './userTokenService';
import { getUserRepository } from '@/utils/repositoryContainer';
import type { UserRepository } from '@/repositories';

export class UserService {
  private userRepository: UserRepository;

  constructor(userRepository?: UserRepository) {
    this.userRepository = userRepository || getUserRepository();
  }
  async createUser(userData: SocialPlusUser): Promise<{ id: string }> {
    const response = await socialPlusClient.createUser(userData);
    
    if (!response.success || !response.data?.id) {
      throw new Error(response.error || 'Falha ao criar usuário na social.plus');
    }
    
    return { id: response.data.id };
  }

  async createUserAndSyncToDatabase(
    userId: string,
    userData: SocialPlusUser
  ): Promise<{ socialPlusUserId: string }> {
    const createResponse = await this.createUser(userData);
    const socialPlusUserId = createResponse.id;

    await this.userRepository.update(userId, { socialPlusUserId });

    return { socialPlusUserId };
  }

  async createUserAndAddToCommunities(
    userData: SocialPlusUser
  ): Promise<{ userId: string; communitiesAdded: number; communitiesFailed: number }> {
    const createResponse = await this.createUser(userData);
    const userId = createResponse.id;

    const tokenResult = await userTokenService.getToken(userId, true);
    if (!tokenResult.token) {
      throw new Error(tokenResult.error || 'Não foi possível obter token do usuário');
    }

    const addResult = await communityService.addUserToAllCommunities(userId, tokenResult.token);

    return {
      userId,
      communitiesAdded: addResult.added,
      communitiesFailed: addResult.failed,
    };
  }

  async addUserToAllCommunities(
    socialPlusUserId: string,
    userAccessToken?: string
  ): Promise<{ added: number; failed: number; errors: string[] }> {
    if (!userAccessToken) {
      const tokenResult = await userTokenService.getToken(socialPlusUserId, false);
      if (!tokenResult.token) {
        throw new Error('Token de acesso do usuário é obrigatório para adicionar membros às comunidades');
      }
      userAccessToken = tokenResult.token;
    }

    return communityService.addUserToAllCommunities(socialPlusUserId, userAccessToken);
  }
}

export const userService = new UserService();

