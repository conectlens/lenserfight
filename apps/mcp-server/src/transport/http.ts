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

function renderLoginPage(opts: {
  formAction: string;
  authCodeId: string;
  email?: string;
  error?: string;
  hint?: string;
}): string {
  const errBlock = opts.error
    ? `<div class="err">
         <strong>${escapeHtml(opts.error)}</strong>
         ${opts.hint ? `<p>${escapeHtml(opts.hint)}</p>` : ''}
       </div>`
    : '';
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>LenserFight — Sign in</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: system-ui, sans-serif; background: #0f0f0f; color: #e5e5e5; display: flex; align-items: center; justify-content: center; min-height: 100vh; padding: 1rem; }
    .card { background: #1a1a1a; border: 1px solid #2a2a2a; border-radius: 12px; padding: 2rem; width: 100%; max-width: 380px; }
    h1 { font-size: 1.1rem; font-weight: 600; margin-bottom: 0.4rem; color: #fff; }
    .sub { font-size: 0.8rem; color: #888; margin-bottom: 1.25rem; }
    label { display: block; font-size: 0.8rem; color: #999; margin-bottom: 0.35rem; }
    input { width: 100%; padding: 0.6rem 0.8rem; background: #111; border: 1px solid #333; border-radius: 6px; color: #e5e5e5; font-size: 0.9rem; margin-bottom: 1rem; outline: none; }
    input:focus { border-color: #555; }
    button { width: 100%; padding: 0.65rem; background: #fff; color: #000; border: none; border-radius: 6px; font-size: 0.9rem; font-weight: 600; cursor: pointer; }
    button:hover { background: #e5e5e5; }
    .err { background: rgba(248,113,113,0.08); border: 1px solid rgba(248,113,113,0.25); color: #fca5a5; font-size: 0.8rem; padding: 0.7rem 0.85rem; border-radius: 6px; margin-bottom: 1rem; line-height: 1.4; }
    .err strong { display: block; margin-bottom: 0.25rem; color: #fecaca; }
    .err p { margin: 0; }
  </style>
</head>
<body>
  <div class="card">
    <h1>Sign in to LenserFight</h1>
    <p class="sub">Authorize the MCP connector to access your lenses, battles, and workflows.</p>
    ${errBlock}
    <form method="POST" action="${escapeHtml(opts.formAction)}">
      <input type="hidden" name="auth_code_id" value="${escapeHtml(opts.authCodeId)}">
      <label for="email">Email</label>
      <input type="email" id="email" name="email" required autofocus value="${escapeHtml(opts.email ?? '')}" placeholder="you@example.com">
      <label for="password">Password</label>
      <input type="password" id="password" name="password" required placeholder="••••••••">
      <button type="submit">Sign in</button>
    </form>
  </div>
</body>
</html>`;
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
  const errorParam    = url.searchParams.get('error');
  const existingId    = url.searchParams.get('auth_code_id');
  const emailParam    = url.searchParams.get('email');
  const hintParam     = url.searchParams.get('hint');

  // Retry case: redisplay form with error
  if (existingId && errorParam) {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.writeHead(200);
    res.end(renderLoginPage({
      formAction: `${cfg.mcpOAuthBaseUrl}/oauth/login`,
      authCodeId: existingId,
      email: emailParam ?? undefined,
      error: errorParam,
      hint: hintParam ?? undefined,
    }));
    return;
  }

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

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.writeHead(200);
  res.end(renderLoginPage({
    formAction: `${cfg.mcpOAuthBaseUrl}/oauth/login`,
    authCodeId,
  }));
}

async function handleLogin(
  req: http.IncomingMessage,
  res: http.ServerResponse,
  cfg: McpServerConfig
): Promise<void> {
  const rawBody = await readBody(req);
  const body = parseFormBody(rawBody);
  const { email, password, auth_code_id } = body;

  if (!email || !password || !auth_code_id) {
    jsonResponse(res, 400, { error: 'invalid_request', error_description: 'email, password, and auth_code_id are required' });
    return;
  }

  const svc = getServiceClient();

  // Redirect back to the form with a friendly error
  const showError = (errorMsg: string, hint?: string) => {
    const params = new URLSearchParams({
      auth_code_id,
      error:  errorMsg,
      email:  email ?? '',
    });
    if (hint) params.set('hint', hint);
    res.setHeader('Location', `${cfg.mcpOAuthBaseUrl}/oauth/authorize?${params.toString()}`);
    res.writeHead(302);
    res.end();
  };

  // Verify the auth code exists before attempting sign-in
  const { data: pendingRows } = (await svc.rpc('fn_mcp_oauth_lookup_auth_code' as never, {
    p_id: auth_code_id,
  } as never)) as RpcResult<{ id: string; client_id: string; redirect_uri: string; original_state: string | null }[]>;

  const pending = pendingRows?.[0] ?? null;
  if (!pending) {
    jsonResponse(res, 400, {
      error: 'invalid_request',
      error_description: 'Sign-in session has expired. Please start the connector flow from Claude.ai again.',
    });
    return;
  }

  // Sign in with email + password via Supabase Auth
  const signInResp = await fetch(`${cfg.supabaseUrl}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', apikey: cfg.supabaseAnonKey },
    body: JSON.stringify({ email, password }),
  });

  if (!signInResp.ok) {
    let serverMsg = 'Invalid email or password.';
    try {
      const errBody = (await signInResp.json()) as { error_description?: string; msg?: string };
      serverMsg = errBody.error_description ?? errBody.msg ?? serverMsg;
    } catch {
      /* ignore parse errors */
    }
    showError(
      'Sign-in failed',
      `${serverMsg} Double-check your email and password. If you registered through Google/GitHub, sign in there first to set a password.`
    );
    return;
  }

  const tokenData = (await signInResp.json()) as {
    access_token: string;
    refresh_token: string;
    user: { id: string };
  };

  const { data: lenserId } = (await svc.rpc('fn_mcp_resolve_lenser_id' as never, {
    p_auth_user_id: tokenData.user.id,
  } as never)) as RpcResult<string>;

  if (!lenserId) {
    showError(
      'No Lenser profile found',
      `Your account (${email}) is authenticated, but has no Lenser profile yet. Open the LenserFight web app and complete onboarding (pick a handle) first, then retry the connector authorization.`
    );
    return;
  }

  // Dual-mode: the value we use as `code` IS a valid bearer token.
  // Claude.ai's cloud uses the code directly as the bearer on /mcp — no /oauth/token call.
  // But we also keep standard code-exchange working for spec-compliant clients.
  const token = generateToken();

  // 1) Register as a bearer token so resolveMcpToken finds it
  await svc.rpc('fn_mcp_oauth_issue_token' as never, {
    p_client_id:              pending.client_id,
    p_lenser_id:              lenserId,
    p_token:                  token,
    p_supabase_refresh_token: tokenData.refresh_token,
  } as never);

  // 2) Also stash as an auth code so /oauth/token can redeem it (and return the same token)
  await svc.rpc('fn_mcp_oauth_complete_auth_code' as never, {
    p_id:                     pending.id,
    p_code:                   token,
    p_lenser_id:              lenserId,
    p_supabase_refresh_token: tokenData.refresh_token,
  } as never);

  process.stderr.write(`[lenserfight-mcp] login: issued ${token.slice(0, 16)}... → redirecting\n`);

  const redirectUrl = new URL(pending.redirect_uri);
  redirectUrl.searchParams.set('code', token);
  if (pending.original_state) redirectUrl.searchParams.set('state', pending.original_state);

  res.setHeader('Location', redirectUrl.toString());
  res.writeHead(302);
  res.end();
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
  buildServer: (sb: SupabaseClient) => McpServer,
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
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Mcp-Session-Id');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');

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
      await handleAuthorize(res, url, cfg);
      return;
    }

    if (url.pathname === '/oauth/login') {
      if (req.method !== 'POST') { jsonResponse(res, 405, { error: 'method_not_allowed' }); return; }
      await handleLogin(req, res, cfg);
      return;
    }

    // /oauth/callback is kept for redirect_uri registration compatibility but is no longer used
    if (url.pathname === '/oauth/callback') {
      jsonResponse(res, 400, { error: 'invalid_request', error_description: 'Use /oauth/login instead' });
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
    const server = buildServer(userClient);

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
        `  │    URL       : ${cfg.mcpOAuthBaseUrl.padEnd(53)}│\n` +
        `  │    Client ID : ${LOCAL_CLIENT_ID.padEnd(53)}│\n` +
        `  └──────────────────────────────────────────────────────────────────────┘\n` +
        `\n`
      );
      resolve();
    });
  });
}
