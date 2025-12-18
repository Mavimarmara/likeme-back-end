import express from 'express';
import path from 'path';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import swaggerUi from 'swagger-ui-express';
import swaggerJsdoc from 'swagger-jsdoc';
import { getAbsoluteFSPath as getSwaggerUiAssetPath } from 'swagger-ui-dist';
import { config } from '@/config';
import { swaggerOptions } from '@/config/swagger';
import { errorHandler } from '@/middleware/errorHandler';
import { generalRateLimiter } from '@/middleware/rateLimiter';

import authRoutes from '@/routes/auth/authRoutes';
import personRoutes from '@/routes/person/person/personRoutes';
import personContactRoutes from '@/routes/person/personContact/personContactRoutes';
import userRoutes from '@/routes/user/userRoutes';
import personalObjectiveRoutes from '@/routes/objective/personalObjectiveRoutes';
import userPersonalObjectiveRoutes from '@/routes/objective/userPersonalObjectiveRoutes';
import tipRoutes from '@/routes/tip/tipRoutes';
import communityRoutes from '@/routes/community/communityRoutes';
import productRoutes from '@/routes/product/productRoutes';
import orderRoutes from '@/routes/order/orderRoutes';
import paymentRoutes from '@/routes/payment/paymentRoutes';
import adRoutes from '@/routes/ad/adRoutes';
import advertiserRoutes from '@/routes/advertiser/advertiserRoutes';
import amazonRoutes from '@/routes/amazon/amazonRoutes';

const app = express();

app.set('trust proxy', process.env.VERCEL ? 1 : false);

app.use(helmet({
  contentSecurityPolicy: false, // Desabilita CSP para permitir Swagger UI
}));

