import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import consola from 'consola';
import { toSnakeCaseKeys } from '@lenserfight/utils/text';
import { resolveConfig as resolveBaseConfig, loadUserConfig, saveUserConfig, getDeviceConfigDir, type LenserfightConfig } from '../config/project-config';
import { reportCliError } from './error-reporter';
import { getExecContext } from '../lib/exec-context';
import { redactHeaders, redactUrl } from '../lib/redact';
import { attemptAuthRecovery } from './auth-recovery';

// ─── Profile overlay (Y1) ────────────────────────────────────────────────────
//
// Profiles live at `<device-config-dir>/profiles/<name>.json` and overlay the
// resolved config without touching the legacy env-based path. Read is
// synchronous-and-cheap so it stays compatible with both `callRpc` and
// `callRest` (which were originally synchronous resolvers).

interface RawProfile {
  name?: string
  supabase_url?: string
  supabase_anon_key?: string
  access_token?: string
  refresh_token?: string
  default_workflow_id?: string
}

function readActiveProfileSync(): RawProfile | null {
  try {
    const dir = path.join(getDeviceConfigDir(), 'profiles')
    const activeFile = path.join(dir, '.active')
    let name: string | undefined
    if (existsSync(activeFile)) {
      const raw = readFileSync(activeFile, 'utf-8').trim()
      if (raw) name = raw
    }
    if (!name && process.env['LF_PROFILE']) name = process.env['LF_PROFILE']
    if (!name) return null
    const file = path.join(dir, `${name}.json`)
    if (!existsSync(file)) return null
    return JSON.parse(readFileSync(file, 'utf-8')) as RawProfile
  } catch {
    return null
  }
}

function resolveConfig(cwd?: string): LenserfightConfig {
  const base = resolveBaseConfig(cwd)
  const profile = readActiveProfileSync()
  if (!profile) return base
  return {
    ...base,
    supabaseUrl: profile.supabase_url || base.supabaseUrl,
    supabaseAnonKey: profile.supabase_anon_key || base.supabaseAnonKey,
    authToken: profile.access_token ?? base.authToken,
    authRefreshToken: profile.refresh_token ?? base.authRefreshToken,
  }
}

export interface RpcOptions {
  requireAuth?: boolean;
  useServiceRole?: boolean;
  useDeveloperToken?: boolean;
  /** Explicitly suppress any stored token — use for anon RPC calls. */
  noAuth?: boolean;
  /**
   * Non-public schema for the RPC (e.g. `lenses`). When set we route the
   * request via PostgREST's `Content-Profile` header so the function is
   * resolved against the named schema rather than `public`.
   */
  schema?: string;
}

export function resolveBearerToken(
  config: LenserfightConfig,
  options: RpcOptions = {}
): string | undefined {
  if (options.noAuth) return undefined;

  // Privileged internal path — overrides everything except noAuth.
  if (options.useServiceRole) {
    return config.supabaseServiceRoleKey
  }

  const developerTokenIsActive =
    !!config.developerToken &&
    (!config.developerTokenExpiresAt ||
      new Date(config.developerTokenExpiresAt).getTime() >= Date.now())

  // Precedence:
  // 1. Explicit API key from env
  // 2. Developer token when explicitly requested for automation
  // 3. Stored session token
  // 4. Stored developer token fallback
  if (config.apiKey) return config.apiKey

  if (options.useDeveloperToken && developerTokenIsActive) {
    return config.developerToken
  }

  if (config.authToken) return config.authToken

  if (developerTokenIsActive) {
    return config.developerToken
  }

  return undefined
}

/** Silently refresh the stored access token using the refresh token if it exists. */
async function tryRefreshToken(config: LenserfightConfig): Promise<void> {
  const user = loadUserConfig();
  if (!user.authRefreshToken) return;

  const res = await fetch(
    `${config.supabaseUrl}/auth/v1/token?grant_type=refresh_token`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: config.supabaseAnonKey!,
      },
      body: JSON.stringify({ refresh_token: user.authRefreshToken }),
    }
  );

  if (!res.ok) return; // refresh failed — let the RPC call produce a proper error

  const data = await res.json();
  saveUserConfig({
    authToken: data.access_token,
    authRefreshToken: data.refresh_token,
    authExpiresAt: new Date(Date.now() + data.expires_in * 1000).toISOString(),
  });
}

