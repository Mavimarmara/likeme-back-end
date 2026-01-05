import request from 'supertest';
import app from '@/server';
import prisma from '@/config/database';
import { safeTestCleanup, TestDataTracker } from '@/utils/test-helpers';

jest.setTimeout(30000);

// Mock do fetch global para testes
global.fetch = jest.fn();

beforeAll(async () => {
  if (process.env.NODE_ENV !== 'test') {
    console.warn('⚠️  NODE_ENV não está definido como "test". Os testes podem afetar o banco de dados de desenvolvimento!');
  }
});

// Tracker global para rastrear IDs criados durante os testes
const testDataTracker = new TestDataTracker();

afterAll(async () => {
  await safeTestCleanup(testDataTracker, prisma);
  await prisma.$disconnect();
});

afterEach(async () => {
  jest.restoreAllMocks();
  // Não limpar dados aqui para evitar problemas com tokens
});

// Helper para criar um token de teste
const createTestToken = async (): Promise<string> => {
  // Criar person primeiro
  const person = await prisma.person.create({
    data: {
      firstName: 'Test',
      lastName: 'User',
    },
  });
  testDataTracker.add('person', person.id);

  const user = await prisma.user.create({
    data: {
      personId: person.id,
      username: `test${Date.now()}@example.com`,
      password: 'hashedpassword',
      isActive: true,
    },
  });
  testDataTracker.add('user', user.id);

  const jwt = require('jsonwebtoken');
  return jwt.sign({ userId: user.id }, process.env.JWT_SECRET || 'test-secret', { expiresIn: '1h' });
};

