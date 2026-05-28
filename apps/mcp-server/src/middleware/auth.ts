import { createClient } from '@supabase/supabase-js';
import { McpServerConfig } from '../config.js';
import { getServiceClient } from '../client.js';

export interface AuthContext {
  lenserId: string;
  userId: string;
  userJwt: string;
}

async function resolveSupabaseJwt(
  token: string,
  cfg: McpServerConfig
): Promise<AuthContext | null> {
  try {
    const sb = createClient(cfg.supabaseUrl, cfg.supabaseServiceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data, error } = await sb.auth.getUser(token);
    if (error || !data.user) return null;

    const { data: lenserId, error: rpcError } = (await sb.rpc(
      'fn_mcp_resolve_lenser_id' as never,
      { p_auth_user_id: data.user.id }
    )) as unknown as { data: string | null; error: { message: string } | null };

    if (rpcError || !lenserId) return null;

    return { lenserId, userId: data.user.id, userJwt: token };
  } catch {
    return null;
  }
}

async function resolveMcpToken(
  token: string,
  cfg: McpServerConfig
): Promise<AuthContext | null> {
  if (!token.startsWith('lf_mcp_')) return null;
  try {
    const svc = getServiceClient();

    const { data: rows, error: tokenErr } = (await svc.rpc(
      'fn_mcp_resolve_token' as never,
      { p_token: token }
    )) as unknown as {
      data: Array<{ lenser_id: string; supabase_refresh_token: string }> | null;
      error: { message: string } | null;
    };

    if (tokenErr || !rows || rows.length === 0) return null;
    const mcpToken = rows[0];

    const anonClient = createClient(cfg.supabaseUrl, cfg.supabaseAnonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: session, error: refreshErr } = await anonClient.auth.refreshSession({
      refresh_token: mcpToken.supabase_refresh_token,
    });
    if (refreshErr || !session.session) return null;

    const freshJwt = session.session.access_token;
    const userId = session.session.user.id;

    return { lenserId: mcpToken.lenser_id, userId, userJwt: freshJwt };
  } catch {
    return null;
  }
}

export async function resolveAuth(
  authHeader: string | undefined,
  cfg: McpServerConfig
): Promise<AuthContext | null> {
  if (!authHeader?.startsWith('Bearer ')) return null;
  const token = authHeader.slice(7);
  if (token.startsWith('lf_mcp_')) return resolveMcpToken(token, cfg);
  return resolveSupabaseJwt(token, cfg);
}

/** @deprecated Use resolveAuth instead */
export async function validateBearer(
  token: string,
  cfg: McpServerConfig
): Promise<Omit<AuthContext, 'userJwt'> | null> {
  const ctx = await resolveSupabaseJwt(token, cfg);
  if (!ctx) return null;
  return { lenserId: ctx.lenserId, userId: ctx.userId };
}
