process.env.AUTH0_DOMAIN = process.env.AUTH0_DOMAIN || 'test-auth0-domain.auth0.com';
process.env.AUTH0_CLIENT_ID = process.env.AUTH0_CLIENT_ID || 'test-client-id';
process.env.AUTH0_CLIENT_SECRET = process.env.AUTH0_CLIENT_SECRET || 'test-client-secret';
process.env.NODE_ENV = process.env.NODE_ENV || 'test';

// Mock do Prisma para testes unitários: nenhum teste que rode por padrão cria dados no banco.
// Testes que precisam de banco real devem ser executados com: npm run test:integration
function createModelMock() {
  return {
    create: jest.fn().mockResolvedValue({ id: 'mock-id' }),
    createMany: jest.fn().mockResolvedValue({ count: 0 }),
    findUnique: jest.fn().mockResolvedValue(null),
    findFirst: jest.fn().mockResolvedValue(null),
    findMany: jest.fn().mockResolvedValue([]),
    update: jest.fn().mockResolvedValue({}),
    updateMany: jest.fn().mockResolvedValue({ count: 0 }),
    delete: jest.fn().mockResolvedValue({}),
    deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
    count: jest.fn().mockResolvedValue(0),
  };
}

const prismaMock = {
  $disconnect: jest.fn().mockResolvedValue(undefined),
  $connect: jest.fn().mockResolvedValue(undefined),
  $transaction: jest.fn((fn) => (typeof fn === 'function' ? fn(prismaMock) : Promise.resolve())),
  person: createModelMock(),
  personContact: createModelMock(),
  user: createModelMock(),
  personalObjective: createModelMock(),
  role: createModelMock(),
  roleGroup: createModelMock(),
  roleGroupRole: createModelMock(),
  roleGroupUser: createModelMock(),
  userPersonalObjective: createModelMock(),
  tip: createModelMock(),
  category: createModelMock(),
  community: createModelMock(),
  communityMember: createModelMock(),
  product: createModelMock(),
  order: createModelMock(),
  orderItem: createModelMock(),
  advertiser: createModelMock(),
  ad: createModelMock(),
  activity: createModelMock(),
  pagarmeRecipient: createModelMock(),
  deviceToken: createModelMock(),
  anamnesisQuestionConcept: createModelMock(),
  anamnesisQuestionText: createModelMock(),
  anamnesisAnswerOption: createModelMock(),
  anamnesisAnswerOptionText: createModelMock(),
  anamnesisUserAnswer: createModelMock(),
};

jest.mock('@/config/database', () => ({
  __esModule: true,
  default: prismaMock,
}));
