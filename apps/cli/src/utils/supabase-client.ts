import { resolveConfig as loadConfig } from '@lenserfight/cli-client';

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
  // Without the caller's bearer token, every request (including Storage
  // uploads) runs as an unauthenticated anon session — auth.uid() is NULL
  // inside RLS policies, so any policy gated on auth.uid() IS NOT NULL
  // rejects the request outright, regardless of ownership.
  return create(config.supabaseUrl, config.supabaseAnonKey, {
    global: config.authToken ? { headers: { Authorization: `Bearer ${config.authToken}` } } : undefined,
  });
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
