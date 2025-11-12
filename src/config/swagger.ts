import path from 'path';

const projectRoot = process.cwd();

const getServerUrl = (): string => {
  // Usar URL relativa "/" para fazer requisições ao mesmo servidor
  // Isso evita problemas de CORS quando o Swagger UI está no mesmo domínio
  // O Swagger fará requisições relativas ao domínio atual
  return '/';
};

const getServerDescription = (): string => {
  // Usando URL relativa, o Swagger fará requisições para o mesmo servidor
  // Isso resolve problemas de CORS automaticamente
  return 'Servidor atual';
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