describe('Ad Endpoints', () => {
  let authToken: string;
  let testUser: any;
  let testAdvertiser: any;
  let testProduct: any;
  let testAdvertiserPerson: any;

  // Helper para obter token válido
  const getValidToken = async (): Promise<string> => {
    try {
      const jwt = require('jsonwebtoken');
      const decoded = jwt.verify(authToken, process.env.JWT_SECRET || 'test-secret') as { userId: string };
      const user = await prisma.user.findUnique({ where: { id: decoded.userId } });
      if (user && !user.deletedAt && user.isActive) {
        return authToken;
      }
    } catch {
      // Token inválido, criar novo
    }
    return await createTestToken();
  };

  // Helper para garantir que advertiser existe
  const ensureTestAdvertiser = async () => {
    if (testAdvertiser) {
      const exists = await prisma.advertiser.findUnique({ where: { id: testAdvertiser.id } });
      if (exists) return testAdvertiser;
    }
    
    // Recriar advertiser
    const advertiserPerson = await prisma.person.create({
      data: { firstName: 'Advertiser', lastName: 'Test' },
    });
    testDataTracker.add('person', advertiserPerson.id);

    const user = await prisma.user.create({
      data: {
        personId: advertiserPerson.id,
        username: `testadvertiser${Date.now()}@example.com`,
        password: 'hashedpassword',
        isActive: true,
      },
    });
    testDataTracker.add('user', user.id);

    testAdvertiser = await prisma.advertiser.create({
      data: { userId: user.id, name: 'Test Advertiser', status: 'active' },
    });
    testDataTracker.add('advertiser', testAdvertiser.id);
    
    return testAdvertiser;
  };

  // Helper para garantir que product existe
  const ensureTestProduct = async () => {
    if (testProduct) {
      const exists = await prisma.product.findUnique({ where: { id: testProduct.id } });
      if (exists) return testProduct;
    }
    
    testProduct = await prisma.product.create({
      data: { name: 'Test Product', price: 99.99, quantity: 10, status: 'active' },
    });
    testDataTracker.add('product', testProduct.id);
    
    return testProduct;
  };

  beforeAll(async () => {
    authToken = await createTestToken();

    // Criar person para advertiser
    testAdvertiserPerson = await prisma.person.create({
      data: {
        firstName: 'Advertiser',
        lastName: 'Test',
      },
    });
    testDataTracker.add('person', testAdvertiserPerson.id);

    // Criar advertiser de teste
    testUser = await prisma.user.create({
      data: {
        personId: testAdvertiserPerson.id,
        username: `testadvertiser${Date.now()}@example.com`,
        password: 'hashedpassword',
        isActive: true,
      },
    });
    testDataTracker.add('user', testUser.id);

    testAdvertiser = await prisma.advertiser.create({
      data: {
        userId: testUser.id,
        name: 'Test Advertiser',
        status: 'active',
      },
    });
    testDataTracker.add('advertiser', testAdvertiser.id);

    // Criar produto de teste
    testProduct = await prisma.product.create({
      data: {
        name: 'Test Product',
        price: 99.99,
        quantity: 10,
        status: 'active',
      },
    });
    testDataTracker.add('product', testProduct.id);
  });

  describe('GET /api/ads/:id', () => {
    it('should return ad with product data when product has externalUrl', async () => {
      const token = await getValidToken();
      const advertiser = await ensureTestAdvertiser();
      
      // Criar produto com externalUrl
      const product = await prisma.product.create({
        data: {
          name: 'Amazon Product',
          description: 'Test product with external URL',
          externalUrl: 'https://www.amazon.com.br/dp/B0BLJTJ38M',
          category: 'amazon product',
          price: 0,
          quantity: 0,
          status: 'active',
        },
      });
      testDataTracker.add('product', product.id);

      // Criar anúncio com produto que tem externalUrl
      const adWithExternalUrl = await prisma.ad.create({
        data: {
          advertiserId: advertiser.id,
          productId: product.id,
          status: 'active',
        },
      });
      testDataTracker.add('ad', adWithExternalUrl.id);

      // Mock da resposta do fetch para extrair dados do produto
      const mockHtml = `
        <html>
          <head>
            <meta property="og:title" content="Amazon Product" />
          </head>
          <body>
            <span id="productTitle">Amazon Product Title</span>
            <span class="a-price">
              <span class="a-offscreen">R$ 649,90</span>
            </span>
            <img id="landingImage" src="https://m.media-amazon.com/images/I/test.jpg" />
            <span class="a-icon-alt">4,8 de 5 estrelas</span>
          </body>
        </html>
      `;

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        text: async () => mockHtml,
      });

      const response = await request(app)
        .get(`/api/ads/${adWithExternalUrl.id}`)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.product).toBeDefined();
      expect(response.body.data.product.name).toBe('Amazon Product Title');
      expect(response.body.data.product.externalUrl).toBe(product.externalUrl);
    });

    it('should return ad with existing product when productId exists', async () => {
      const token = await getValidToken();
      const advertiser = await ensureTestAdvertiser();
      const product = await ensureTestProduct();
      
      // Criar anúncio com productId
      const adWithProduct = await prisma.ad.create({
        data: {
          advertiserId: advertiser.id,
          productId: product.id,
          status: 'active',
        },
      });
      testDataTracker.add('ad', adWithProduct.id);

      const response = await request(app)
        .get(`/api/ads/${adWithProduct.id}`)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.product).toBeDefined();
      expect(response.body.data.product.id).toBe(testProduct.id);
      expect(response.body.data.product.name).toBe(testProduct.name);
    });

    it('should return ad without product when no productId and no externalUrl', async () => {
      const token = await getValidToken();
      const advertiser = await ensureTestAdvertiser();
      
      // Criar anúncio sem productId (productId é opcional)
      const adWithoutProduct = await prisma.ad.create({
        data: {
          advertiserId: advertiser.id,
          status: 'active',
        },
      });
      testDataTracker.add('ad', adWithoutProduct.id);

      const response = await request(app)
        .get(`/api/ads/${adWithoutProduct.id}`)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.product).toBeNull();
    });

    it('should return 404 when externalUrl fetch fails for Amazon products', async () => {
      const token = await getValidToken();
      const advertiser = await ensureTestAdvertiser();
      
      // Criar produto com externalUrl inválido
      const product = await prisma.product.create({
        data: {
          name: 'Product With Invalid URL',
          externalUrl: 'https://www.amazon.com.br/dp/INVALID',
          category: 'amazon product',
          price: 0,
          quantity: 0,
          status: 'active',
        },
      });
      testDataTracker.add('product', product.id);

      const adWithExternalUrl = await prisma.ad.create({
        data: {
          advertiserId: advertiser.id,
          productId: product.id,
          status: 'active',
        },
      });
      testDataTracker.add('ad', adWithExternalUrl.id);

      // Mock erro no fetch
      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

      const response = await request(app)
        .get(`/api/ads/${adWithExternalUrl.id}`)
        .set('Authorization', `Bearer ${token}`);

      // Quando não consegue buscar dados da Amazon para produto com externalUrl,
      // retorna 404 (não mostra produto incompleto)
      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });

    it('should return 404 if ad not found', async () => {
      const response = await request(app)
        .get('/api/ads/non-existent-id')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });

    it('should return 401 if token is missing', async () => {
      const product = await prisma.product.create({
        data: {
          name: 'Test Product',
          price: 10.99,
          quantity: 10,
          status: 'active',
        },
      });
      testDataTracker.add('product', product.id);

      const ad = await prisma.ad.create({
        data: {
          advertiserId: testAdvertiser.id,
          productId: product.id,
          status: 'active',
        },
      });
      testDataTracker.add('ad', ad.id);

      const response = await request(app)
        .get(`/api/ads/${ad.id}`);

      expect(response.status).toBe(401);
    });
  });

  describe('GET /api/ads', () => {
    it('should list all active ads', async () => {
      const token = await getValidToken();
      const advertiser = await ensureTestAdvertiser();
      
      // Criar produtos para os anúncios
      const product1 = await prisma.product.create({
        data: {
          name: 'Product 1',
          price: 10.99,
          quantity: 10,
          status: 'active',
        },
      });
      testDataTracker.add('product', product1.id);

      const product2 = await prisma.product.create({
        data: {
          name: 'Product 2',
          price: 20.99,
          quantity: 5,
          status: 'active',
        },
      });
      testDataTracker.add('product', product2.id);

      const product3 = await prisma.product.create({
        data: {
          name: 'Product 3',
          price: 30.99,
          quantity: 0,
          status: 'active',
        },
      });
      testDataTracker.add('product', product3.id);

      // Criar alguns anúncios
      const ad1 = await prisma.ad.create({
        data: {
          advertiserId: advertiser.id,
          productId: product1.id,
          status: 'active',
        },
      });
      testDataTracker.add('ad', ad1.id);

      const ad2 = await prisma.ad.create({
        data: {
          advertiserId: advertiser.id,
          productId: product2.id,
          status: 'active',
        },
      });
      testDataTracker.add('ad', ad2.id);

      const ad3 = await prisma.ad.create({
        data: {
          advertiserId: advertiser.id,
          productId: product3.id,
          status: 'inactive',
        },
      });
      testDataTracker.add('ad', ad3.id);

      const response = await request(app)
        .get('/api/ads')
        .query({ activeOnly: 'true' })
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.ads).toBeDefined();
      expect(response.body.data.pagination).toBeDefined();
      
      // Verificar que apenas ads ativos são retornados
      const allActive = response.body.data.ads.every((ad: any) => ad.status === 'active');
      expect(allActive).toBe(true);
    });

    it('should filter ads by category', async () => {
      const token = await getValidToken();
      const advertiser = await ensureTestAdvertiser();
      
      // Criar produto com categoria
      const product = await prisma.product.create({
        data: {
          name: 'Amazon Product',
          category: 'amazon product',
          price: 10.99,
          quantity: 10,
          status: 'active',
        },
      });
      testDataTracker.add('product', product.id);

      const ad = await prisma.ad.create({
        data: {
          advertiserId: advertiser.id,
          productId: product.id,
          status: 'active',
        },
      });
      testDataTracker.add('ad', ad.id);

      const response = await request(app)
        .get('/api/ads')
        .query({ category: 'amazon product' })
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      
      if (response.body.data.ads.length > 0) {
        const allMatchCategory = response.body.data.ads.every(
          (ad: any) => ad.product?.category === 'amazon product'
        );
        expect(allMatchCategory).toBe(true);
      }
    });
  });

  describe('POST /api/ads', () => {
    it('should create a new ad with product containing externalUrl', async () => {
      const token = await getValidToken();
      const advertiser = await ensureTestAdvertiser();

      const adData = {
        advertiserId: advertiser.id,
        product: {
          name: 'New Amazon Product',
          description: 'Test description',
          externalUrl: 'https://www.amazon.com.br/dp/B0BLJTJ38M',
          category: 'amazon product',
          status: 'active',
        },
        status: 'active',
      };

      const response = await request(app)
        .post('/api/ads')
        .send(adData)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.product).toBeDefined();
      expect(response.body.data.product.externalUrl).toBe(adData.product.externalUrl);
      expect(response.body.data.product.category).toBe(adData.product.category);
      if (response.body.data?.id) {
        testDataTracker.add('ad', response.body.data.id);
      }
      if (response.body.data?.product?.id) {
        testDataTracker.add('product', response.body.data.product.id);
      }
    });

    it('should create a new ad with productId', async () => {
      const token = await getValidToken();
      const advertiser = await ensureTestAdvertiser();
      const product = await ensureTestProduct();

      const adData = {
        advertiserId: advertiser.id,
        productId: product.id,
        status: 'active',
      };

      const response = await request(app)
        .post('/api/ads')
        .send(adData)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.productId).toBe(product.id);
      if (response.body.data?.id) {
        testDataTracker.add('ad', response.body.data.id);
      }
    });

    it('should validate required fields', async () => {
      const token = await getValidToken();
      const advertiser = await ensureTestAdvertiser();

      const adData = {
        // Missing productId and product
        advertiserId: advertiser.id,
      };

      const response = await request(app)
        .post('/api/ads')
        .send(adData)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });
});
