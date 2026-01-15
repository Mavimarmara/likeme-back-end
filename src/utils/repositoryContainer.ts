/**
 * Repository Container
 * Container para injeção de dependências de repositórios
 */

import type { UserRepository } from '@/repositories/user/UserRepository';
import type { OrderRepository } from '@/repositories/order/OrderRepository';
import type { ProductRepository } from '@/repositories/product/ProductRepository';
import type { CommunityRepository } from '@/repositories/community/CommunityRepository';
import type { ActivityRepository } from '@/repositories/activity/ActivityRepository';
import type { AnamnesisRepository } from '@/repositories/anamnesis/AnamnesisRepository';

import { PrismaUserRepository } from '@/repositories/user/PrismaUserRepository';
import { PrismaOrderRepository } from '@/repositories/order/PrismaOrderRepository';
import { PrismaProductRepository } from '@/repositories/product/PrismaProductRepository';
import { PrismaCommunityRepository } from '@/repositories/community/PrismaCommunityRepository';
import { PrismaActivityRepository } from '@/repositories/activity/PrismaActivityRepository';
import { PrismaAnamnesisRepository } from '@/repositories/anamnesis/PrismaAnamnesisRepository';

class RepositoryContainer {
  private static instance: RepositoryContainer;
  
  private _userRepository: UserRepository | null = null;
  private _orderRepository: OrderRepository | null = null;
  private _productRepository: ProductRepository | null = null;
  private _communityRepository: CommunityRepository | null = null;
  private _activityRepository: ActivityRepository | null = null;
  private _anamnesisRepository: AnamnesisRepository | null = null;

  private constructor() {}

  static getInstance(): RepositoryContainer {
    if (!RepositoryContainer.instance) {
      RepositoryContainer.instance = new RepositoryContainer();
    }
    return RepositoryContainer.instance;
  }

  get userRepository(): UserRepository {
    if (!this._userRepository) {
      this._userRepository = new PrismaUserRepository();
    }
    return this._userRepository;
  }

  get orderRepository(): OrderRepository {
    if (!this._orderRepository) {
      this._orderRepository = new PrismaOrderRepository();
    }
    return this._orderRepository;
  }

  get productRepository(): ProductRepository {
    if (!this._productRepository) {
      this._productRepository = new PrismaProductRepository();
    }
    return this._productRepository;
  }

  get communityRepository(): CommunityRepository {
    if (!this._communityRepository) {
      this._communityRepository = new PrismaCommunityRepository();
    }
    return this._communityRepository;
  }

  get activityRepository(): ActivityRepository {
    if (!this._activityRepository) {
      this._activityRepository = new PrismaActivityRepository();
    }
    return this._activityRepository;
  }

  get anamnesisRepository(): AnamnesisRepository {
    if (!this._anamnesisRepository) {
      this._anamnesisRepository = new PrismaAnamnesisRepository();
    }
    return this._anamnesisRepository;
  }

  setUserRepository(repository: UserRepository): void {
    this._userRepository = repository;
  }

  setOrderRepository(repository: OrderRepository): void {
    this._orderRepository = repository;
  }

  setProductRepository(repository: ProductRepository): void {
    this._productRepository = repository;
  }

  setCommunityRepository(repository: CommunityRepository): void {
    this._communityRepository = repository;
  }

  setActivityRepository(repository: ActivityRepository): void {
    this._activityRepository = repository;
  }

  setAnamnesisRepository(repository: AnamnesisRepository): void {
    this._anamnesisRepository = repository;
  }

  reset(): void {
    this._userRepository = null;
    this._orderRepository = null;
    this._productRepository = null;
    this._communityRepository = null;
    this._activityRepository = null;
    this._anamnesisRepository = null;
  }
}

const container = RepositoryContainer.getInstance();

// Helpers
export const getUserRepository = (): UserRepository => container.userRepository;
export const getOrderRepository = (): OrderRepository => container.orderRepository;
export const getProductRepository = (): ProductRepository => container.productRepository;
export const getCommunityRepository = (): CommunityRepository => container.communityRepository;
export const getActivityRepository = (): ActivityRepository => container.activityRepository;
export const getAnamnesisRepository = (): AnamnesisRepository => container.anamnesisRepository;

export const repositoryContainer = container;
