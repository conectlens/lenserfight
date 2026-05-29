import * as http from 'http';
import * as crypto from 'crypto';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { SupabaseClient } from '@supabase/supabase-js';
import { McpServerConfig } from '../config.js';
import { buildDiscoveryDocument, buildProtectedResourceDocument } from '../oauth/discovery.js';
import { resolveAuth } from '../middleware/auth.js';
import { getServiceClient, createUserScopedClient } from '../client.js';

interface Session {
  server: McpServer;
  transport: StreamableHTTPServerTransport;
}

const sessions = new Map<string, Session>();

function readBody(req: http.IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on('data', (chunk: Buffer) => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf-8')));
    req.on('error', reject);
  });
}

export function parseFormBody(raw: string): Record<string, string> {
  const params = new URLSearchParams(raw);
  const result: Record<string, string> = {};
  for (const [k, v] of params.entries()) result[k] = v;
  return result;
}

function jsonResponse(res: http.ServerResponse, status: number, body: unknown): void {
  const payload = JSON.stringify(body);
  res.setHeader('Content-Type', 'application/json');
  res.writeHead(status);
  res.end(payload);
}

export function generateToken(): string {
  return `lf_mcp_${crypto.randomBytes(32).toString('hex')}`;
}

export function verifyPkce(codeVerifier: string, codeChallenge: string): boolean {
  const digest = crypto.createHash('sha256').update(codeVerifier).digest();
  return digest.toString('base64url') === codeChallenge;
}

export { escapeHtml };

// ---------------------------------------------------------------------------
// RPC result types
// ---------------------------------------------------------------------------

type RpcResult<T> = { data: T | null; error: { message: string } | null };

// ---------------------------------------------------------------------------
// OAuth handlers — all DB access via public.fn_mcp_oauth_* RPCs
// ---------------------------------------------------------------------------

async function handleRegister(
  req: http.IncomingMessage,
  res: http.ServerResponse
): Promise<void> {
  let body: Record<string, unknown> = {};
  try {
    const raw = await readBody(req);
    if (raw.trim()) body = JSON.parse(raw) as Record<string, unknown>;
  } catch {
    jsonResponse(res, 400, { error: 'invalid_request', error_description: 'Invalid JSON body' });
    return;
  }

  const redirectUris = Array.isArray(body['redirect_uris'])
    ? (body['redirect_uris'] as string[]).filter((u) => typeof u === 'string')
    : [];
  const clientName =
    typeof body['client_name'] === 'string' ? body['client_name'].slice(0, 120) : 'Dynamic MCP Client';

  const svc = getServiceClient();
  const clientId = `lf_mcp_client_${crypto.randomBytes(16).toString('hex')}`;

  // Register via RPC so we stay in the public schema
  const { error } = (await svc.rpc('fn_mcp_oauth_register_dynamic_client' as never, {
    p_client_id:    clientId,
    p_name:         clientName,
    p_redirect_uris: redirectUris,
  } as never)) as RpcResult<void>;

  if (error) {
    process.stderr.write(`[lenserfight-mcp] register error: ${error.message}\n`);
    jsonResponse(res, 500, { error: 'server_error', error_description: 'Failed to register client' });
    return;
  }

  jsonResponse(res, 201, {
    client_id: clientId,
    client_name: clientName,
    redirect_uris: redirectUris,
    grant_types: ['authorization_code'],
    response_types: ['code'],
    token_endpoint_auth_method: 'none',
    client_id_issued_at: Math.floor(Date.now() / 1000),
  });
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c] as string));
}

