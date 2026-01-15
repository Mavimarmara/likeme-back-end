import { PrismaUserRepository } from '@/repositories/user/PrismaUserRepository';
import type { UserRepository } from '@/repositories/user/UserRepository';
import { PrismaProductRepository } from '@/repositories/product/PrismaProductRepository';
import type { ProductRepository } from '@/repositories/product/ProductRepository';
import { PrismaOrderRepository } from '@/repositories/order/PrismaOrderRepository';
import type { OrderRepository } from '@/repositories/order/OrderRepository';
import { PrismaCommunityRepository } from '@/repositories/community/PrismaCommunityRepository';
import type { CommunityRepository } from '@/repositories/community/CommunityRepository';
import { PrismaActivityRepository } from '@/repositories/activity/PrismaActivityRepository';
import type { ActivityRepository } from '@/repositories/activity/ActivityRepository';
import { PrismaAnamnesisRepository } from '@/repositories/anamnesis/PrismaAnamnesisRepository';
import type { AnamnesisRepository } from '@/repositories/anamnesis/AnamnesisRepository';
import { PrismaProductImportRepository } from '@/repositories/product/PrismaProductImportRepository';
import type { ProductImportRepository } from '@/repositories/product/ProductImportRepository';

let userRepository: UserRepository;
let productRepository: ProductRepository;
let orderRepository: OrderRepository;
let communityRepository: CommunityRepository;
let activityRepository: ActivityRepository;
let anamnesisRepository: AnamnesisRepository;
let productImportRepository: ProductImportRepository;

export function getUserRepository(): UserRepository {
  if (!userRepository) {
    userRepository = new PrismaUserRepository();
  }
  return userRepository;
}

export function getProductRepository(): ProductRepository {
  if (!productRepository) {
    productRepository = new PrismaProductRepository();
  }
  return productRepository;
}

export function getOrderRepository(): OrderRepository {
  if (!orderRepository) {
    orderRepository = new PrismaOrderRepository();
  }
  return orderRepository;
}

export function getCommunityRepository(): CommunityRepository {
  if (!communityRepository) {
    communityRepository = new PrismaCommunityRepository();
  }
  return communityRepository;
}

export function getActivityRepository(): ActivityRepository {
  if (!activityRepository) {
    activityRepository = new PrismaActivityRepository();
  }
  return activityRepository;
}

export function getAnamnesisRepository(): AnamnesisRepository {
  if (!anamnesisRepository) {
    anamnesisRepository = new PrismaAnamnesisRepository();
  }
  return anamnesisRepository;
}

export function getProductImportRepository(): ProductImportRepository {
  if (!productImportRepository) {
    productImportRepository = new PrismaProductImportRepository();
  }
  return productImportRepository;
}

export function setUserRepository(repository: UserRepository): void {
  userRepository = repository;
}

export function setProductRepository(repository: ProductRepository): void {
  productRepository = repository;
}

export function setOrderRepository(repository: OrderRepository): void {
  orderRepository = repository;
}

export function setCommunityRepository(repository: CommunityRepository): void {
  communityRepository = repository;
}

export function setActivityRepository(repository: ActivityRepository): void {
  activityRepository = repository;
}

export function setAnamnesisRepository(repository: AnamnesisRepository): void {
  anamnesisRepository = repository;
}

export function setProductImportRepository(repository: ProductImportRepository): void {
  productImportRepository = repository;
}
