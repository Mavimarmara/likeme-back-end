export interface AddCommunitiesResult {
  added: number;
  failed: number;
  errors: string[];
}

export type FeedOrderBy = 'createdAt' | 'updatedAt' | 'reactionsCount';

export interface FeedFilterOptions {
  postTypes?: string[];
  authorIds?: string[];
  startDate?: Date;
  endDate?: Date;
  orderBy?: FeedOrderBy;
  order?: 'asc' | 'desc';
}

