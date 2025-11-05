import dotenv from 'dotenv';

dotenv.config();

const buildDatabaseUrl = (): string => {
  if (process.env.DATABASE_URL && !process.env.DATABASE_URL.includes('[YOUR-PASSWORD]')) {
    return process.env.DATABASE_URL;
  }

  const supabaseUrl = process.env.SUPABASE_PROJECT_URL;
  const dbPassword = process.env.SUPABASE_DB_PASSWORD;

  if (supabaseUrl && dbPassword) {
    const projectRefMatch = supabaseUrl.match(/https:\/\/([^.]+)\.supabase\.co/);
    
    if (projectRefMatch && projectRefMatch[1]) {
      const projectRef = projectRefMatch[1];
      const usePooling = process.env.SUPABASE_USE_POOLING !== 'false';
      
      if (usePooling) {
        return `postgresql://postgres:${dbPassword}@db.${projectRef}.supabase.co:5432/postgres?pgbouncer=true&connection_limit=1`;
      } else {
        return `postgresql://postgres:${dbPassword}@db.${projectRef}.supabase.co:5432/postgres`;
      }
    }
  }

  return process.env.DATABASE_URL || '';
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
};
