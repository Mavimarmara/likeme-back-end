import { config } from './index';

export const getSupabaseDatabaseUrl = (password: string): string => {
  if (!config.supabase.projectUrl) {
    throw new Error('SUPABASE_PROJECT_URL não configurada');
  }

  const projectUrl = config.supabase.projectUrl;
  const projectRefMatch = projectUrl.match(/https:\/\/([^.]+)\.supabase\.co/);
  
  if (!projectRefMatch || !projectRefMatch[1]) {
    throw new Error('Formato inválido de SUPABASE_PROJECT_URL');
  }

  const projectRef = projectRefMatch[1];
  const encodedPassword = encodeURIComponent(password);
  
  return `postgresql://postgres:${encodedPassword}@db.${projectRef}.supabase.co:5432/postgres`;
};

export const supabaseConfig = {
  url: config.supabase.projectUrl,
  anonKey: config.supabase.apiKey,
};

