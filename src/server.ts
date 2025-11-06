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

import authRoutes from '@/routes/authRoutes';
import personRoutes from '@/routes/personRoutes';
import personContactRoutes from '@/routes/personContactRoutes';
import userRoutes from '@/routes/userRoutes';
import roleRoutes from '@/routes/roleRoutes';
import roleGroupRoutes from '@/routes/roleGroupRoutes';
import roleGroupRoleRoutes from '@/routes/roleGroupRoleRoutes';
import roleGroupUserRoutes from '@/routes/roleGroupUserRoutes';
import personalObjectiveRoutes from '@/routes/personalObjectiveRoutes';
import userPersonalObjectiveRoutes from '@/routes/userPersonalObjectiveRoutes';

const app = express();

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

app.use(config.apiDocsPath, swaggerUi.serve, swaggerUi.setup(swaggerSpec));

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
app.use('/api/roles', roleRoutes);
app.use('/api/role-groups', roleGroupRoutes);
app.use('/api/role-group-roles', roleGroupRoleRoutes);
app.use('/api/role-group-users', roleGroupUserRoutes);
app.use('/api/personal-objectives', personalObjectiveRoutes);
app.use('/api/user-personal-objectives', userPersonalObjectiveRoutes);

app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Endpoint não encontrado',
    path: req.originalUrl,
  });
});

app.use(errorHandler);

const PORT = config.port || process.env.PORT || 3000;

if (process.env.VERCEL !== '1') {
  app.listen(PORT, () => {
    console.log(`🚀 LikeMe API rodando na porta ${PORT}`);
    console.log(`📚 Documentação disponível em: http://localhost:${PORT}${config.apiDocsPath}`);
    console.log(`🏥 Health check: http://localhost:${PORT}/health`);
    console.log(`🌍 Ambiente: ${config.nodeEnv}`);
  });
}

export default app;
