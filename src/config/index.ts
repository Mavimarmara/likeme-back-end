import dotenv from 'dotenv';

dotenv.config();

const buildDatabaseUrl = (): string => {
  const existingUrl = process.env.DATABASE_URL;
  
  if (existingUrl && !existingUrl.includes('[YOUR-PASSWORD]') && !existingUrl.includes('[YOUR-PROJECT-REF]')) {
    return existingUrl;
  }

  const supabaseUrl = process.env.SUPABASE_PROJECT_URL;
  const dbPassword = process.env.SUPABASE_DB_PASSWORD;

  if (supabaseUrl && dbPassword) {
    const projectRefMatch = supabaseUrl.match(/https:\/\/([^.]+)\.supabase\.co/);
    
    if (projectRefMatch && projectRefMatch[1]) {
      const projectRef = projectRefMatch[1];
      const encodedPassword = encodeURIComponent(dbPassword);
      const usePooling = process.env.SUPABASE_USE_POOLING !== 'false';
      
      if (usePooling) {
        return `postgresql://postgres:${encodedPassword}@db.${projectRef}.supabase.co:5432/postgres?pgbouncer=true&connection_limit=1`;
      } else {
        return `postgresql://postgres:${encodedPassword}@db.${projectRef}.supabase.co:5432/postgres`;
      }
    }
  }

  return '';
};

export const config = {
  port: process.env.PORT || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',
  databaseUrl: buildDatabaseUrl(),
  supabase: {
    projectUrl: process.env.SUPABASE_PROJECT_URL || '',
    apiKey: process.env.SUPABASE_API_KEY || '',
  },
  jwtSecret: process.env.JWT_SECRET || 'your-secret-key',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  email: {
    host: process.env.EMAIL_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.EMAIL_PORT || '587'),
    user: process.env.EMAIL_USER || '',
    pass: process.env.EMAIL_PASS || '',
  },
  cloudinary: {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME || '',
    apiKey: process.env.CLOUDINARY_API_KEY || '',
    apiSecret: process.env.CLOUDINARY_API_SECRET || '',
  },
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'),
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'),
  },
  corsOrigin: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:3000'],
  apiDocsPath: process.env.API_DOCS_PATH || '/api-docs',
  baseUrl: process.env.API_BASE_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : `http://localhost:${process.env.PORT || 3000}`),
  auth0: {
    domain: process.env.AUTH0_DOMAIN || '',
    clientId: process.env.AUTH0_CLIENT_ID || '',
    clientSecret: process.env.AUTH0_CLIENT_SECRET || '',
    issuer: process.env.AUTH0_DOMAIN ? `https://${process.env.AUTH0_DOMAIN}/` : '',
  },
  socialPlus: (() => {
    const region = process.env.SOCIAL_PLUS_REGION || 'EU'; // US, EU, SG - padrão EU conforme exemplo
    // URLs base por região
    const baseUrls: Record<string, string> = {
      US: 'https://apix.us.amity.co/api',
      EU: 'https://apix.eu.amity.co/api',
      SG: 'https://apix.sg.amity.co/api',
    };
    
    const apiKey = process.env.SOCIAL_PLUS_API_KEY || '';
    const serverKey = process.env.SOCIAL_PLUS_SERVER_KEY || '';
    
      console.log('[Config] Social.plus config:', {
        hasApiKey: !!apiKey,
        apiKeyLength: apiKey.length,
        hasServerKey: !!serverKey,
        serverKeyLength: serverKey.length,
        region,
        baseUrl: process.env.SOCIAL_PLUS_BASE_URL || baseUrls[region.toUpperCase()] || baseUrls.EU,
      });
    
    return {
      apiKey,
      serverKey,
      region,
      baseUrl: process.env.SOCIAL_PLUS_BASE_URL || baseUrls[region.toUpperCase()] || baseUrls.EU,
      tokenTtlMs: parseInt(process.env.SOCIAL_PLUS_TOKEN_TTL_MS || '300000', 10), // default 5 min
    };
  })(),
};
