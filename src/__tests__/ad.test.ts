import request from 'supertest';
import app from '../server';
import prisma from '@/config/database';

jest.setTimeout(30000);

// Mock do fetch global para testes
global.fetch = jest.fn();

beforeAll(async () => {
  if (process.env.NODE_ENV !== 'test') {
    console.warn('⚠️  NODE_ENV não está definido como "test". Os testes podem afetar o banco de dados de desenvolvimento!');
  }
});

afterAll(async () => {
  if (process.env.NODE_ENV === 'test') {
    try {
      // Deletar em ordem para respeitar foreign keys
      await prisma.ad.deleteMany({});
      await prisma.product.deleteMany({});
      await prisma.advertiser.deleteMany({});
      await prisma.user.deleteMany({});
      await prisma.person.deleteMany({});
    } catch (error) {
      console.error('Erro ao limpar dados de teste:', error);
    }
  }
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

  const user = await prisma.user.create({
    data: {
      personId: person.id,
      username: `test${Date.now()}@example.com`,
      password: 'hashedpassword',
      isActive: true,
    },
  });

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

    const user = await prisma.user.create({
      data: {
        personId: advertiserPerson.id,
        username: `testadvertiser${Date.now()}@example.com`,
        password: 'hashedpassword',
        isActive: true,
      },
    });

    testAdvertiser = await prisma.advertiser.create({
      data: { userId: user.id, name: 'Test Advertiser', status: 'active' },
    });
    
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

    // Criar advertiser de teste
    testUser = await prisma.user.create({
      data: {
        personId: testAdvertiserPerson.id,
        username: `testadvertiser${Date.now()}@example.com`,
        password: 'hashedpassword',
        isActive: true,
      },
    });

    testAdvertiser = await prisma.advertiser.create({
      data: {
        userId: testUser.id,
        name: 'Test Advertiser',
        status: 'active',
      },
    });

    // Criar produto de teste
    testProduct = await prisma.product.create({
      data: {
        name: 'Test Product',
        price: 99.99,
        quantity: 10,
        status: 'active',
      },
    });
  });

  describe('GET /api/ads/:id', () => {
    it('should return ad with product data when ad has externalUrl but no productId', async () => {
      const token = await getValidToken();
      const advertiser = await ensureTestAdvertiser();
      
      // Criar anúncio com externalUrl mas sem productId
      const adWithExternalUrl = await prisma.ad.create({
        data: {
          advertiserId: advertiser.id,
          title: 'Amazon Product Ad',
          description: 'Test ad with external URL',
          externalUrl: 'https://www.amazon.com.br/dp/B0BLJTJ38M',
          category: 'amazon product',
          status: 'active',
        },
      });

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
      expect(response.body.data.product.externalUrl).toBe(adWithExternalUrl.externalUrl);
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
          title: 'Ad With Product',
          status: 'active',
        },
      });

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
      
      const adWithoutProduct = await prisma.ad.create({
        data: {
          advertiserId: advertiser.id,
          title: 'Ad Without Product',
          status: 'active',
        },
      });

      const response = await request(app)
        .get(`/api/ads/${adWithoutProduct.id}`)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.product).toBeNull();
    });

    it('should handle error when externalUrl fetch fails', async () => {
      const token = await getValidToken();
      const advertiser = await ensureTestAdvertiser();
      
      const adWithExternalUrl = await prisma.ad.create({
        data: {
          advertiserId: advertiser.id,
          title: 'Ad With Invalid URL',
          externalUrl: 'https://www.amazon.com.br/dp/INVALID',
          category: 'amazon product',
          status: 'active',
        },
      });

      // Mock erro no fetch
      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

      const response = await request(app)
        .get(`/api/ads/${adWithExternalUrl.id}`)
        .set('Authorization', `Bearer ${token}`);

      // Deve retornar o ad mesmo se o fetch falhar (não quebra a requisição)
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(adWithExternalUrl.id);
    });

    it('should return 404 if ad not found', async () => {
      const response = await request(app)
        .get('/api/ads/non-existent-id')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });

    it('should return 401 if token is missing', async () => {
      const ad = await prisma.ad.create({
        data: {
          advertiserId: testAdvertiser.id,
          title: 'Test Ad',
          status: 'active',
        },
      });

      const response = await request(app)
        .get(`/api/ads/${ad.id}`);

      expect(response.status).toBe(401);
    });
  });

  describe('GET /api/ads', () => {
    it('should list all active ads', async () => {
      const token = await getValidToken();
      const advertiser = await ensureTestAdvertiser();
      
      // Criar alguns anúncios
      await prisma.ad.createMany({
        data: [
          {
            advertiserId: advertiser.id,
            title: 'Active Ad 1',
            status: 'active',
          },
          {
            advertiserId: advertiser.id,
            title: 'Active Ad 2',
            status: 'active',
          },
          {
            advertiserId: advertiser.id,
            title: 'Inactive Ad',
            status: 'inactive',
          },
        ],
      });

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
      
      await prisma.ad.create({
        data: {
          advertiserId: advertiser.id,
          title: 'Amazon Product Ad',
          category: 'amazon product',
          status: 'active',
        },
      });

      const response = await request(app)
        .get('/api/ads')
        .query({ category: 'amazon product' })
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      
      if (response.body.data.ads.length > 0) {
        const allMatchCategory = response.body.data.ads.every(
          (ad: any) => ad.category === 'amazon product'
        );
        expect(allMatchCategory).toBe(true);
      }
    });
  });

  describe('POST /api/ads', () => {
    it('should create a new ad with externalUrl', async () => {
      const token = await getValidToken();
      const advertiser = await ensureTestAdvertiser();

      const adData = {
        advertiserId: advertiser.id,
        title: 'New Amazon Ad',
        description: 'Test description',
        externalUrl: 'https://www.amazon.com.br/dp/B0BLJTJ38M',
        category: 'amazon product',
        status: 'active',
      };

      const response = await request(app)
        .post('/api/ads')
        .send(adData)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.externalUrl).toBe(adData.externalUrl);
      expect(response.body.data.category).toBe(adData.category);
    });

    it('should create a new ad with productId', async () => {
      const token = await getValidToken();
      const advertiser = await ensureTestAdvertiser();
      const product = await ensureTestProduct();

      const adData = {
        advertiserId: advertiser.id,
        productId: product.id,
        title: 'New Product Ad',
        status: 'active',
      };

      const response = await request(app)
        .post('/api/ads')
        .send(adData)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.productId).toBe(product.id);
    });

    it('should validate required fields', async () => {
      const token = await getValidToken();
      const advertiser = await ensureTestAdvertiser();

      const adData = {
        // Missing title
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
