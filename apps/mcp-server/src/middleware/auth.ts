import { createClient } from '@supabase/supabase-js';
import { McpServerConfig } from '../config.js';

export interface AuthContext {
  lenserId: string;
  userId: string;
}

export async function validateBearer(
  token: string,
  cfg: McpServerConfig
): Promise<AuthContext | null> {
  try {
    const sb = createClient(cfg.supabaseUrl, cfg.supabaseServiceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data, error } = await sb.auth.getUser(token);
    if (error || !data.user) return null;

    const { data: profile, error: profileError } = await (sb as never as {
      schema: (s: string) => {
        from: (t: string) => {
          select: (c: string) => {
            eq: (col: string, val: string) => {
              single: () => Promise<{ data: { id: string } | null; error: unknown }>;
            };
          };
        };
      };
    })
      .schema('lensers')
      .from('profiles')
      .select('id')
      .eq('auth_user_id', data.user.id)
      .single();

    if (profileError || !profile) return null;

    return { lenserId: profile.id, userId: data.user.id };
  } catch {
    return null;
  }
}
