// Interfaces para resposta do Amity Social API - User Feed

export interface AmityVideoFileId {
  original?: string;
  low?: string;
  medium?: string;
  high?: string;
}

export interface AmityPollAnswer {
  id?: string;
  data?: string;
  dataType?: string;
  voteCount?: number;
  isVotedByUser?: boolean;
  [key: string]: unknown;
}

export interface AmityPollOption {
  optionId?: string;
  text?: string;
  voteCount?: number;
  votes?: number;
  [key: string]: unknown;
}

export interface AmityPoll {
  pollId?: string;
  question?: string;
  title?: string;
  options?: AmityPollOption[];
  answers?: AmityPollAnswer[];
  answerType?: string;
  totalVoteCount?: number;
  totalVotes?: number;
  endedAt?: string;
  endDate?: string;
  closedAt?: string;
  isFinished?: boolean;
  status?: string;
  [key: string]: unknown;
}

export interface AmityPostData {
  title?: string;
  text?: string;
  fileId?: string;
  thumbnailFileId?: string;
  videoFileId?: AmityVideoFileId;
  streamId?: string;
  pollId?: string;
}

export interface AmityHashFlag {
  bits?: number;
  hashes?: number;
  hash?: string[];
}

export interface AmityReactions {
  [key: string]: number;
}

export interface AmityMentionee {
  type: string;
  userIds?: string[];
  userPublicIds?: string[];
  userInternalIds?: string[];
}

export interface AmityPost {
  _id?: string;
  path?: string;
  postId?: string;
  parentPostId?: string;
  postedUserId?: string;
  postedUserPublicId?: string;
  postedUserInternalId?: string;
  publisherId?: string;
  publisherPublicId?: string;
  sharedUserId?: string;
  sharedCount?: number;
  targetId?: string;
  targetPublicId?: string;
  targetInternalId?: string;
  targetType?: 'user' | 'community';
  dataType?: string;
  data?: AmityPostData;
  metadata?: Record<string, unknown>;
  flagCount?: number;
  hashFlag?: AmityHashFlag;
  editedAt?: string;
  createdAt?: string;
  updatedAt?: string;
  reactions?: AmityReactions;
  reactionsCount?: number;
  myReactions?: string[];
  commentsCount?: number;
  comments?: string[];
  children?: string[] | AmityPost[]; // Pode ser array de IDs ou array de posts completos
  childrenNumber?: number;
  isDeleted?: boolean;
  hasFlaggedComment?: boolean;
  hasFlaggedChildren?: boolean;
  feedId?: string;
  tags?: string[];
  hashtags?: string[];
  mentionees?: AmityMentionee[];
  impression?: number;
  reach?: number;
  structureType?: string;
  sequenceNumber?: number;
  pollOptions?: AmityPost[];
}

export interface AmityCommentAttachment {
  type?: string;
  fileId?: string;
}

export interface AmityComment {
  _id?: string;
  path?: string;
  commentId?: string;
  userId?: string;
  userPublicId?: string;
  userInternalId?: string;
  parentId?: string;
  rootId?: string;
  referenceId?: string;
  referenceType?: string;
  dataType?: string;
  dataTypes?: string[];
  data?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  childrenNumber?: number;
  flagCount?: number;
  hashFlag?: AmityHashFlag;
  reactions?: AmityReactions;
  reactionsCount?: number;
  myReactions?: string[];
  isDeleted?: boolean;
  editedAt?: string;
  createdAt?: string;
  updatedAt?: string;
  children?: string[];
  segmentNumber?: number;
  mentionees?: AmityMentionee[];
  attachments?: AmityCommentAttachment[];
  targetId?: string;
  targetType?: string;
}

export interface AmityFileMetadata {
  exif?: Record<string, unknown>;
  gps?: Record<string, unknown>;
  height?: number;
  width?: number;
  isFull?: boolean;
}

export interface AmityFileAttributes {
  name?: string;
  extension?: string;
  size?: number;
  mimeType?: string;
  metadata?: AmityFileMetadata;
}

export interface AmityFile {
  fileId?: string;
  fileUrl?: string;
  type?: string;
  accessType?: string;
  altText?: string;
  createdAt?: string;
  updatedAt?: string;
  attributes?: AmityFileAttributes;
}

export interface AmityUser {
  _id?: string;
  path?: string;
  userId?: string;
  userInternalId?: string;
  userPublicId?: string;
  roles?: string[];
  permissions?: string[];
  displayName?: string;
  profileHandle?: string;
  description?: string;
  avatarFileId?: string;
  avatarCustomUrl?: string;
  flagCount?: number;
  hashFlag?: AmityHashFlag;
  metadata?: Record<string, unknown>;
  isGlobalBan?: boolean;
  isBrand?: boolean;
  createdAt?: string;
  updatedAt?: string;
  isDeleted?: boolean;
}

export interface AmityCommunity {
  _id?: string;
  path?: string;
  communityId?: string;
  channelId?: string;
  userId?: string;
  userPublicId?: string;
  userInternalId?: string;
  displayName?: string;
  avatarFileId?: string;
  description?: string;
  isOfficial?: boolean;
  isPublic?: boolean;
  onlyAdminCanPost?: boolean;
  tags?: string[];
  metadata?: Record<string, unknown>;
  postsCount?: number;
  membersCount?: number;
  isJoined?: boolean;
  categoryIds?: string[];
  isDeleted?: boolean;
  createdAt?: string;
  updatedAt?: string;
  hasFlaggedComment?: boolean;
  hasFlaggedPost?: boolean;
  needApprovalOnPostCreation?: boolean;
  moderatorMemberCount?: number;
  allowCommentInStory?: boolean;
  isDiscoverable?: boolean;
  requiresJoinApproval?: boolean;
  notificationMode?: string;
}

export interface AmityCommunityUser {
  userId?: string;
  userPublicId?: string;
  userInternalId?: string;
  channelId?: string;
  communityId?: string;
  communityMembership?: string;
  notMemberReason?: string;
  isBanned?: boolean;
  lastActivity?: string;
  roles?: string[];
  permissions?: string[];
  createdAt?: string;
  updatedAt?: string;
}

export interface AmityCategory {
  categoryId?: string;
  name?: string;
  metadata?: Record<string, unknown>;
  avatarFileId?: string;
  isDeleted?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface AmityPaging {
  next?: string;
  previous?: string;
}

export interface AmityUserFeedData {
  posts?: AmityPost[];
  postChildren?: AmityPost[];
  comments?: AmityComment[];
  users?: AmityUser[];
  files?: AmityFile[];
  communities?: AmityCommunity[];
  communityUsers?: AmityCommunityUser[];
  categories?: AmityCategory[];
  paging?: AmityPaging;
}

export interface AmityUserFeedResponse {
  status?: string;
  data?: AmityUserFeedData;
}






