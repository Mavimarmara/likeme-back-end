import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import swaggerUi from 'swagger-ui-express';
import swaggerJsdoc from 'swagger-jsdoc';
import { config } from '@/config';
import { errorHandler } from '@/middleware/errorHandler';
import { generalRateLimiter } from '@/middleware/rateLimiter';

// Import routes
import authRoutes from '@/routes/authRoutes';
import anamneseRoutes from '@/routes/anamneseRoutes';
import activityRoutes from '@/routes/activityRoutes';
import wellnessRoutes from '@/routes/wellnessRoutes';
import communityRoutes from '@/routes/communityRoutes';
import marketplaceRoutes from '@/routes/marketplaceRoutes';
import healthProviderRoutes from '@/routes/healthProviderRoutes';

const app = express();

// Security middleware
app.use(helmet());
app.use(cors({
  origin: config.corsOrigin,
  credentials: true,
}));

// Compression middleware
app.use(compression());

// Logging middleware
app.use(morgan('combined'));

// Rate limiting
app.use(generalRateLimiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Swagger configuration
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'LikeMe API',
      version: '1.0.0',
      description: 'API para o aplicativo LikeMe - Saúde e Bem-estar',
      contact: {
        name: 'LikeMe Team',
        email: 'contato@likeme.com',
      },
    },
    servers: [
      {
        url: `http://localhost:${config.port}`,
        description: 'Servidor de desenvolvimento',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    },
    security: [
      {
        bearerAuth: [],
      },
    ],
  },
  apis: ['./src/routes/*.ts', './src/controllers/*.ts'],
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);

// API Documentation
app.use(config.apiDocsPath, swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'LikeMe API está funcionando',
    timestamp: new Date().toISOString(),
    environment: config.nodeEnv,
  });
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/anamnese', anamneseRoutes);
app.use('/api/activities', activityRoutes);
app.use('/api/wellness', wellnessRoutes);
app.use('/api/community', communityRoutes);
app.use('/api/marketplace', marketplaceRoutes);
app.use('/api/health-providers', healthProviderRoutes);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Endpoint não encontrado',
    path: req.originalUrl,
  });
});

// Error handling middleware
app.use(errorHandler);

// Start server
const PORT = config.port;

app.listen(PORT, () => {
  console.log(`🚀 LikeMe API rodando na porta ${PORT}`);
  console.log(`📚 Documentação disponível em: http://localhost:${PORT}${config.apiDocsPath}`);
  console.log(`🏥 Health check: http://localhost:${PORT}/health`);
  console.log(`🌍 Ambiente: ${config.nodeEnv}`);
});

export default app;
