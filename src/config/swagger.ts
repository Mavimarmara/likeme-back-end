import path from 'path';

const projectRoot = process.cwd();

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
        url: `http://localhost:${process.env.PORT || 3000}`,
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
  apis: [
    path.resolve(projectRoot, 'src/routes/**/*.ts'),
    path.resolve(projectRoot, 'src/controllers/**/*.ts'),
    path.resolve(projectRoot, 'src/controllers/**/*.docs.ts'),
    path.resolve(projectRoot, 'dist/routes/**/*.js'),
    path.resolve(projectRoot, 'dist/controllers/**/*.js'),
    path.resolve(projectRoot, 'dist/controllers/**/*.docs.js'),
  ],
};