async function handleAuthorize(
  res: http.ServerResponse,
  url: URL,
  cfg: McpServerConfig
): Promise<void> {
  const clientId      = url.searchParams.get('client_id');
  const redirectUri   = url.searchParams.get('redirect_uri');
  const codeChallenge = url.searchParams.get('code_challenge');
  const state         = url.searchParams.get('state');

  if (!clientId || !redirectUri) {
    jsonResponse(res, 400, { error: 'invalid_request', error_description: 'client_id and redirect_uri are required' });
    return;
  }

  const svc = getServiceClient();

  const { data: client, error: clientErr } = (await svc.rpc('fn_mcp_oauth_lookup_client' as never, {
    p_client_id: clientId,
  } as never)) as RpcResult<{ id: string; redirect_uris: string[]; requires_secret: boolean }[]>;

  const row = client?.[0] ?? null;
  if (clientErr || !row) {
    jsonResponse(res, 400, { error: 'invalid_client', error_description: 'Unknown or inactive client' });
    return;
  }

  if (!row.redirect_uris.includes(redirectUri)) {
    jsonResponse(res, 400, { error: 'invalid_request', error_description: 'redirect_uri not registered' });
    return;
  }

  const { data: authCodeId, error: insertErr } = (await svc.rpc('fn_mcp_oauth_create_auth_code' as never, {
    p_client_id:      clientId,
    p_redirect_uri:   redirectUri,
    p_code_challenge: codeChallenge ?? null,
    p_state:          state ?? null,
  } as never)) as RpcResult<string>;

  if (insertErr || !authCodeId) {
    jsonResponse(res, 500, { error: 'server_error', error_description: 'Failed to create auth session' });
    return;
  }

  // Redirect to the auth app consent page, passing the tunnel URL so the
  // consent page knows which server to call /oauth/complete back on.
  const consentUrl = new URL(`${cfg.authAppBaseUrl}/mcp/auth`);
  consentUrl.searchParams.set('id', authCodeId);
  consentUrl.searchParams.set('server', cfg.mcpOAuthBaseUrl);

  res.setHeader('Location', consentUrl.toString());
  res.writeHead(302);
  res.end();
}

async function handleClientInfo(
  res: http.ServerResponse,
  url: URL
): Promise<void> {
  const id = url.searchParams.get('id');
  if (!id) {
    jsonResponse(res, 400, { error: 'invalid_request', error_description: 'id is required' });
    return;
  }

  const svc = getServiceClient();

  const { data: codeRows } = (await svc.rpc('fn_mcp_oauth_lookup_auth_code' as never, {
    p_id: id,
  } as never)) as RpcResult<{ client_id: string }[]>;

  const codeRow = codeRows?.[0] ?? null;
  if (!codeRow) {
    jsonResponse(res, 404, { error: 'not_found', error_description: 'Authorization session not found or expired' });
    return;
  }

  const { data: clientRows } = (await svc.rpc('fn_mcp_oauth_lookup_client' as never, {
    p_client_id: codeRow.client_id,
  } as never)) as RpcResult<{ id: string; name: string; redirect_uris: string[]; requires_secret: boolean }[]>;

  jsonResponse(res, 200, { client_name: clientRows?.[0]?.name ?? 'Unknown' });
}

