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

const app = express();

app.set('trust proxy', process.env.VERCEL ? 1 : false);

app.use(helmet());
app.use(cors({
  origin: config.corsOrigin,
  credentials: true,
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
  },
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
