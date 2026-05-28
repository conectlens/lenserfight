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

function parseFormBody(raw: string): Record<string, string> {
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

function generateToken(): string {
  return `lf_mcp_${crypto.randomBytes(32).toString('hex')}`;
}

function generateCode(): string {
  return crypto.randomBytes(16).toString('hex');
}

function verifyPkce(codeVerifier: string, codeChallenge: string): boolean {
  const digest = crypto.createHash('sha256').update(codeVerifier).digest();
  const computed = digest.toString('base64url');
  return computed === codeChallenge;
}

// ---------------------------------------------------------------------------
// OAuth handlers
// ---------------------------------------------------------------------------

async function handleRegister(
  req: http.IncomingMessage,
  res: http.ServerResponse,
  cfg: McpServerConfig
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

  const clientName = typeof body['client_name'] === 'string'
    ? body['client_name'].slice(0, 120)
    : 'Dynamic MCP Client';

  const svc = getServiceClient();
  const clientId = `lf_mcp_client_${crypto.randomBytes(16).toString('hex')}`;

  // Find any active lenser to own this client (use the first one for local dev).
  // In production this would be tied to an authenticated user.
  const { data: profile } = await (svc as never as {
    schema: (s: string) => {
      from: (t: string) => {
        select: (c: string) => {
          limit: (n: number) => {
            single: () => Promise<{ data: { id: string } | null; error: unknown }>;
          };
        };
      };
    };
  })
    .schema('lensers')
    .from('profiles')
    .select('id')
    .limit(1)
    .single();

  if (!profile) {
    jsonResponse(res, 500, { error: 'server_error', error_description: 'No lenser profile found in local DB' });
    return;
  }

  const { error: insertErr } = await (svc as never as {
    schema: (s: string) => {
      from: (t: string) => {
        insert: (row: Record<string, unknown>) => Promise<{ error: unknown }>;
      };
    };
  })
    .schema('lensers')
    .from('mcp_clients')
    .insert({
      lenser_id: profile.id,
      client_id: clientId,
      name: clientName,
      redirect_uris: redirectUris,
      requires_secret: false,
      is_active: true,
    });

  if (insertErr) {
    jsonResponse(res, 500, { error: 'server_error', error_description: 'Failed to register client' });
    return;
  }

  // RFC 7591 response
  jsonResponse(res, 201, {
    client_id: clientId,
    client_name: clientName,
    redirect_uris: redirectUris,
    grant_types: ['authorization_code'],
    response_types: ['code'],
    token_endpoint_auth_method: 'none',
    registration_access_token: null,
    client_id_issued_at: Math.floor(Date.now() / 1000),
  });
}

async function handleAuthorize(
  req: http.IncomingMessage,
  res: http.ServerResponse,
  url: URL,
  cfg: McpServerConfig
): Promise<void> {
  const clientId = url.searchParams.get('client_id');
  const redirectUri = url.searchParams.get('redirect_uri');
  const codeChallenge = url.searchParams.get('code_challenge');
  const state = url.searchParams.get('state');

  if (!clientId || !redirectUri) {
    jsonResponse(res, 400, { error: 'invalid_request', error_description: 'client_id and redirect_uri are required' });
    return;
  }

  const svc = getServiceClient();

  // Verify the OAuth client exists and the redirect_uri is allowed
  const { data: client, error: clientErr } = await (svc as never as {
    schema: (s: string) => {
      from: (t: string) => {
        select: (c: string) => {
          eq: (col: string, val: string) => {
            eq: (col: string, val: boolean) => {
              single: () => Promise<{
                data: { id: string; redirect_uris: string[] } | null;
                error: unknown;
              }>;
            };
          };
        };
      };
    };
  })
    .schema('lensers')
    .from('mcp_clients')
    .select('id, redirect_uris')
    .eq('client_id', clientId)
    .eq('is_active', true)
    .single();

  if (clientErr || !client) {
    jsonResponse(res, 400, { error: 'invalid_client', error_description: 'Unknown or inactive client' });
    return;
  }

  if (!client.redirect_uris.includes(redirectUri)) {
    jsonResponse(res, 400, { error: 'invalid_request', error_description: 'redirect_uri not registered' });
    return;
  }

  // Store a pending auth code record; the row id flows through Supabase as state
  const { data: authCode, error: insertErr } = await (svc as never as {
    schema: (s: string) => {
      from: (t: string) => {
        insert: (row: Record<string, unknown>) => {
          select: (c: string) => {
            single: () => Promise<{ data: { id: string } | null; error: unknown }>;
          };
        };
      };
    };
  })
    .schema('lensers')
    .from('mcp_auth_codes')
    .insert({
      client_id: clientId,
      redirect_uri: redirectUri,
      code_challenge: codeChallenge ?? null,
      original_state: state ?? null,
      code: 'pending',
    })
    .select('id')
    .single();

  if (insertErr || !authCode) {
    jsonResponse(res, 500, { error: 'server_error', error_description: 'Failed to create auth session' });
    return;
  }

  // Redirect to Supabase Auth, passing our row ID as state so the callback can find it
  const callbackUrl = `${cfg.mcpOAuthBaseUrl}/oauth/callback`;
  const supabaseAuthUrl = new URL(`${cfg.supabaseUrl}/auth/v1/authorize`);
  supabaseAuthUrl.searchParams.set('redirect_to', callbackUrl);
  supabaseAuthUrl.searchParams.set('state', authCode.id);
  supabaseAuthUrl.searchParams.set('provider', 'email');

  res.setHeader('Location', supabaseAuthUrl.toString());
  res.writeHead(302);
  res.end();
}

async function handleCallback(
  req: http.IncomingMessage,
  res: http.ServerResponse,
  url: URL,
  cfg: McpServerConfig
): Promise<void> {
  // Supabase returns ?code=<supabase_code>&state=<our_mcp_auth_code_id>
  const supabaseCode = url.searchParams.get('code');
  const mcpAuthCodeId = url.searchParams.get('state');

  if (!supabaseCode || !mcpAuthCodeId) {
    jsonResponse(res, 400, { error: 'invalid_request', error_description: 'Missing code or state' });
    return;
  }

  const svc = getServiceClient();

  // Look up the pending auth code record
  const { data: pending, error: pendingErr } = await (svc as never as {
    schema: (s: string) => {
      from: (t: string) => {
        select: (c: string) => {
          eq: (col: string, val: string) => {
            single: () => Promise<{
              data: {
                id: string;
                client_id: string;
                redirect_uri: string;
                original_state: string | null;
              } | null;
              error: unknown;
            }>;
          };
        };
      };
    };
  })
    .schema('lensers')
    .from('mcp_auth_codes')
    .select('id, client_id, redirect_uri, original_state')
    .eq('id', mcpAuthCodeId)
    .single();

  if (pendingErr || !pending) {
    jsonResponse(res, 400, { error: 'invalid_request', error_description: 'Invalid auth session' });
    return;
  }

  // Exchange Supabase code for tokens
  const tokenResp = await fetch(`${cfg.supabaseUrl}/auth/v1/token?grant_type=pkce`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: cfg.supabaseAnonKey,
    },
    body: JSON.stringify({ auth_code: supabaseCode }),
  });

  if (!tokenResp.ok) {
    jsonResponse(res, 400, { error: 'invalid_grant', error_description: 'Failed to exchange Supabase code' });
    return;
  }

  const tokenData = (await tokenResp.json()) as {
    access_token: string;
    refresh_token: string;
    user: { id: string };
  };

  // Look up the lenser profile for this auth user
  const { data: profile, error: profileErr } = await (svc as never as {
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
    .eq('auth_user_id', tokenData.user.id)
    .single();

  if (profileErr || !profile) {
    jsonResponse(res, 400, { error: 'invalid_grant', error_description: 'No lenser profile found' });
    return;
  }

  const ourCode = generateCode();

  // Update the auth code row with the Supabase refresh token and real code
  await (svc as never as {
    schema: (s: string) => {
      from: (t: string) => {
        update: (row: Record<string, unknown>) => {
          eq: (col: string, val: string) => Promise<unknown>;
        };
      };
    };
  })
    .schema('lensers')
    .from('mcp_auth_codes')
    .update({
      code: ourCode,
      lenser_id: profile.id,
      supabase_refresh_token: tokenData.refresh_token,
    })
    .eq('id', pending.id);

  // Redirect back to the OAuth client
  const redirectUrl = new URL(pending.redirect_uri);
  redirectUrl.searchParams.set('code', ourCode);
  if (pending.original_state) redirectUrl.searchParams.set('state', pending.original_state);

  res.setHeader('Location', redirectUrl.toString());
  res.writeHead(302);
  res.end();
}

async function handleToken(
  req: http.IncomingMessage,
  res: http.ServerResponse,
  cfg: McpServerConfig
): Promise<void> {
  const rawBody = await readBody(req);
  const body = parseFormBody(rawBody);

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

  // Fetch the auth code (must not be used, must not be expired)
  const { data: authCode, error: codeErr } = await (svc as never as {
    schema: (s: string) => {
      from: (t: string) => {
        select: (c: string) => {
          eq: (col: string, val: string) => {
            eq: (col: string, val: string) => {
              is: (col: string, val: null) => {
                single: () => Promise<{
                  data: {
                    id: string;
                    client_id: string;
                    redirect_uri: string;
                    lenser_id: string;
                    supabase_refresh_token: string;
                    code_challenge: string | null;
                    expires_at: string | null;
                  } | null;
                  error: unknown;
                }>;
              };
            };
          };
        };
      };
    };
  })
    .schema('lensers')
    .from('mcp_auth_codes')
    .select('id, client_id, redirect_uri, lenser_id, supabase_refresh_token, code_challenge, expires_at')
    .eq('code', code)
    .eq('client_id', client_id)
    .is('used_at', null)
    .single();

  if (codeErr || !authCode) {
    jsonResponse(res, 400, { error: 'invalid_grant', error_description: 'Invalid or expired authorization code' });
    return;
  }

  // Verify expiry
  if (authCode.expires_at && new Date(authCode.expires_at) < new Date()) {
    jsonResponse(res, 400, { error: 'invalid_grant', error_description: 'Authorization code expired' });
    return;
  }

  // Verify redirect_uri matches
  if (authCode.redirect_uri !== redirect_uri) {
    jsonResponse(res, 400, { error: 'invalid_grant', error_description: 'redirect_uri mismatch' });
    return;
  }

  // Verify PKCE if code_challenge was set
  if (authCode.code_challenge) {
    if (!code_verifier || !verifyPkce(code_verifier, authCode.code_challenge)) {
      jsonResponse(res, 400, { error: 'invalid_grant', error_description: 'PKCE verification failed' });
      return;
    }
  }

  // Verify client credentials via pgcrypto crypt()
  if (client_secret) {
    const { data: secretMatch, error: secretErr } = await svc.rpc('verify_mcp_client_secret', {
      p_client_id: client_id,
      p_secret: client_secret,
    }) as { data: boolean | null; error: unknown };

    if (secretErr || !secretMatch) {
      jsonResponse(res, 401, { error: 'invalid_client', error_description: 'Invalid client credentials' });
      return;
    }
  } else {
    // No secret provided — verify the client allows public (PKCE-only) flow
    const { data: client, error: clientErr } = await (svc as never as {
      schema: (s: string) => {
        from: (t: string) => {
          select: (c: string) => {
            eq: (col: string, val: string) => {
              eq: (col: string, val: boolean) => {
                single: () => Promise<{
                  data: { requires_secret: boolean } | null;
                  error: unknown;
                }>;
              };
            };
          };
        };
      };
    })
      .schema('lensers')
      .from('mcp_clients')
      .select('requires_secret')
      .eq('client_id', client_id)
      .eq('is_active', true)
      .single();

    if (clientErr || !client || client.requires_secret) {
      jsonResponse(res, 401, { error: 'invalid_client', error_description: 'client_secret required' });
      return;
    }
  }

  // Mark auth code as used
  await (svc as never as {
    schema: (s: string) => {
      from: (t: string) => {
        update: (row: Record<string, unknown>) => {
          eq: (col: string, val: string) => Promise<unknown>;
        };
      };
    };
  })
    .schema('lensers')
    .from('mcp_auth_codes')
    .update({ used_at: new Date().toISOString() })
    .eq('id', authCode.id);

  // Issue MCP access token
  const accessToken = generateToken();

  await (svc as never as {
    schema: (s: string) => {
      from: (t: string) => {
        insert: (row: Record<string, unknown>) => Promise<unknown>;
      };
    };
  })
    .schema('lensers')
    .from('mcp_tokens')
    .insert({
      client_id: client_id,
      lenser_id: authCode.lenser_id,
      token: accessToken,
      supabase_refresh_token: authCode.supabase_refresh_token,
      is_active: true,
    });

  jsonResponse(res, 200, {
    access_token: accessToken,
    token_type: 'bearer',
    expires_in: null,
  });
}

// ---------------------------------------------------------------------------
// HTTP boot
// ---------------------------------------------------------------------------

export async function bootHttp(
  buildServer: (sb: SupabaseClient) => McpServer,
  cfg: McpServerConfig
): Promise<void> {
  const httpServer = http.createServer(async (req, res) => {
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
    if (url.pathname === '/.well-known/oauth-protected-resource' ||
        url.pathname === '/.well-known/oauth-protected-resource/mcp') {
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

    // RFC 7591 — Dynamic Client Registration (Claude.ai uses this to self-register)
    if (url.pathname === '/oauth/register') {
      if (req.method !== 'POST') {
        jsonResponse(res, 405, { error: 'method_not_allowed' });
        return;
      }
      await handleRegister(req, res, cfg);
      return;
    }

    if (url.pathname === '/oauth/authorize') {
      await handleAuthorize(req, res, url, cfg);
      return;
    }

    if (url.pathname === '/oauth/callback') {
      await handleCallback(req, res, url, cfg);
      return;
    }

    if (url.pathname === '/oauth/token') {
      if (req.method !== 'POST') {
        jsonResponse(res, 405, { error: 'method_not_allowed' });
        return;
      }
      await handleToken(req, res, cfg);
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
      jsonResponse(res, 401, { error: 'Unauthorized', hint: 'Provide Authorization: Bearer <token>' });
      return;
    }

    const ctx = await resolveAuth(authHeader, cfg);
    if (!ctx) {
      jsonResponse(res, 401, { error: 'Invalid or expired token' });
      return;
    }

    const sessionId = req.headers['mcp-session-id'] as string | undefined;

    // Reuse existing session for this session ID
    if (sessionId && sessions.has(sessionId)) {
      const session = sessions.get(sessionId)!;
      await session.transport.handleRequest(req, res);
      return;
    }

    // Create a new session with a user-scoped client
    const userClient = createUserScopedClient(cfg.supabaseUrl, cfg.supabaseAnonKey, ctx.userJwt);
    const server = buildServer(userClient);

    const newSessionId = `${Date.now()}-${crypto.randomBytes(6).toString('hex')}`;
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: () => newSessionId,
    });

    sessions.set(newSessionId, { server, transport });

    // Clean up session when transport closes
    transport.onclose = () => {
      sessions.delete(newSessionId);
    };

    await server.connect(transport);
    await transport.handleRequest(req, res);
  });

  await new Promise<void>((resolve) => {
    httpServer.listen(cfg.httpPort, () => {
      process.stderr.write(
        `[lenserfight-mcp] HTTP transport ready on http://localhost:${cfg.httpPort}/mcp\n`
      );
      resolve();
    });
  });
}
