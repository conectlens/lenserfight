import { loadConfig } from '../config/project-config';

let clientModule: typeof import('@supabase/supabase-js') | null = null;

async function getSupabaseModule() {
  if (!clientModule) {
    clientModule = await import('@supabase/supabase-js');
  }
  return clientModule;
}

export async function createClient() {
  const config = loadConfig();
  const { createClient: create } = await getSupabaseModule();
  return create(config.supabaseUrl, config.supabaseAnonKey);
}

export async function createServiceClient() {
  const config = loadConfig();
  if (!config.supabaseServiceRoleKey) {
    throw new Error(
      'supabaseServiceRoleKey not set in .lenserfight.json. Run `lenserfight init` first.'
    );
  }
  const { createClient: create } = await getSupabaseModule();
  return create(config.supabaseUrl, config.supabaseServiceRoleKey);
}
