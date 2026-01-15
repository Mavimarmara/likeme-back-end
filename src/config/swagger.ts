import path from 'path';
import { config } from './index';

const projectRoot = process.cwd();

const getServerUrl = (): string => {
  return '/';
};

const getServerDescription = (): string => {
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
    tags: [
      {
        name: 'Communities',
        description: 'Endpoints relacionados a comunidades, posts, comentários e interações sociais',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Token JWT obtido via login',
        },
        oauth2: {
          type: 'oauth2',
          flows: {
            authorizationCode: {
              authorizationUrl: config.auth0.domain 
                ? `https://${config.auth0.domain}/authorize`
                : '',
              tokenUrl: `${config.baseUrl}/api/auth/swagger-token`,
              scopes: {
                openid: 'OpenID',
                profile: 'User profile',
                email: 'User email',
              },
            },
          },
          description: 'Login via Auth0 (clique em Authorize para redirecionar)',
        },
      },
    },
    security: [
      {
        bearerAuth: [],
      },
      {
        oauth2: ['openid', 'profile', 'email'],
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


