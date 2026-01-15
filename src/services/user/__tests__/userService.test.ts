import { userService, UserService } from '@/services/user/userService';
import prisma from '@/config/database';
import { socialPlusClient, SocialPlusUser } from '@/clients/socialPlus/socialPlusClient';
import { communityService } from '@/services/community/communityService';
import { userTokenService } from '@/services/user/userTokenService';

// Mock das dependências
jest.mock('@/config/database', () => ({
  __esModule: true,
  default: {
    user: {
      update: jest.fn(),
      findUnique: jest.fn(),
    },
  },
}));

jest.mock('@/clients/socialPlus/socialPlusClient', () => ({
  socialPlusClient: {
    createUser: jest.fn(),
  },
}));

jest.mock('@/services/community/communityService', () => ({
  communityService: {
    addUserToAllCommunities: jest.fn(),
  },
}));

jest.mock('@/services/user/userTokenService', () => ({
  userTokenService: {
    getToken: jest.fn(),
  },
}));

describe('UserService', () => {
  let service: UserService;

  beforeEach(() => {
    service = new UserService();
    jest.clearAllMocks();
  });

  describe('createUser', () => {
    const mockUserData: SocialPlusUser = {
      username: 'testuser',
      displayName: 'Test User',
      email: 'test@example.com',
    };

    it('should create user successfully in Social.plus', async () => {
      const mockResponse = {
        success: true,
        data: { id: 'sp_user_123' },
      };

      (socialPlusClient.createUser as jest.Mock).mockResolvedValue(mockResponse);

      const result = await service.createUser(mockUserData);

      expect(result).toEqual({ id: 'sp_user_123' });
      expect(socialPlusClient.createUser).toHaveBeenCalledWith(mockUserData);
    });

    it('should throw error if Social.plus creation fails', async () => {
      const mockResponse = {
        success: false,
        error: 'API error: invalid credentials',
      };

      (socialPlusClient.createUser as jest.Mock).mockResolvedValue(mockResponse);

      await expect(service.createUser(mockUserData)).rejects.toThrow(
        'API error: invalid credentials'
      );
    });

    it('should throw error if Social.plus returns success but no user ID', async () => {
      const mockResponse = {
        success: true,
        data: null,
      };

      (socialPlusClient.createUser as jest.Mock).mockResolvedValue(mockResponse);

      await expect(service.createUser(mockUserData)).rejects.toThrow(
        'Falha ao criar usuário na social.plus'
      );
    });

    it('should throw error if Social.plus returns success but data has no id', async () => {
      const mockResponse = {
        success: true,
        data: { username: 'test' }, // Sem 'id'
      };

      (socialPlusClient.createUser as jest.Mock).mockResolvedValue(mockResponse);

      await expect(service.createUser(mockUserData)).rejects.toThrow(
        'Falha ao criar usuário na social.plus'
      );
    });

    it('should handle network errors from Social.plus', async () => {
      (socialPlusClient.createUser as jest.Mock).mockRejectedValue(
        new Error('Network timeout')
      );

      await expect(service.createUser(mockUserData)).rejects.toThrow('Network timeout');
    });
  });

  describe('createUserAndSyncToDatabase', () => {
    const mockUserData: SocialPlusUser = {
      username: 'testuser',
      displayName: 'Test User',
      email: 'test@example.com',
    };

    const userId = 'local_user_123';
    const socialPlusUserId = 'sp_user_456';

    beforeEach(() => {
      // Mock createUser (método da própria classe)
      jest.spyOn(service, 'createUser').mockResolvedValue({ id: socialPlusUserId });
    });

    it('should create user and sync to database', async () => {
      (prisma.user.update as jest.Mock).mockResolvedValue({
        id: userId,
        socialPlusUserId,
      });

      const result = await service.createUserAndSyncToDatabase(userId, mockUserData);

      expect(result).toEqual({ socialPlusUserId });
      expect(service.createUser).toHaveBeenCalledWith(mockUserData);
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: userId },
        data: { socialPlusUserId },
      });
    });

    it('should update correct user in database', async () => {
      (prisma.user.update as jest.Mock).mockResolvedValue({
        id: userId,
        socialPlusUserId,
      });

      await service.createUserAndSyncToDatabase(userId, mockUserData);

      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: userId },
        data: { socialPlusUserId },
      });
    });

    it('should throw error if Social.plus creation fails', async () => {
      jest.spyOn(service, 'createUser').mockRejectedValue(
        new Error('Social.plus API error')
      );

      await expect(
        service.createUserAndSyncToDatabase(userId, mockUserData)
      ).rejects.toThrow('Social.plus API error');

      expect(prisma.user.update).not.toHaveBeenCalled();
    });

    it('should throw error if database update fails', async () => {
      (prisma.user.update as jest.Mock).mockRejectedValue(
        new Error('Database connection failed')
      );

      await expect(
        service.createUserAndSyncToDatabase(userId, mockUserData)
      ).rejects.toThrow('Database connection failed');
    });

    it('should handle user not found in database', async () => {
      (prisma.user.update as jest.Mock).mockRejectedValue(
        new Error('Record to update not found')
      );

      await expect(
        service.createUserAndSyncToDatabase(userId, mockUserData)
      ).rejects.toThrow('Record to update not found');
    });
  });

  describe('createUserAndAddToCommunities', () => {
    const mockUserData: SocialPlusUser = {
      username: 'testuser',
      displayName: 'Test User',
      email: 'test@example.com',
    };

    const socialPlusUserId = 'sp_user_789';

    beforeEach(() => {
      jest.spyOn(service, 'createUser').mockResolvedValue({ id: socialPlusUserId });
    });

    it('should create user and add to communities successfully', async () => {
      const mockAddResult = {
        added: 5,
        failed: 0,
        errors: [],
      };

      (communityService.addUserToAllCommunities as jest.Mock).mockResolvedValue(
        mockAddResult
      );

      const result = await service.createUserAndAddToCommunities(mockUserData);

      expect(result).toEqual({
        userId: socialPlusUserId,
        communitiesAdded: 5,
        communitiesFailed: 0,
      });

      expect(service.createUser).toHaveBeenCalledWith(mockUserData);
      expect(communityService.addUserToAllCommunities).toHaveBeenCalledWith(
        socialPlusUserId,
        undefined
      );
    });

    it('should handle partial community addition failures', async () => {
      const mockAddResult = {
        added: 3,
        failed: 2,
        errors: ['Community 1 failed', 'Community 2 failed'],
      };

      (communityService.addUserToAllCommunities as jest.Mock).mockResolvedValue(
        mockAddResult
      );

      const result = await service.createUserAndAddToCommunities(mockUserData);

      expect(result).toEqual({
        userId: socialPlusUserId,
        communitiesAdded: 3,
        communitiesFailed: 2,
      });
    });

    it('should handle all communities failing', async () => {
      const mockAddResult = {
        added: 0,
        failed: 5,
        errors: ['All communities failed'],
      };

      (communityService.addUserToAllCommunities as jest.Mock).mockResolvedValue(
        mockAddResult
      );

      const result = await service.createUserAndAddToCommunities(mockUserData);

      expect(result).toEqual({
        userId: socialPlusUserId,
        communitiesAdded: 0,
        communitiesFailed: 5,
      });
    });

    it('should throw error if user creation fails', async () => {
      jest.spyOn(service, 'createUser').mockRejectedValue(
        new Error('Creation failed')
      );

      await expect(
        service.createUserAndAddToCommunities(mockUserData)
      ).rejects.toThrow('Creation failed');

      expect(communityService.addUserToAllCommunities).not.toHaveBeenCalled();
    });

    it('should throw error if community addition fails', async () => {
      (communityService.addUserToAllCommunities as jest.Mock).mockRejectedValue(
        new Error('Community service unavailable')
      );

      await expect(
        service.createUserAndAddToCommunities(mockUserData)
      ).rejects.toThrow('Community service unavailable');
    });
  });

  describe('addUserToAllCommunities', () => {
    const socialPlusUserId = 'sp_user_999';
    const userAccessToken = 'token_abc123';

    it('should add user to communities with provided token', async () => {
      const mockResult = {
        added: 4,
        failed: 1,
        errors: ['Community X failed'],
      };

      (communityService.addUserToAllCommunities as jest.Mock).mockResolvedValue(
        mockResult
      );

      const result = await service.addUserToAllCommunities(
        socialPlusUserId,
        userAccessToken
      );

      expect(result).toEqual(mockResult);
      expect(communityService.addUserToAllCommunities).toHaveBeenCalledWith(
        socialPlusUserId,
        userAccessToken
      );
      expect(userTokenService.getToken).not.toHaveBeenCalled();
    });

    it('should fetch token if not provided', async () => {
      const mockResult = {
        added: 3,
        failed: 0,
        errors: [],
      };

      (userTokenService.getToken as jest.Mock).mockResolvedValue({
        token: 'fetched_token_xyz',
      });

      (communityService.addUserToAllCommunities as jest.Mock).mockResolvedValue(
        mockResult
      );

      const result = await service.addUserToAllCommunities(socialPlusUserId);

      expect(result).toEqual(mockResult);
      expect(userTokenService.getToken).toHaveBeenCalledWith(socialPlusUserId, false);
      expect(communityService.addUserToAllCommunities).toHaveBeenCalledWith(
        socialPlusUserId,
        'fetched_token_xyz'
      );
    });

    it('should throw error if token cannot be fetched', async () => {
      (userTokenService.getToken as jest.Mock).mockResolvedValue({
        token: null,
        error: 'User not synced',
      });

      await expect(
        service.addUserToAllCommunities(socialPlusUserId)
      ).rejects.toThrow(
        'Token de acesso do usuário é obrigatório para adicionar membros às comunidades'
      );

      expect(communityService.addUserToAllCommunities).not.toHaveBeenCalled();
    });

    it('should throw error if token fetch returns null without error', async () => {
      (userTokenService.getToken as jest.Mock).mockResolvedValue({
        token: null,
      });

      await expect(
        service.addUserToAllCommunities(socialPlusUserId)
      ).rejects.toThrow(
        'Token de acesso do usuário é obrigatório para adicionar membros às comunidades'
      );
    });

    it('should handle community service errors', async () => {
      (communityService.addUserToAllCommunities as jest.Mock).mockRejectedValue(
        new Error('Service unavailable')
      );

      await expect(
        service.addUserToAllCommunities(socialPlusUserId, userAccessToken)
      ).rejects.toThrow('Service unavailable');
    });

    it('should pass through community service response', async () => {
      const mockResponse = {
        added: 10,
        failed: 0,
        errors: [],
      };

      (communityService.addUserToAllCommunities as jest.Mock).mockResolvedValue(
        mockResponse
      );

      const result = await service.addUserToAllCommunities(
        socialPlusUserId,
        userAccessToken
      );

      expect(result).toBe(mockResponse);
    });
  });

  describe('Integration Scenarios', () => {
    it('should handle full user creation flow', async () => {
      const userData: SocialPlusUser = {
        username: 'newuser',
        displayName: 'New User',
        email: 'new@example.com',
      };

      // Mock createUser
      jest.spyOn(service, 'createUser').mockResolvedValue({ id: 'sp_new_user' });

      // Mock database update
      (prisma.user.update as jest.Mock).mockResolvedValue({
        id: 'local_new_user',
        socialPlusUserId: 'sp_new_user',
      });

      // Mock community addition
      (communityService.addUserToAllCommunities as jest.Mock).mockResolvedValue({
        added: 5,
        failed: 0,
        errors: [],
      });

      // Execute full flow
      const syncResult = await service.createUserAndSyncToDatabase(
        'local_new_user',
        userData
      );
      const communityResult = await service.addUserToAllCommunities(
        syncResult.socialPlusUserId,
        'test_token'
      );

      expect(syncResult.socialPlusUserId).toBe('sp_new_user');
      expect(communityResult.added).toBe(5);
    });

    it('should handle retry logic for Social.plus failures', async () => {
      const userData: SocialPlusUser = {
        username: 'retryuser',
        displayName: 'Retry User',
      };

      // First call fails, second succeeds
      (socialPlusClient.createUser as jest.Mock)
        .mockResolvedValueOnce({
          success: false,
          error: 'Temporary error',
        })
        .mockResolvedValueOnce({
          success: true,
          data: { id: 'sp_retry_user' },
        });

      // First attempt should fail
      await expect(service.createUser(userData)).rejects.toThrow('Temporary error');

      // Second attempt should succeed
      const result = await service.createUser(userData);
      expect(result.id).toBe('sp_retry_user');
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty user data', async () => {
      const emptyData: SocialPlusUser = {
        username: '',
      };

      (socialPlusClient.createUser as jest.Mock).mockResolvedValue({
        success: false,
        error: 'Username is required',
      });

      await expect(service.createUser(emptyData)).rejects.toThrow(
        'Username is required'
      );
    });

    it('should handle very long usernames', async () => {
      const longUsername = 'a'.repeat(1000);
      const userData: SocialPlusUser = {
        username: longUsername,
      };

      (socialPlusClient.createUser as jest.Mock).mockResolvedValue({
        success: true,
        data: { id: 'sp_long_user' },
      });

      const result = await service.createUser(userData);
      expect(result.id).toBe('sp_long_user');
    });

    it('should handle special characters in user data', async () => {
      const userData: SocialPlusUser = {
        username: 'user@#$%',
        displayName: 'José María Ñoño',
        email: 'josé@example.com',
      };

      (socialPlusClient.createUser as jest.Mock).mockResolvedValue({
        success: true,
        data: { id: 'sp_special_user' },
      });

      const result = await service.createUser(userData);
      expect(result.id).toBe('sp_special_user');
    });
  });
});

