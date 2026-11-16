/**
 * Exercises the Worker OAuth handlers against an in-memory stand-in for the
 * fn_mcp_oauth_* RPCs (same semantics as the SQL: exchange is an atomic
 * single-use update restricted to completed, unexpired codes).
 */
import * as crypto from 'crypto';

interface CodeRow {
  id: string; client_id: string; redirect_uri: string; code: string; lenser_id: string | null;
  code_challenge: string | null; original_state: string | null; refresh: string | null;
  used_at: Date | null; expires_at: Date;
}

const db = { codes: [] as CodeRow[], tokens: [] as { token: string }[] };

function rpc(name: string, a: Record<string, any>) {
  const ok = (data: unknown = null) => Promise.resolve({ data, error: null });
  switch (name) {
    case 'fn_mcp_oauth_lookup_auth_code':
      return ok(db.codes.filter((c) => c.id === a.p_id));
    case 'fn_mcp_resolve_lenser_id':
      return ok('lenser-1');
    case 'fn_mcp_oauth_complete_auth_code': {
      const row = db.codes.find((c) => c.id === a.p_id && c.code === 'pending' && !c.used_at);
      if (!row) return Promise.resolve({ data: null, error: { message: 'not pending' } });
      row.code = a.p_code; row.lenser_id = a.p_lenser_id; row.refresh = a.p_supabase_refresh_token;
      return ok();
    }
    case 'fn_mcp_oauth_exchange_code': {
      const row = db.codes.find(
        (c) => c.code === a.p_code && c.code !== 'pending' && c.client_id === a.p_client_id &&
          c.lenser_id && !c.used_at && c.expires_at > new Date(),
      );
      if (!row) return ok([]);
      row.used_at = new Date();
      return ok([{ id: row.id, redirect_uri: row.redirect_uri, lenser_id: row.lenser_id,
        supabase_refresh_token: row.refresh, code_challenge: row.code_challenge, expires_at: row.expires_at.toISOString() }]);
    }
    case 'fn_mcp_oauth_issue_token':
      db.tokens.push({ token: a.p_token });
      return ok();
    case 'fn_mcp_oauth_lookup_client':
      return ok([{ id: 'c', redirect_uris: [], requires_secret: false }]);
    default:
      return ok();
  }
}

jest.mock('@supabase/supabase-js', () => ({
  createClient: () => ({
    rpc: (n: string, a: Record<string, any>) => rpc(n, a),
    auth: { getUser: async () => ({ data: { user: { id: 'u1' } }, error: null }) },
  }),
}));

jest.mock('../main', () => ({ buildServer: jest.fn() }));

import worker, { Env } from '../worker';

const env: Env = {
  SUPABASE_URL: 'http://x', SUPABASE_SERVICE_ROLE_KEY: 'k', SUPABASE_ANON_KEY: 'k', SUPABASE_JWT_SECRET: 's',
  MCP_OAUTH_BASE_URL: 'https://mcp.test', AUTH_APP_BASE_URL: 'https://auth.test',
};
const REDIRECT = 'https://client.example/cb';
const VERIFIER = 'v'.repeat(50);
const CHALLENGE = crypto.createHash('sha256').update(VERIFIER).digest('base64url');

function seed(over: Partial<CodeRow> = {}): CodeRow {
  const row: CodeRow = {
    id: crypto.randomUUID(), client_id: 'client-1', redirect_uri: REDIRECT, code: 'pending', lenser_id: null,
    code_challenge: CHALLENGE, original_state: 's1', refresh: null, used_at: null,
    expires_at: new Date(Date.now() + 60_000), ...over,
  };
  db.codes.push(row);
  return row;
}

const post = (path: string, body: unknown, headers: Record<string, string> = {}) =>
  worker.fetch(new Request(`https://mcp.test${path}`, {
    method: 'POST', headers: { 'content-type': 'application/json', ...headers }, body: JSON.stringify(body),
  }), env);

async function complete(row: CodeRow): Promise<string> {
  const res = await post('/oauth/complete', { id: row.id, refresh_token: 'r' }, { authorization: 'Bearer jwt' });
  expect(res.status).toBe(200);
  return ((await res.json()) as { code: string }).code;
}

const exchange = (code: string, over: Record<string, string> = {}) =>
  post('/oauth/token', {
    grant_type: 'authorization_code', code, client_id: 'client-1', redirect_uri: REDIRECT, code_verifier: VERIFIER, ...over,
  });

beforeEach(() => { db.codes = []; db.tokens = []; });

describe('/oauth/complete + /oauth/token', () => {
  it('returns a code that is not a bearer token and stores no token before exchange', async () => {
    const code = await complete(seed());
    expect(code.startsWith('lf_code_')).toBe(true);
    expect(db.tokens).toHaveLength(0);
  });

  it('mints a bearer token on exchange and rejects a second exchange of the same code', async () => {
    const code = await complete(seed());
    const first = await exchange(code);
    expect(first.status).toBe(200);
    const body = (await first.json()) as { access_token: string };
    expect(body.access_token.startsWith('lf_mcp_')).toBe(true);
    expect(body.access_token).not.toBe(code);
    expect(db.tokens).toHaveLength(1);

    const second = await exchange(code);
    expect(second.status).toBe(400);
    expect(db.tokens).toHaveLength(1);
  });

  it('rejects an lf_mcp_ bearer value presented as a code', async () => {
    const code = await complete(seed());
    const token = ((await (await exchange(code)).json()) as { access_token: string }).access_token;
    const res = await exchange(token);
    expect(res.status).toBe(400);
    expect(db.tokens).toHaveLength(1);
  });

  it('rejects a redirect_uri mismatch', async () => {
    const code = await complete(seed());
    const res = await exchange(code, { redirect_uri: 'https://attacker.example/cb' });
    expect(res.status).toBe(400);
    expect(db.tokens).toHaveLength(0);
  });

  it('rejects a wrong PKCE verifier and burns the code', async () => {
    const code = await complete(seed());
    expect((await exchange(code, { code_verifier: 'x'.repeat(50) })).status).toBe(400);
    expect((await exchange(code)).status).toBe(400);
    expect(db.tokens).toHaveLength(0);
  });

  it('rejects an expired code and the pending placeholder', async () => {
    const code = await complete(seed());
    db.codes[0].expires_at = new Date(Date.now() - 1000);
    expect((await exchange(code)).status).toBe(400);
    seed();
    expect((await exchange('pending')).status).toBe(400);
  });

  it('completes an authorization request only once', async () => {
    const row = seed();
    await complete(row);
    const again = await post('/oauth/complete', { id: row.id, refresh_token: 'r' }, { authorization: 'Bearer jwt' });
    expect(again.status).toBe(500);
  });
});