function warnIfProductionInLocalMode(config: LenserfightConfig): void {
  const { isLocal } = getExecContext();
  if (!isLocal) return;
  if (config.supabaseUrl.includes('supabase.co'))
    consola.warn(`--local active but supabaseUrl points to production: ${config.supabaseUrl}`);
  if (config.cloudApiUrl.includes('lenserfight.com'))
    consola.warn(`--local active but cloudApiUrl points to production: ${config.cloudApiUrl}`);
}

async function callRpcInner<T = unknown>(
  functionName: string,
  params: Record<string, unknown>,
  options: RpcOptions,
  retried: boolean
): Promise<T> {
  let config = resolveConfig();

  warnIfProductionInLocalMode(config);

  if (!config.supabaseAnonKey) {
    throw new Error(
      'Supabase anon key not found. Set SUPABASE_ANON_KEY in your environment or run `lenserfight init --mode cloud`.'
    );
  }

  // Proactively refresh if the stored access token is expired and a refresh token exists.
  if (!options.noAuth && !options.useServiceRole && config.authToken && config.authExpiresAt) {
    if (new Date(config.authExpiresAt) <= new Date()) {
      await tryRefreshToken(config);
      config = resolveConfig(); // reload after refresh
    }
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    apikey: config.supabaseAnonKey,
  };
  if (options.schema) {
    headers['Content-Profile'] = options.schema;
    headers['Accept-Profile'] = options.schema;
  }

  const bearerToken = resolveBearerToken(config, options);

  if (options.useServiceRole) {
    if (!config.supabaseServiceRoleKey) {
      throw new Error(
        'Service role key not found. Set SUPABASE_SERVICE_ROLE_KEY in your environment or the device config (run `lf doctor` to see the path).'
      );
    }
    headers['Authorization'] = `Bearer ${config.supabaseServiceRoleKey}`;
  } else if (bearerToken) {
    headers['Authorization'] = `Bearer ${bearerToken}`;
  } else if (options.requireAuth) {
    if (!retried && await attemptAuthRecovery()) {
      return callRpcInner(functionName, params, options, true)
    }
    throw new Error('Authentication required. Run `lf auth login` to sign in.')
  }

  const url = `${config.supabaseUrl}/rest/v1/rpc/${functionName}`;

  const { isDebug } = getExecContext();
  const ts = () => new Date().toISOString().slice(11, 23);
  const t0 = isDebug ? performance.now() : 0;
  if (isDebug) {
    consola.debug(`[${ts()}] RPC POST ${redactUrl(url)}`);
    consola.debug(`[${ts()}] headers: ${JSON.stringify(redactHeaders({ ...headers }))}`);
  }

  const res = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(toSnakeCaseKeys(params)),
  });

  if (isDebug) consola.debug(`[${ts()}] → ${res.status} in ${(performance.now() - t0).toFixed(1)}ms`);

  if (!res.ok) {
    if (res.status === 401 && !retried && options.requireAuth && await attemptAuthRecovery()) {
      return callRpcInner(functionName, params, options, true)
    }
    const err = await res.json().catch(() => ({ message: res.statusText }));
    const httpError = Object.assign(
      new Error(err.message || err.error || res.statusText),
      { status: res.status, code: err.code }
    );
    throw httpError;
  }

  return res.json() as Promise<T>;
}

export async function callRpc<T = unknown>(
  functionName: string,
  params: Record<string, unknown> = {},
  options: RpcOptions = {}
): Promise<T> {
  return callRpcInner(functionName, params, options, false)
}

export function handleError(err: unknown): void {
  reportCliError(err);
  process.exitCode = 1;
}