// CORS configurado para permitir requisições do Swagger UI e do próprio domínio
app.use(cors({
  origin: (origin, callback) => {
    // Permite requisições sem origin (como do Swagger UI no mesmo servidor, curl, Postman)
    if (!origin) {
      return callback(null, true);
    }
    
    // Verifica se a origin está na lista permitida
    const allowedOrigins = Array.isArray(config.corsOrigin) 
      ? config.corsOrigin 
      : [config.corsOrigin];
    
    // Permite se estiver na lista ou se for '*'
    if (allowedOrigins.includes(origin) || allowedOrigins.includes('*')) {
      return callback(null, true);
    }
    
    // Permite requisições do próprio domínio (Vercel)
    if (process.env.VERCEL_URL) {
      const vercelUrl = `https://${process.env.VERCEL_URL}`;
      if (origin === vercelUrl || origin.startsWith(vercelUrl)) {
        return callback(null, true);
      }
    }
    
    // Permite requisições de qualquer subdomínio do Vercel
    if (origin.includes('.vercel.app') || origin.includes('vercel.app')) {
      return callback(null, true);
    }
    
    // Em desenvolvimento, permite qualquer origin
    if (config.nodeEnv === 'development') {
      return callback(null, true);
    }
    
    // Em produção no Vercel, permite requisições do próprio domínio
    if (process.env.VERCEL) {
      return callback(null, true);
    }
    
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key', 'Accept'],
  exposedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(compression());
app.use(morgan('combined'));
app.use(generalRateLimiter);
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

const getSwaggerSpec = () => {
  if (process.env.VERCEL) {
    try {
      // eslint-disable-next-line global-require, @typescript-eslint/no-var-requires, import/no-dynamic-require
      return require('./swagger.json');
    } catch (error) {
      console.warn('Não foi possível carregar swagger.json pré-gerado. Recriando em tempo de execução.', error);
      return swaggerJsdoc(swaggerOptions);
    }
  }

  return swaggerJsdoc(swaggerOptions);
};

const swaggerSpec = getSwaggerSpec();
const swaggerUiOptions = {
  swaggerOptions: {
    url: `${config.apiDocsPath}/swagger.json`,
    docExpansion: 'none',
    deepLinking: true,
    persistAuthorization: true,
    requestInterceptor: (req: any) => {
      // Garante que as requisições do Swagger usem a URL correta
      if (req.url && !req.url.startsWith('http') && !req.url.startsWith('https')) {
        // Se for uma URL relativa, mantém como está (será resolvida pelo navegador)
        return req;
      }
      return req;
    },
  },
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'LikeMe API Documentation',
  customJs: `
    (function() {
      // Script para auto-preenchimento do idToken no Swagger
      function autoFillAuthToken() {
        // Observa mudanças no DOM para detectar quando a resposta é exibida
        const observer = new MutationObserver(function(mutations) {
          mutations.forEach(function(mutation) {
            mutation.addedNodes.forEach(function(node) {
              if (node.nodeType === 1) {
                const responseBody = node.querySelector && node.querySelector('.response-body');
                if (responseBody) {
                  const responseText = responseBody.textContent || '';
                  if (responseText.includes('idToken') && responseText.includes('success')) {
                    try {
                      const response = JSON.parse(responseText);
                      if (response.success && response.data && response.data.idToken) {
                        // Aguarda um pouco para garantir que o Swagger UI está pronto
                        setTimeout(function() {
                          // Tenta usar a API do Swagger UI
                          if (window.ui && window.ui.preauthorizeApiKey) {
                            window.ui.preauthorizeApiKey('bearerAuth', response.data.idToken);
                            console.log('✅ idToken automaticamente adicionado ao Authorize!');
                          } else {
                            // Fallback: preenche manualmente o campo
                            const authModal = document.querySelector('.auth-modal');
                            if (authModal) {
                              const authInput = authModal.querySelector('input[type="text"]');
                              if (authInput) {
                                authInput.value = response.data.idToken;
                                authInput.dispatchEvent(new Event('input', { bubbles: true }));
                                const authorizeBtn = authModal.querySelector('.btn.authorize');
                                if (authorizeBtn) {
                                  authorizeBtn.click();
                                }
                                console.log('✅ idToken automaticamente adicionado ao Authorize!');
                              }
                            }
                          }
                        }, 500);
                      }
                    } catch (e) {
                      // Ignora erros de parsing
                    }
                  }
                }
              }
            });
          });
        });
        
        // Observa mudanças no body
        observer.observe(document.body, {
          childList: true,
          subtree: true
        });
        
      }
      
      // Executa quando a página carregar
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', autoFillAuthToken);
      } else {
        autoFillAuthToken();
      }
    })();
  `,
};
const swaggerAssetPath = getSwaggerUiAssetPath();

app.get(`${config.apiDocsPath}.json`, (_req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(swaggerSpec);
});

app.get(`${config.apiDocsPath}/swagger.json`, (_req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(swaggerSpec);
});

app.use(
  `${config.apiDocsPath}/`,
  express.static(swaggerAssetPath, { index: false }),
);

app.use(
  '/static',
  express.static(path.join(process.cwd(), 'public')),
);

app.use(
  config.apiDocsPath,
  swaggerUi.serveFiles(swaggerSpec, swaggerUiOptions),
  swaggerUi.setup(swaggerSpec, swaggerUiOptions),
);

app.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'LikeMe API em produção',
    links: {
      health: '/health',
      docs: config.apiDocsPath,
      api: '/api',
    },
    timestamp: new Date().toISOString(),
    environment: config.nodeEnv,
  });
});

app.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'LikeMe API está funcionando',
    timestamp: new Date().toISOString(),
    environment: config.nodeEnv,
  });
});

app.use('/api/auth', authRoutes);
app.use('/api/persons', personRoutes);
app.use('/api/person-contacts', personContactRoutes);
app.use('/api/users', userRoutes);
app.use('/api/personal-objectives', personalObjectiveRoutes);
app.use('/api/user-personal-objectives', userPersonalObjectiveRoutes);
app.use('/api/tips', tipRoutes);
app.use('/api/communities', communityRoutes);
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/payment', paymentRoutes);
app.use('/api/ads', adRoutes);
app.use('/api/advertisers', advertiserRoutes);
app.use('/api/amazon', amazonRoutes);

app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Endpoint não encontrado',
    path: req.originalUrl,
  });
});

app.use(errorHandler);

const PORT = config.port || process.env.PORT || 3000;

if (!process.env.VERCEL && process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`🚀 LikeMe API rodando na porta ${PORT}`);
    console.log(`📚 Documentação disponível em: http://localhost:${PORT}${config.apiDocsPath}`);
    console.log(`🏥 Health check: http://localhost:${PORT}/health`);
    console.log(`🌍 Ambiente: ${config.nodeEnv}`);
  });
} else if (process.env.VERCEL) {
  console.log(`🚀 LikeMe API rodando no Vercel`);
  console.log(`🌍 Ambiente: ${config.nodeEnv}`);
}

export default app;
