import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { getConfig } from './config.js';

let _client: SupabaseClient | null = null;

export function getServiceClient(): SupabaseClient {
  if (_client) return _client;
  const cfg = getConfig();
  _client = createClient(cfg.supabaseUrl, cfg.supabaseServiceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
  return _client;
}