async function handleComplete(
  req: http.IncomingMessage,
  res: http.ServerResponse
): Promise<void> {
  const authHeader = req.headers['authorization'];
  if (!authHeader?.startsWith('Bearer ')) {
    jsonResponse(res, 401, { error: 'unauthorized', error_description: 'Bearer token required' });
    return;
  }
  const jwt = authHeader.slice(7);

  let body: { id?: string; refresh_token?: string } = {};
  try {
    const raw = await readBody(req);
    body = JSON.parse(raw) as { id?: string; refresh_token?: string };
  } catch {
    jsonResponse(res, 400, { error: 'invalid_request', error_description: 'Invalid JSON body' });
    return;
  }

  const { id, refresh_token } = body;
  if (!id || !refresh_token) {
    jsonResponse(res, 400, { error: 'invalid_request', error_description: 'id and refresh_token are required' });
    return;
  }

  // Use service client to validate user JWT — local Supabase validates local tokens
  const svc = getServiceClient();
  const { data: { user }, error: userErr } = await svc.auth.getUser(jwt);
  if (userErr || !user) {
    jsonResponse(res, 401, { error: 'unauthorized', error_description: 'Invalid or expired token' });
    return;
  }

  const { data: lenserId, error: resolveErr } = (await svc.rpc('fn_mcp_resolve_lenser_id' as never, {
    p_auth_user_id: user.id,
  } as never)) as RpcResult<string>;

  if (resolveErr) {
    process.stderr.write(`[lenserfight-mcp] fn_mcp_resolve_lenser_id error for user ${user.id}: ${resolveErr.message}\n`);
  }
  if (!lenserId) {
    jsonResponse(res, 403, { error: 'forbidden', error_description: 'No Lenser profile found. Complete onboarding first.' });
    return;
  }

  const { data: pendingRows } = (await svc.rpc('fn_mcp_oauth_lookup_auth_code' as never, {
    p_id: id,
  } as never)) as RpcResult<{ id: string; client_id: string; redirect_uri: string; original_state: string | null }[]>;

  const pending = pendingRows?.[0] ?? null;
  if (!pending) {
    jsonResponse(res, 400, { error: 'invalid_request', error_description: 'Authorization session expired. Restart the connector flow.' });
    return;
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

  process.stderr.write(`[lenserfight-mcp] complete: issued ${token.slice(0, 16)}... for lenser ${lenserId}\n`);

  jsonResponse(res, 200, {
    code:         token,
    redirect_uri: pending.redirect_uri,
    state:        pending.original_state,
  });
}

async function handleToken(
  req: http.IncomingMessage,
  res: http.ServerResponse
): Promise<void> {
  const rawBody = await readBody(req);
  const contentType = req.headers['content-type'] ?? '';
  const body = contentType.includes('application/json')
    ? (JSON.parse(rawBody) as Record<string, string>)
    : parseFormBody(rawBody);
  const { grant_type, code, client_id, client_secret, redirect_uri, code_verifier } = body;

  if (grant_type !== 'authorization_code') {
    jsonResponse(res, 400, { error: 'unsupported_grant_type' });
    return;
  }
  if (!code || !client_id || !redirect_uri) {
    jsonResponse(res, 400, { error: 'invalid_request', error_description: 'code, client_id, and redirect_uri are required' });
    return;
  }

  const svc = getServiceClient();

  // Exchange code (atomically marks used_at)
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
    jsonResponse(res, 400, { error: 'invalid_grant', error_description: 'Invalid or expired authorization code' });
    return;
  }

  if (authCode.expires_at && new Date(authCode.expires_at) < new Date()) {
    jsonResponse(res, 400, { error: 'invalid_grant', error_description: 'Authorization code expired' });
    return;
  }

  if (authCode.redirect_uri !== redirect_uri) {
    jsonResponse(res, 400, { error: 'invalid_grant', error_description: 'redirect_uri mismatch' });
    return;
  }

  if (authCode.code_challenge) {
    if (!code_verifier || !verifyPkce(code_verifier, authCode.code_challenge)) {
      jsonResponse(res, 400, { error: 'invalid_grant', error_description: 'PKCE verification failed' });
      return;
    }
  }

  // Client authentication: if a secret was sent, verify it.
  // If not, PKCE code_verifier (already checked above) is sufficient for public clients.
  if (client_secret) {
    const { data: secretMatch, error: secretErr } = (await svc.rpc('verify_mcp_client_secret' as never, {
      p_client_id: client_id,
      p_secret:    client_secret,
    } as never)) as RpcResult<boolean>;

    if (secretErr || !secretMatch) {
      jsonResponse(res, 401, { error: 'invalid_client', error_description: 'Invalid client credentials' });
      return;
    }
  } else if (!authCode.code_challenge) {
    // No secret AND no PKCE — only allowed if client explicitly permits it
    const { data: clientRows } = (await svc.rpc('fn_mcp_oauth_lookup_client' as never, {
      p_client_id: client_id,
    } as never)) as RpcResult<{ requires_secret: boolean }[]>;

    const clientRow = clientRows?.[0] ?? null;
    if (!clientRow || clientRow.requires_secret) {
      jsonResponse(res, 401, { error: 'invalid_client', error_description: 'client_secret required' });
      return;
    }
  }

  // If the code is already a valid bearer token (dual-mode), return it as-is.
  // Otherwise mint a new one and store it.
  const accessToken = code.startsWith('lf_mcp_') ? code : generateToken();

  if (accessToken !== code) {
    await svc.rpc('fn_mcp_oauth_issue_token' as never, {
      p_client_id:              client_id,
      p_lenser_id:              authCode.lenser_id,
      p_token:                  accessToken,
      p_supabase_refresh_token: authCode.supabase_refresh_token,
    } as never);
  }

  jsonResponse(res, 200, {
    access_token: accessToken,
    token_type:   'bearer',
    expires_in:   null,
  });
}

// ---------------------------------------------------------------------------
// Local dev client bootstrap
// ---------------------------------------------------------------------------

const LOCAL_CLIENT_ID = 'lf_mcp_client_localdev';

async function ensureLocalDevClient(): Promise<void> {
  const svc = getServiceClient();
  const { error } = (await svc.rpc('fn_mcp_ensure_local_dev_client' as never, {
    p_client_id: LOCAL_CLIENT_ID,
  } as never)) as RpcResult<void>;

  if (error) {
    process.stderr.write(`[lenserfight-mcp] WARN: could not upsert local dev client: ${error.message}\n`);
  }
}

