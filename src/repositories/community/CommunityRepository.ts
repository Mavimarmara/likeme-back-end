export interface CommunityRepository {
  save(data: CreateCommunityData): Promise<{ id: string }>;
  findById(id: string): Promise<CommunityData | null>;
  findAll(): Promise<CommunityData[]>;
  findByName(name: string): Promise<CommunityData | null>;
  update(id: string, data: UpdateCommunityData): Promise<void>;
  delete(id: string): Promise<void>;
  addMember(communityId: string, userId: string, role?: string): Promise<void>;
  removeMember(communityId: string, userId: string): Promise<void>;
  findMembers(communityId: string): Promise<CommunityMemberData[]>;
}

export interface CreateCommunityData {
  name: string;
  description?: string;
  type: string;
  avatar?: string;
  socialPlusCommunityId?: string;
  createdBy: string;
}

export interface CommunityData {
  id: string;
  name: string;
  description: string | null;
  type: string;
  avatar: string | null;
  socialPlusCommunityId: string | null;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface UpdateCommunityData {
  name?: string;
  description?: string;
  type?: string;
  avatar?: string;
  socialPlusCommunityId?: string;
}

export interface CommunityMemberData {
  id: string;
  communityId: string;
  userId: string;
  role: string;
  joinedAt: Date;
  user: {
    id: string;
    username: string | null;
  };
}
