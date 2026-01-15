export interface ActivityRepository {
  save(data: CreateActivityData): Promise<{ id: string }>;
  findById(id: string): Promise<ActivityData | null>;
  findByIdWithUser(id: string): Promise<ActivityWithUserData | null>;
  findAll(filters?: ActivityFilters): Promise<ActivityData[]>;
  findAllWithUser(page: number, limit: number, filters?: ActivityFilters): Promise<{ activities: ActivityWithUserData[]; total: number }>;
  findByUserId(userId: string): Promise<ActivityData[]>;
  update(id: string, data: UpdateActivityData): Promise<void>;
  delete(id: string): Promise<void>;
}

export interface CreateActivityData {
  userId: string;
  name: string;
  type: string;
  startDate: Date;
  startTime?: string;
  endDate?: Date;
  endTime?: string;
  location?: string;
  description?: string;
  reminderEnabled?: boolean;
  reminderOffset?: string;
}

export interface ActivityData {
  id: string;
  userId: string;
  name: string;
  type: string;
  startDate: Date;
  startTime: string | null;
  endDate: Date | null;
  endTime: string | null;
  location: string | null;
  description: string | null;
  reminderEnabled: boolean;
  reminderOffset: string | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

export interface ActivityWithUserData extends ActivityData {
  user: {
    id: string;
    username: string | null;
    person: {
      id: string;
      firstName: string;
      lastName: string;
    };
  };
}

export interface UpdateActivityData {
  name?: string;
  type?: string;
  startDate?: Date;
  startTime?: string;
  endDate?: Date;
  endTime?: string;
  location?: string;
  description?: string;
  reminderEnabled?: boolean;
  reminderOffset?: string;
}

export interface ActivityFilters {
  type?: string;
  userId?: string;
  fromDate?: Date;
  toDate?: Date;
}
