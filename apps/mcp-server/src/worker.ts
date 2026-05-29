/**
 * Cloudflare Worker entry point for the LenserFight MCP server.
 *
 * All tool/service/OAuth logic is shared with apps/mcp-server.
 * Only the HTTP transport layer is Worker-specific (Fetch API, no Node http module).
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { buildServer } from './main.js';
import { buildDiscoveryDocument, buildProtectedResourceDocument } from './oauth/discovery.js';
import { McpServerConfig } from './config.js';

// ---------------------------------------------------------------------------
// Environment bindings
// ---------------------------------------------------------------------------

export interface Env {
  SUPABASE_URL: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
  SUPABASE_ANON_KEY: string;
  SUPABASE_JWT_SECRET: string;
  MCP_OAUTH_BASE_URL: string;
  AUTH_APP_BASE_URL: string;
  LENSERFIGHT_LENSER_ID?: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

type RpcResult<T> = { data: T | null; error: { message: string } | null };

function json(body: unknown, status = 200, extra: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...extra },
  });
}

function serviceClient(env: Env): SupabaseClient {
  return createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function cfgFromEnv(env: Env): McpServerConfig {
  return {
    supabaseUrl: env.SUPABASE_URL,
    supabaseServiceRoleKey: env.SUPABASE_SERVICE_ROLE_KEY,
    supabaseAnonKey: env.SUPABASE_ANON_KEY,
    supabaseJwtSecret: env.SUPABASE_JWT_SECRET,
    mcpOAuthBaseUrl: env.MCP_OAUTH_BASE_URL ?? 'https://mcp.lenserfight.com',
    authAppBaseUrl: env.AUTH_APP_BASE_URL ?? 'https://auth.lenserfight.com',
    lenserId: env.LENSERFIGHT_LENSER_ID,
    transport: 'http',
    httpPort: 443,
  };
}

// ---------------------------------------------------------------------------
// CORS
// ---------------------------------------------------------------------------

const CORS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, Mcp-Session-Id',
  'Access-Control-Expose-Headers': 'Mcp-Session-Id',
};

function withCors(res: Response): Response {
  const h = new Headers(res.headers);
  for (const [k, v] of Object.entries(CORS)) h.set(k, v);
  return new Response(res.body, { status: res.status, headers: h });
}

// ---------------------------------------------------------------------------
// Token helpers (Web Crypto — no Node crypto module)
// ---------------------------------------------------------------------------

function generateToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return 'lf_mcp_' + Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('');
}

async function verifyPkce(codeVerifier: string, codeChallenge: string): Promise<boolean> {
  const enc = new TextEncoder().encode(codeVerifier);
  const hash = await crypto.subtle.digest('SHA-256', enc);
  const b64 = btoa(String.fromCharCode(...new Uint8Array(hash)))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  return b64 === codeChallenge;
}

function parseFormBody(raw: string): Record<string, string> {
  const result: Record<string, string> = {};
  for (const [k, v] of new URLSearchParams(raw)) result[k] = v;
  return result;
}

// ---------------------------------------------------------------------------
// OAuth handlers (pure Fetch API — no Node dependencies)
// ---------------------------------------------------------------------------

async function handleRegister(req: Request, env: Env): Promise<Response> {
  let body: Record<string, unknown> = {};
  try {
    const text = await req.text();
    if (text.trim()) body = JSON.parse(text);
  } catch {
    return json({ error: 'invalid_request', error_description: 'Invalid JSON body' }, 400);
  }

  const redirectUris = Array.isArray(body['redirect_uris'])
    ? (body['redirect_uris'] as string[]).filter((u) => typeof u === 'string')
    : [];
  const clientName = typeof body['client_name'] === 'string'
    ? body['client_name'].slice(0, 120)
    : 'Dynamic MCP Client';

  const svc = serviceClient(env);
  const idBytes = new Uint8Array(16);
  crypto.getRandomValues(idBytes);
  const clientId = 'lf_mcp_client_' + Array.from(idBytes).map((b) => b.toString(16).padStart(2, '0')).join('');

  const { error } = (await svc.rpc('fn_mcp_oauth_register_dynamic_client' as never, {
    p_client_id: clientId,
    p_name: clientName,
    p_redirect_uris: redirectUris,
  } as never)) as RpcResult<void>;

  if (error) {
    console.error('[lenserfight-mcp] register error:', error.message);
    return json({ error: 'server_error', error_description: 'Failed to register client' }, 500);
  }

  return json({
    client_id: clientId,
    client_name: clientName,
    redirect_uris: redirectUris,
    grant_types: ['authorization_code'],
    response_types: ['code'],
    token_endpoint_auth_method: 'none',
    client_id_issued_at: Math.floor(Date.now() / 1000),
  }, 201);
}

async function handleAuthorize(req: Request, env: Env, cfg: McpServerConfig): Promise<Response> {
  const url = new URL(req.url);
  const clientId      = url.searchParams.get('client_id');
  const redirectUri   = url.searchParams.get('redirect_uri');
  const codeChallenge = url.searchParams.get('code_challenge');
  const state         = url.searchParams.get('state');

  if (!clientId || !redirectUri) {
    return json({ error: 'invalid_request', error_description: 'client_id and redirect_uri are required' }, 400);
  }

  const svc = serviceClient(env);

  const { data: client, error: clientErr } = (await svc.rpc('fn_mcp_oauth_lookup_client' as never, {
    p_client_id: clientId,
  } as never)) as RpcResult<{ id: string; redirect_uris: string[]; requires_secret: boolean }[]>;

  const row = client?.[0] ?? null;
  if (clientErr || !row) {
    return json({ error: 'invalid_client', error_description: 'Unknown or inactive client' }, 400);
  }
  if (!row.redirect_uris.includes(redirectUri)) {
    return json({ error: 'invalid_request', error_description: 'redirect_uri not registered' }, 400);
  }

  const { data: authCodeId, error: insertErr } = (await svc.rpc('fn_mcp_oauth_create_auth_code' as never, {
    p_client_id:      clientId,
    p_redirect_uri:   redirectUri,
    p_code_challenge: codeChallenge ?? null,
    p_state:          state ?? null,
  } as never)) as RpcResult<string>;

  if (insertErr || !authCodeId) {
    return json({ error: 'server_error', error_description: 'Failed to create auth session' }, 500);
  }

  const consentUrl = new URL(`${cfg.authAppBaseUrl}/mcp/auth`);
  consentUrl.searchParams.set('id', authCodeId);
  consentUrl.searchParams.set('server', cfg.mcpOAuthBaseUrl);

  return Response.redirect(consentUrl.toString(), 302);
}

async function handleClientInfo(req: Request, env: Env): Promise<Response> {
  const url = new URL(req.url);
  const id = url.searchParams.get('id');
  if (!id) return json({ error: 'invalid_request', error_description: 'id is required' }, 400);

  const svc = serviceClient(env);

  const { data: codeRows } = (await svc.rpc('fn_mcp_oauth_lookup_auth_code' as never, {
    p_id: id,
  } as never)) as RpcResult<{ client_id: string }[]>;

  const codeRow = codeRows?.[0] ?? null;
  if (!codeRow) {
    return json({ error: 'not_found', error_description: 'Authorization session not found or expired' }, 404);
  }

  const { data: clientRows } = (await svc.rpc('fn_mcp_oauth_lookup_client' as never, {
    p_client_id: codeRow.client_id,
  } as never)) as RpcResult<{ id: string; name: string }[]>;

  return json({ client_name: clientRows?.[0]?.name ?? 'Unknown' });
}

async function handleComplete(req: Request, env: Env): Promise<Response> {
  const authHeader = req.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return json({ error: 'unauthorized', error_description: 'Bearer token required' }, 401);
  }
  const jwt = authHeader.slice(7);

  let body: { id?: string; refresh_token?: string } = {};
  try {
    body = await req.json();
  } catch {
    return json({ error: 'invalid_request', error_description: 'Invalid JSON body' }, 400);
  }

  const { id, refresh_token } = body;
  if (!id || !refresh_token) {
    return json({ error: 'invalid_request', error_description: 'id and refresh_token are required' }, 400);
  }

  const svc = serviceClient(env);
  const { data: { user }, error: userErr } = await svc.auth.getUser(jwt);
  if (userErr || !user) {
    return json({ error: 'unauthorized', error_description: 'Invalid or expired token' }, 401);
  }

  const { data: lenserId, error: resolveErr } = (await svc.rpc('fn_mcp_resolve_lenser_id' as never, {
    p_auth_user_id: user.id,
  } as never)) as RpcResult<string>;

  if (resolveErr) console.error('[lenserfight-mcp] fn_mcp_resolve_lenser_id error:', resolveErr.message);
  if (!lenserId) {
    return json({ error: 'forbidden', error_description: 'No Lenser profile found. Complete onboarding first.' }, 403);
  }

  const { data: pendingRows } = (await svc.rpc('fn_mcp_oauth_lookup_auth_code' as never, {
    p_id: id,
  } as never)) as RpcResult<{ id: string; client_id: string; redirect_uri: string; original_state: string | null }[]>;

  const pending = pendingRows?.[0] ?? null;
  if (!pending) {
    return json({ error: 'invalid_request', error_description: 'Authorization session expired. Restart the connector flow.' }, 400);
  }

  const token = generateToken();

  await svc.rpc('fn_mcp_oauth_issue_token' as never, {
    p_client_id:              pending.client_id,
    p_lenser_id:              lenserId,
    p_token:                  token,
    p_supabase_refresh_token: refresh_token,
  } as never);

  await svc.rpc('fn_mcp_oauth_complete_auth_code' as never, {
    p_id:                     pending.id,
    p_code:                   token,
    p_lenser_id:              lenserId,
    p_supabase_refresh_token: refresh_token,
  } as never);

  console.log(`[lenserfight-mcp] complete: issued ${token.slice(0, 16)}... for lenser ${lenserId}`);

  return json({ code: token, redirect_uri: pending.redirect_uri, state: pending.original_state });
}

async function handleToken(req: Request, env: Env): Promise<Response> {
  const contentType = req.headers.get('content-type') ?? '';
  const rawBody = await req.text();
  const body: Record<string, string> = contentType.includes('application/json')
    ? JSON.parse(rawBody)
    : parseFormBody(rawBody);

  const { grant_type, code, client_id, client_secret, redirect_uri, code_verifier } = body;

  if (grant_type !== 'authorization_code') {
    return json({ error: 'unsupported_grant_type' }, 400);
  }
  if (!code || !client_id || !redirect_uri) {
    return json({ error: 'invalid_request', error_description: 'code, client_id, and redirect_uri are required' }, 400);
  }

  const svc = serviceClient(env);

  const { data: codeRows, error: codeErr } = (await svc.rpc('fn_mcp_oauth_exchange_code' as never, {
    p_code:      code,
    p_client_id: client_id,
  } as never)) as RpcResult<{
    id: string;
    redirect_uri: string;
    lenser_id: string;
    supabase_refresh_token: string;
    code_challenge: string | null;
    expires_at: string | null;
  }[]>;

  const authCode = codeRows?.[0] ?? null;
  if (codeErr || !authCode) {
    return json({ error: 'invalid_grant', error_description: 'Invalid or expired authorization code' }, 400);
  }
  if (authCode.expires_at && new Date(authCode.expires_at) < new Date()) {
    return json({ error: 'invalid_grant', error_description: 'Authorization code expired' }, 400);
  }
  if (authCode.redirect_uri !== redirect_uri) {
    return json({ error: 'invalid_grant', error_description: 'redirect_uri mismatch' }, 400);
  }

  if (authCode.code_challenge) {
    if (!code_verifier || !(await verifyPkce(code_verifier, authCode.code_challenge))) {
      return json({ error: 'invalid_grant', error_description: 'PKCE verification failed' }, 400);
    }
  }

  if (client_secret) {
    const { data: secretMatch, error: secretErr } = (await svc.rpc('verify_mcp_client_secret' as never, {
      p_client_id: client_id,
      p_secret:    client_secret,
    } as never)) as RpcResult<boolean>;

    if (secretErr || !secretMatch) {
      return json({ error: 'invalid_client', error_description: 'Invalid client credentials' }, 401);
    }
  } else if (!authCode.code_challenge) {
    const { data: clientRows } = (await svc.rpc('fn_mcp_oauth_lookup_client' as never, {
      p_client_id: client_id,
    } as never)) as RpcResult<{ requires_secret: boolean }[]>;

    const clientRow = clientRows?.[0] ?? null;
    if (!clientRow || clientRow.requires_secret) {
      return json({ error: 'invalid_client', error_description: 'client_secret required' }, 401);
    }
  }

  const accessToken = code.startsWith('lf_mcp_') ? code : generateToken();

  if (accessToken !== code) {
    await svc.rpc('fn_mcp_oauth_issue_token' as never, {
      p_client_id:              client_id,
      p_lenser_id:              authCode.lenser_id,
      p_token:                  accessToken,
      p_supabase_refresh_token: authCode.supabase_refresh_token,
    } as never);
  }

  return json({ access_token: accessToken, token_type: 'bearer', expires_in: null }, 200,
    { 'Cache-Control': 'no-store' });
}

// ---------------------------------------------------------------------------
// MCP JSON-RPC dispatcher (stateless — no Node StreamableHTTPServerTransport)
// ---------------------------------------------------------------------------

type RegisteredTool = {
  name: string;
  description?: string;
  inputSchema?: Record<string, unknown>;
  callback: (args: Record<string, unknown>) => Promise<unknown>;
};

// Token validation that reads directly from Worker env bindings (not process.env)
async function resolveAuthWorker(
  authHeader: string,
  env: Env
): Promise<{ lenserId: string; userJwt: string } | null> {
  const token = authHeader.slice(7);
  const svc = serviceClient(env);

  if (token.startsWith('lf_mcp_')) {
    // Resolve our custom token → get stored refresh token
    const { data: rows, error } = (await svc.rpc('fn_mcp_resolve_token' as never, {
      p_token: token,
    } as never)) as RpcResult<{ lenser_id: string; supabase_refresh_token: string }[]>;

    if (error || !rows || rows.length === 0) return null;
    const row = rows[0];

    // Exchange refresh token for a fresh JWT
    const anonClient = createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: session, error: refreshErr } = await anonClient.auth.refreshSession({
      refresh_token: row.supabase_refresh_token,
    });
    if (refreshErr || !session.session) return null;

    return { lenserId: row.lenser_id, userJwt: session.session.access_token };
  }

  // Fall back to validating as a raw Supabase JWT
  const { data, error } = await svc.auth.getUser(token);
  if (error || !data.user) return null;

  const { data: lenserId, error: rpcErr } = (await svc.rpc('fn_mcp_resolve_lenser_id' as never, {
    p_auth_user_id: data.user.id,
  } as never)) as RpcResult<string>;

  if (rpcErr || !lenserId) return null;
  return { lenserId, userJwt: token };
}

function getTools(server: ReturnType<typeof buildServer>): RegisteredTool[] {
  const s = server as unknown as Record<string, unknown>;
  const reg = (s['_registeredTools'] ?? (s['server'] as Record<string, unknown>)?.['_registeredTools']) as
    | Map<string, RegisteredTool>
    | Record<string, RegisteredTool>
    | undefined;
  if (!reg) {
    console.error('[lenserfight-mcp] could not locate _registeredTools');
    return [];
  }
  return reg instanceof Map
    ? Array.from(reg.entries()).map(([name, t]) => ({ name, ...t }))
    : Object.entries(reg).map(([name, t]) => ({ name, ...t }));
}


async function handleMcp(req: Request, env: Env, cfg: McpServerConfig): Promise<Response> {
  const authHeader = req.headers.get('authorization');

  if (!authHeader?.startsWith('Bearer ')) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: {
        ...CORS,
        'Content-Type': 'application/json',
        'WWW-Authenticate': `Bearer realm="${cfg.mcpOAuthBaseUrl}", as_uri="${cfg.mcpOAuthBaseUrl}", resource_metadata="${cfg.mcpOAuthBaseUrl}/.well-known/oauth-protected-resource"`,
      },
    });
  }

  // GET /mcp — SSE stream for server-pushed notifications. Workers can't keep long-lived
  // connections in the free tier; return 405 so the client falls back to polling.
  if (req.method === 'GET') {
    return json({ error: 'method_not_allowed', error_description: 'Use POST for stateless MCP requests.' }, 405, { Allow: 'POST' });
  }

  const ctx = await resolveAuthWorker(authHeader, env);
  if (!ctx) {
    return json({ error: 'Invalid or expired token' }, 401);
  }

  // Per-request McpServer scoped to the authenticated user
  const userClient = createClient(cfg.supabaseUrl, cfg.supabaseAnonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${ctx.userJwt}` } },
  });
  const server = buildServer(userClient);
  const tools = getTools(server);

  let msg: Record<string, unknown>;
  try {
    msg = await req.json();
  } catch {
    return json({ jsonrpc: '2.0', id: null, error: { code: -32700, message: 'Parse error' } }, 400);
  }

  console.log(`[lenserfight-mcp] ${req.method} /mcp method=${msg['method']} id=${msg['id']}`);

  const handleOne = async (m: Record<string, unknown>): Promise<Record<string, unknown> | null> => {
    const { id, method, params } = m as { id: unknown; method: string; params?: Record<string, unknown> };

    if (method === 'initialize') {
      return {
        jsonrpc: '2.0', id,
        result: {
          protocolVersion: (params?.['protocolVersion'] as string) ?? '2025-06-18',
          serverInfo: { name: 'lenserfight', version: '1.0.0' },
          capabilities: { tools: { listChanged: false } },
        },
      };
    }

    if (method === 'ping') return { jsonrpc: '2.0', id, result: {} };

    if (typeof method === 'string' && method.startsWith('notifications/')) return null;

    if (method === 'tools/list') {
      return {
        jsonrpc: '2.0', id,
        result: {
          tools: tools.map((t) => ({
            name: t.name,
            description: t.description ?? '',
            inputSchema: t.inputSchema ?? { type: 'object', properties: {} },
          })),
        },
      };
    }

    if (method === 'tools/call') {
      const name = (params?.['name'] as string | undefined);
      const args = (params?.['arguments'] as Record<string, unknown>) ?? {};
      const tool = tools.find((t) => t.name === name);
      if (!tool) {
        return { jsonrpc: '2.0', id, error: { code: -32602, message: `Unknown tool: ${name}` } };
      }
      try {
        const result = await tool.callback(args);
        return { jsonrpc: '2.0', id, result };
      } catch (e) {
        const err = e as Error;
        console.error(`[lenserfight-mcp] tool ${name} threw: ${err.message}`);
        return { jsonrpc: '2.0', id, error: { code: -32603, message: err.message } };
      }
    }

    return { jsonrpc: '2.0', id, error: { code: -32601, message: `Method not found: ${method}` } };
  };

  try {
    const responses = Array.isArray(msg)
      ? (await Promise.all((msg as Record<string, unknown>[]).map(handleOne))).filter(Boolean)
      : await handleOne(msg);

    if (responses === null || (Array.isArray(responses) && responses.length === 0)) {
      return new Response(null, { status: 202, headers: CORS });
    }

    return json(responses, 200);
  } catch (e) {
    const err = e as Error;
    console.error(`[lenserfight-mcp] handler threw: ${err.message}`);
    return json({ jsonrpc: '2.0', id: msg['id'] ?? null, error: { code: -32603, message: err.message } }, 500);
  }
}

// ---------------------------------------------------------------------------
// Main fetch handler
// ---------------------------------------------------------------------------

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const url = new URL(req.url);
    const cfg = cfgFromEnv(env);

    if (req.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS });
    }

    // Well-known endpoints
    if (url.pathname === '/.well-known/oauth-authorization-server') {
      return withCors(json(buildDiscoveryDocument(cfg), 200, { 'Cache-Control': 'no-store' }));
    }
    if (
      url.pathname === '/.well-known/oauth-protected-resource' ||
      url.pathname === '/.well-known/oauth-protected-resource/mcp'
    ) {
      return withCors(json(buildProtectedResourceDocument(cfg), 200, { 'Cache-Control': 'no-store' }));
    }

    // Health
    if (url.pathname === '/health') {
      return withCors(json({ status: 'ok', server: 'lenserfight-mcp', version: '1.0.0' }));
    }

    // OAuth endpoints
    if (url.pathname === '/oauth/register') {
      if (req.method !== 'POST') return withCors(json({ error: 'method_not_allowed' }, 405));
      return withCors(await handleRegister(req, env));
    }
    if (url.pathname === '/oauth/authorize') {
      if (req.method !== 'GET') return withCors(json({ error: 'method_not_allowed' }, 405));
      return await handleAuthorize(req, env, cfg);
    }
    if (url.pathname === '/oauth/client-info') {
      if (req.method !== 'GET') return withCors(json({ error: 'method_not_allowed' }, 405));
      return withCors(await handleClientInfo(req, env));
    }
    if (url.pathname === '/oauth/complete') {
      if (req.method !== 'POST') return withCors(json({ error: 'method_not_allowed' }, 405));
      return withCors(await handleComplete(req, env));
    }
    if (url.pathname === '/oauth/token') {
      if (req.method !== 'POST') return withCors(json({ error: 'method_not_allowed' }, 405));
      return withCors(await handleToken(req, env));
    }

    // MCP
    if (url.pathname === '/mcp') {
      return withCors(await handleMcp(req, env, cfg));
    }

    return withCors(json({ error: 'Not found' }, 404));
  },
} satisfies { fetch(req: Request, env: Env): Promise<Response> };
