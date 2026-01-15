import prisma from '@/config/database';
import type {
  CommunityRepository,
  CreateCommunityData,
  CommunityData,
  UpdateCommunityData,
  CommunityMemberData,
} from './CommunityRepository';

export class PrismaCommunityRepository implements CommunityRepository {
  async save(data: CreateCommunityData): Promise<{ id: string }> {
    const community = await prisma.community.create({
      data: {
        name: data.name,
        description: data.description,
        type: data.type,
        avatar: data.avatar,
        socialPlusCommunityId: data.socialPlusCommunityId,
        createdBy: data.createdBy,
      },
      select: { id: true },
    });

    return { id: community.id };
  }

  async findById(id: string): Promise<CommunityData | null> {
    const community = await prisma.community.findUnique({
      where: { id },
    });

    return community ? this.mapToCommunityData(community) : null;
  }

  async findAll(): Promise<CommunityData[]> {
    const communities = await prisma.community.findMany({
      orderBy: { createdAt: 'desc' },
    });

    return communities.map((c) => this.mapToCommunityData(c));
  }

  async findByName(name: string): Promise<CommunityData | null> {
    const community = await prisma.community.findFirst({
      where: { name },
    });

    return community ? this.mapToCommunityData(community) : null;
  }

  async update(id: string, data: UpdateCommunityData): Promise<void> {
    await prisma.community.update({
      where: { id },
      data: {
        name: data.name,
        description: data.description,
        type: data.type,
        avatar: data.avatar,
        socialPlusCommunityId: data.socialPlusCommunityId,
      },
    });
  }

  async delete(id: string): Promise<void> {
    await prisma.community.delete({
      where: { id },
    });
  }

  async addMember(communityId: string, userId: string, role: string = 'member'): Promise<void> {
    await prisma.communityMember.create({
      data: {
        communityId,
        userId,
        role,
      },
    });
  }

  async removeMember(communityId: string, userId: string): Promise<void> {
    await prisma.communityMember.deleteMany({
      where: {
        communityId,
        userId,
      },
    });
  }

  async findMembers(communityId: string): Promise<CommunityMemberData[]> {
    const members = await prisma.communityMember.findMany({
      where: { communityId },
      include: {
        user: {
          select: {
            id: true,
            username: true,
          },
        },
      },
    });

    return members.map((m) => ({
      id: m.id,
      communityId: m.communityId,
      userId: m.userId,
      role: m.role,
      joinedAt: m.createdAt,
      user: {
        id: m.user.id,
        username: m.user.username,
      },
    }));
  }

  private mapToCommunityData(community: any): CommunityData {
    return {
      id: community.id,
      name: community.name,
      description: community.description,
      type: community.type,
      avatar: community.avatar,
      socialPlusCommunityId: community.socialPlusCommunityId,
      createdBy: community.createdBy,
      createdAt: community.createdAt,
      updatedAt: community.updatedAt,
    };
  }
}
