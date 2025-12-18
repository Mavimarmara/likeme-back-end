import request from 'supertest';
import app from '../server';
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

  // Criar um usuário de teste
  const user = await prisma.user.create({
    data: {
      personId: person.id,
      username: `test${Date.now()}@example.com`,
      password: 'hashedpassword',
      isActive: true,
    },
  });

  // Usar o JWT secret para criar um token
  const jwt = require('jsonwebtoken');
  return jwt.sign({ userId: user.id }, process.env.JWT_SECRET || 'test-secret', { expiresIn: '1h' });
};

describe('Amazon Endpoints', () => {
  let authToken: string;
  let testUser: any;
  let testAdvertiser: any;
  let testAd: any;

  beforeAll(async () => {
    // Criar person para o token user
    const tokenPerson = await prisma.person.create({
      data: {
        firstName: 'Token',
        lastName: 'User',
      },
    });
    testDataTracker.add('person', tokenPerson.id);

    const tokenUser = await prisma.user.create({
      data: {
        personId: tokenPerson.id,
        username: `testtoken${Date.now()}@example.com`,
        password: 'hashedpassword',
        isActive: true,
      },
    });
    testDataTracker.add('user', tokenUser.id);

    const jwt = require('jsonwebtoken');
    authToken = jwt.sign({ userId: tokenUser.id }, process.env.JWT_SECRET || 'test-secret', { expiresIn: '1h' });

    // Criar person para advertiser
    const advertiserPerson = await prisma.person.create({
      data: {
        firstName: 'Advertiser',
        lastName: 'Test',
      },
    });
    testDataTracker.add('person', advertiserPerson.id);

    // Criar advertiser de teste
    testUser = await prisma.user.create({
      data: {
        personId: advertiserPerson.id,
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

    // Criar anúncio de teste com externalUrl
    testAd = await prisma.ad.create({
      data: {
        advertiserId: testAdvertiser.id,
        title: 'Test Amazon Product',
        description: 'Test description',
        externalUrl: 'https://www.amazon.com.br/dp/B0BLJTJ38M',
        category: 'amazon product',
        status: 'active',
      },
    });
    testDataTracker.add('ad', testAd.id);
  });

  describe('GET /api/amazon/product-by-url', () => {
    const validAmazonUrl = 'https://www.amazon.com.br/dp/B0BLJTJ38M';

    it('should extract product data from Amazon URL', async () => {
      // Mock da resposta do fetch
      const mockHtml = `
        <html>
          <head>
            <meta property="og:title" content="Barbie Casa de Bonecas Dos Sonhos" />
            <meta name="description" content="Casa de bonecas para crianças" />
          </head>
          <body>
            <span id="productTitle">Barbie Casa de Bonecas Dos Sonhos para crianças a partir de 3 anos</span>
            <span class="a-price">
              <span class="a-offscreen">R$ 649,90</span>
            </span>
            <img id="landingImage" src="https://m.media-amazon.com/images/I/test.jpg" />
            <span class="a-icon-alt">4,8 de 5 estrelas</span>
            <span>(15) avaliações</span>
          </body>
        </html>
      `;

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        text: async () => mockHtml,
      });

      const response = await request(app)
        .get('/api/amazon/product-by-url')
        .query({ externalUrl: validAmazonUrl })
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.asin).toBe('B0BLJTJ38M');
      expect(response.body.data.title).toBeTruthy();
    });

    it('should return 400 if externalUrl is missing', async () => {
      const response = await request(app)
        .get('/api/amazon/product-by-url')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should return 400 if URL is not from Amazon', async () => {
      const response = await request(app)
        .get('/api/amazon/product-by-url')
        .query({ externalUrl: 'https://example.com/product' })
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should return 401 if token is missing', async () => {
      const response = await request(app)
        .get('/api/amazon/product-by-url')
        .query({ externalUrl: validAmazonUrl });

      expect(response.status).toBe(401);
    });

    it('should handle fetch errors gracefully', async () => {
      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

      const response = await request(app)
        .get('/api/amazon/product-by-url')
        .query({ externalUrl: validAmazonUrl })
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
    });

    it('should handle 404 from Amazon page', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
      });

      const response = await request(app)
        .get('/api/amazon/product-by-url')
        .query({ externalUrl: validAmazonUrl })
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/amazon/product-by-ad/:adId', () => {
    // Helper para garantir advertiser existe
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

    it('should extract product data from ad externalUrl', async () => {
      const advertiser = await ensureTestAdvertiser();
      
      // Garantir que testAd existe ou criar novo
      if (!testAd) {
        testAd = await prisma.ad.create({
          data: {
            advertiserId: advertiser.id,
            title: 'Test Amazon Product',
            description: 'Test description',
            externalUrl: 'https://www.amazon.com.br/dp/B0BLJTJ38M',
            category: 'amazon product',
            status: 'active',
          },
        });
        testDataTracker.add('ad', testAd.id);
      }

      const mockHtml = `
        <html>
          <head>
            <meta property="og:title" content="Test Product" />
          </head>
          <body>
            <span id="productTitle">Test Product</span>
            <span class="a-price">
              <span class="a-offscreen">R$ 100,00</span>
            </span>
            <img id="landingImage" src="https://m.media-amazon.com/images/I/test.jpg" />
          </body>
        </html>
      `;

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        text: async () => mockHtml,
      });

      const response = await request(app)
        .get(`/api/amazon/product-by-ad/${testAd.id}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.ad).toBeDefined();
      expect(response.body.data.ad.id).toBe(testAd.id);
    });

    it('should return 404 if ad not found', async () => {
      const response = await request(app)
        .get('/api/amazon/product-by-ad/non-existent-id')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });

    it('should return 400 if ad has no externalUrl', async () => {
      const advertiser = await ensureTestAdvertiser();
      
      // Criar anúncio sem externalUrl
      const adWithoutUrl = await prisma.ad.create({
        data: {
          advertiserId: advertiser.id,
          title: 'Ad Without URL',
          status: 'active',
        },
      });
      testDataTracker.add('ad', adWithoutUrl.id);

      const response = await request(app)
        .get(`/api/amazon/product-by-ad/${adWithoutUrl.id}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);

      // Limpar
      await prisma.ad.delete({ where: { id: adWithoutUrl.id } }).catch(() => {});
    });

    it('should return 400 if externalUrl is not from Amazon', async () => {
      const advertiser = await ensureTestAdvertiser();
      
      const adWithNonAmazonUrl = await prisma.ad.create({
        data: {
          advertiserId: advertiser.id,
          title: 'Ad With Non-Amazon URL',
          externalUrl: 'https://example.com/product',
          status: 'active',
        },
      });
      testDataTracker.add('ad', adWithNonAmazonUrl.id);

      const response = await request(app)
        .get(`/api/amazon/product-by-ad/${adWithNonAmazonUrl.id}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);

      // Limpar
      await prisma.ad.delete({ where: { id: adWithNonAmazonUrl.id } }).catch(() => {});
    });

    it('should return 401 if token is missing', async () => {
      const response = await request(app)
        .get(`/api/amazon/product-by-ad/${testAd.id}`);

      expect(response.status).toBe(401);
    });
  });
});