// ---------------------------------------------------------------------------
// HTTP boot
// ---------------------------------------------------------------------------

// Auto-detect a public tunnel URL. Supports ngrok today; other tunnels (cloudflared,
// localtunnel, tailscale funnel, etc.) can be wired up via MCP_OAUTH_BASE_URL.
async function detectPublicTunnel(localPort: number): Promise<string | null> {
  // ngrok exposes its API on 127.0.0.1:4040 — find the HTTPS tunnel pointing at our port.
  try {
    const resp = await fetch('http://127.0.0.1:4040/api/tunnels');
    if (resp.ok) {
      const data = (await resp.json()) as {
        tunnels?: Array<{ public_url: string; proto: string; config?: { addr?: string } }>;
      };
      const match = data.tunnels?.find(
        (t) =>
          t.proto === 'https' &&
          (t.config?.addr?.endsWith(`:${localPort}`) ?? true)
      );
      if (match?.public_url) return match.public_url;
    }
  } catch {
    // ngrok not running, try other detection methods below
  }
  return null;
}

export async function bootHttp(
  buildServer: (sb: SupabaseClient, lenserId?: string) => McpServer,
  cfg: McpServerConfig
): Promise<void> {
  // Claude.ai's cloud calls /oauth/token and /mcp from Anthropic's servers — they cannot
  // reach localhost. The discovery doc MUST advertise a publicly reachable URL.
  const isLocal =
    cfg.mcpOAuthBaseUrl.includes('localhost') || cfg.mcpOAuthBaseUrl.includes('127.0.0.1');

  if (isLocal) {
    const tunnelUrl = await detectPublicTunnel(cfg.httpPort);
    if (tunnelUrl) {
      cfg.mcpOAuthBaseUrl = tunnelUrl;
      process.stderr.write(`[lenserfight-mcp] auto-detected public tunnel: ${tunnelUrl}\n`);
    } else {
      process.stderr.write(
        `\n` +
        `  ╔══════════════════════════════════════════════════════════════════════════╗\n` +
        `  ║  ⚠️  PUBLIC URL REQUIRED                                                  ║\n` +
        `  ║                                                                          ║\n` +
        `  ║  MCP_OAUTH_BASE_URL points at ${cfg.mcpOAuthBaseUrl.padEnd(43)}║\n` +
        `  ║  Claude.ai's cloud cannot reach localhost — token exchange will fail.    ║\n` +
        `  ║                                                                          ║\n` +
        `  ║  Pick one:                                                               ║\n` +
        `  ║   • Run 'ngrok http ${String(cfg.httpPort).padEnd(6)}' (auto-detected on startup), or         ║\n` +
        `  ║   • Run 'cloudflared tunnel --url http://localhost:${String(cfg.httpPort).padEnd(5)}', or        ║\n` +
        `  ║   • Set MCP_OAUTH_BASE_URL=https://your-public-url before starting       ║\n` +
        `  ╚══════════════════════════════════════════════════════════════════════════╝\n` +
        `\n`
      );
    }
  }

  await ensureLocalDevClient();

  const httpServer = http.createServer(async (req, res) => {
    try {
    const url = new URL(req.url ?? '/', `http://localhost:${cfg.httpPort}`);

    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Mcp-Session-Id, ngrok-skip-browser-warning');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
    // ngrok-skip-browser-warning bypasses the ngrok free-tier interstitial for browser fetch calls.
    res.setHeader('ngrok-skip-browser-warning', 'true');

    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }

    if (url.pathname === '/.well-known/oauth-authorization-server') {
      res.setHeader('Content-Type', 'application/json');
      res.writeHead(200);
      res.end(JSON.stringify(buildDiscoveryDocument(cfg)));
      return;
    }

    // RFC 9728 — Claude.ai hits this first to discover the authorization server
    if (
      url.pathname === '/.well-known/oauth-protected-resource' ||
      url.pathname === '/.well-known/oauth-protected-resource/mcp'
    ) {
      res.setHeader('Content-Type', 'application/json');
      res.writeHead(200);
      res.end(JSON.stringify(buildProtectedResourceDocument(cfg)));
      return;
    }

    if (url.pathname === '/health') {
      res.setHeader('Content-Type', 'application/json');
      res.writeHead(200);
      res.end(JSON.stringify({ status: 'ok', server: 'lenserfight-mcp', version: '1.0.0' }));
      return;
    }

    // RFC 7591 — dynamic client registration
    if (url.pathname === '/oauth/register') {
      if (req.method !== 'POST') { jsonResponse(res, 405, { error: 'method_not_allowed' }); return; }
      await handleRegister(req, res);
      return;
    }

    if (url.pathname === '/oauth/authorize') {
      if (req.method !== 'GET') { jsonResponse(res, 405, { error: 'method_not_allowed' }); return; }
      await handleAuthorize(res, url, cfg);
      return;
    }

    if (url.pathname === '/oauth/client-info') {
      if (req.method !== 'GET') { jsonResponse(res, 405, { error: 'method_not_allowed' }); return; }
      await handleClientInfo(res, url);
      return;
    }

    if (url.pathname === '/oauth/complete') {
      if (req.method !== 'POST') { jsonResponse(res, 405, { error: 'method_not_allowed' }); return; }
      await handleComplete(req, res);
      return;
    }

    if (url.pathname === '/oauth/token') {
      if (req.method !== 'POST') { jsonResponse(res, 405, { error: 'method_not_allowed' }); return; }
      await handleToken(req, res);
      return;
    }

    if (url.pathname !== '/mcp') {
      res.writeHead(404);
      res.end(JSON.stringify({ error: 'Not found' }));
      return;
    }

    // ---- MCP endpoint ----
    const authHeader = req.headers['authorization'];
    if (!authHeader?.startsWith('Bearer ')) {
      process.stderr.write(`[lenserfight-mcp] /mcp no Bearer header (got ${JSON.stringify(authHeader ?? null)})\n`);
      jsonResponse(res, 401, { error: 'Unauthorized', hint: 'Provide Authorization: Bearer <token>' });
      return;
    }

    process.stderr.write(`[lenserfight-mcp] /mcp Bearer ${authHeader.slice(7, 27)}...\n`);

    const ctx = await resolveAuth(authHeader, cfg);
    if (!ctx) {
      jsonResponse(res, 401, { error: 'Invalid or expired token' });
      return;
    }

    const sessionId = req.headers['mcp-session-id'] as string | undefined;

    if (sessionId && sessions.has(sessionId)) {
      const session = sessions.get(sessionId)!;
      await session.transport.handleRequest(req, res);
      return;
    }

    const userClient = createUserScopedClient(cfg.supabaseUrl, cfg.supabaseAnonKey, ctx.userJwt);
    const server = buildServer(userClient, ctx.lenserId);

    const newSessionId = `${Date.now()}-${crypto.randomBytes(6).toString('hex')}`;
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: () => newSessionId,
    });

    sessions.set(newSessionId, { server, transport });
    transport.onclose = () => { sessions.delete(newSessionId); };

    await server.connect(transport);
    await transport.handleRequest(req, res);
    } catch (err) {
      process.stderr.write(`[lenserfight-mcp] UNHANDLED: ${String(err)}\n`);
      if (!res.headersSent) {
        res.writeHead(500);
        res.end(JSON.stringify({ error: 'internal_server_error' }));
      }
    }
  });

  await new Promise<void>((resolve) => {
    httpServer.listen(cfg.httpPort, () => {
      process.stderr.write(
        `[lenserfight-mcp] HTTP transport ready on http://localhost:${cfg.httpPort}/mcp\n` +
        `\n` +
        `  ┌─ Local dev OAuth credentials ───────────────────────────────────────┐\n` +
        `  │  OAuth Client ID : ${LOCAL_CLIENT_ID.padEnd(50)}│\n` +
        `  │  Auth method     : PKCE (no client secret required)              │\n` +
        `  │  Server base URL : ${cfg.mcpOAuthBaseUrl.padEnd(50)}│\n` +
        `  │                                                                      │\n` +
        `  │  Claude.ai → Settings → Connectors → Add connector:                 │\n` +
        `  │    URL       : ${(cfg.mcpOAuthBaseUrl + '/mcp').padEnd(53)}│\n` +
        `  │    Client ID : ${LOCAL_CLIENT_ID.padEnd(53)}│\n` +
        `  └──────────────────────────────────────────────────────────────────────┘\n` +
        `\n`
      );
      resolve();
    });
  });
}