// ─── REST helper for tables on non-default schemas ─────────────────────────
//
// callRpc covers `public.fn_*` RPCs but ConnectedLenses commands also need to
// read/write tables in the `agents`, `lenses`, and `lensers` schemas where no
// dedicated RPC exists yet (team CRUD, approval queue, run inspection). RLS
// stays in force because we send the user's bearer token and PostgREST runs
// the policies.

export type RestMethod = 'GET' | 'POST' | 'PATCH' | 'DELETE'

export interface RestOptions extends RpcOptions {
  /** Query string params (filters, select clauses, ordering). */
  query?: Record<string, string | number | boolean | undefined>
  /** PostgREST `Prefer` header value, e.g. `return=representation`. */
  prefer?: string
}

async function callRestInner<T = unknown>(
  schema: string,
  table: string,
  method: RestMethod,
  body: Record<string, unknown> | Array<Record<string, unknown>> | undefined,
  options: RestOptions,
  retried: boolean
): Promise<T> {
  let config = resolveConfig()

  warnIfProductionInLocalMode(config);

  if (!config.supabaseAnonKey) {
    throw new Error(
      'Supabase anon key not found. Set SUPABASE_ANON_KEY in your environment or run `lenserfight init --mode cloud`.'
    )
  }

  if (!options.noAuth && !options.useServiceRole && config.authToken && config.authExpiresAt) {
    if (new Date(config.authExpiresAt) <= new Date()) {
      await tryRefreshToken(config)
      config = resolveConfig()
    }
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    apikey: config.supabaseAnonKey,
  }
  headers['Accept-Profile'] = schema
  if (method !== 'GET') headers['Content-Profile'] = schema
  if (options.prefer) headers['Prefer'] = options.prefer

  const bearerToken = resolveBearerToken(config, options)
  if (options.useServiceRole) {
    if (!config.supabaseServiceRoleKey) {
      throw new Error(
        'Service role key not found. Set SUPABASE_SERVICE_ROLE_KEY in your environment or the device config (run `lf doctor` to see the path).'
      )
    }
    headers['Authorization'] = `Bearer ${config.supabaseServiceRoleKey}`
  } else if (bearerToken) {
    headers['Authorization'] = `Bearer ${bearerToken}`
  } else if (options.requireAuth) {
    if (!retried && await attemptAuthRecovery()) {
      return callRestInner(schema, table, method, body, options, true)
    }
    throw new Error('Authentication required. Run `lf auth login` to sign in.')
  }

  const params = new URLSearchParams()
  if (options.query) {
    for (const [key, value] of Object.entries(options.query)) {
      if (value === undefined) continue
      params.append(key, String(value))
    }
  }
  const url = `${config.supabaseUrl}/rest/v1/${table}?${params.toString()}`

  const { isDebug } = getExecContext();
  const ts = () => new Date().toISOString().slice(11, 23);
  const t0 = isDebug ? performance.now() : 0;
  if (isDebug) {
    consola.debug(`[${ts()}] REST ${method} ${redactUrl(url)}`);
    consola.debug(`[${ts()}] headers: ${JSON.stringify(redactHeaders({ ...headers }))}`);
  }

  const res = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  })

  if (isDebug) consola.debug(`[${ts()}] → ${res.status} in ${(performance.now() - t0).toFixed(1)}ms`);

  if (!res.ok) {
    if (res.status === 401 && !retried && options.requireAuth && await attemptAuthRecovery()) {
      return callRestInner(schema, table, method, body, options, true)
    }
    const err = await res.json().catch(() => ({ message: res.statusText }))
    throw Object.assign(
      new Error(err.message || err.error || res.statusText),
      { status: res.status, code: err.code }
    )
  }

  if (res.status === 204) return undefined as T
  const text = await res.text()
  if (!text) return undefined as T
  return JSON.parse(text) as T
}

export async function callRest<T = unknown>(
  schema: string,
  table: string,
  method: RestMethod,
  body?: Record<string, unknown> | Array<Record<string, unknown>>,
  options: RestOptions = {}
): Promise<T> {
  return callRestInner(schema, table, method, body, options, false)
}
