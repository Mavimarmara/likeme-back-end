import { SocialPlusBase } from './base';
import { UserMixin } from './user';
import { CommunityMixin } from './community';
import { ChatMixin } from './chat';
import { FeedMixin } from './feed';
import { PollMixin } from './poll';

const SocialPlusClient = PollMixin(FeedMixin(ChatMixin(CommunityMixin(UserMixin(SocialPlusBase)))));

export const socialPlusClient = new SocialPlusClient();

export type { SocialPlusResponse } from './base';
export type { SocialPlusUser } from './user';
export type { ListCommunitiesParams } from './community';
export type { GetUserFeedParams } from './feed';
