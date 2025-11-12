import path from 'path';

const projectRoot = process.cwd();

const getServerUrl = (): string => {
  // Em produção no Vercel, usar a URL do Vercel
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }
  
  // Se tiver uma URL base configurada explicitamente
  if (process.env.API_BASE_URL) {
    return process.env.API_BASE_URL;
  }
  
  // Em desenvolvimento, usar localhost
  const port = process.env.PORT || 3000;
  return `http://localhost:${port}`;
};

const getServerDescription = (): string => {
  if (process.env.VERCEL_URL) {
    return 'Servidor de produção (Vercel)';
  }
  if (process.env.API_BASE_URL) {
    return 'Servidor de produção';
  }
  return 'Servidor de desenvolvimento';
};

export const swaggerOptions = {
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
        url: getServerUrl(),
        description: getServerDescription(),
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
  apis: [
    path.resolve(projectRoot, 'src/routes/**/*.ts'),
    path.resolve(projectRoot, 'src/controllers/**/*.ts'),
    path.resolve(projectRoot, 'src/controllers/**/*.docs.ts'),
    path.resolve(projectRoot, 'dist/routes/**/*.js'),
    path.resolve(projectRoot, 'dist/controllers/**/*.js'),
    path.resolve(projectRoot, 'dist/controllers/**/*.docs.js'),
  ],
};


