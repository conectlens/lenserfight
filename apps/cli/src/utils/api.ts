import { existsSync, readFileSync } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import consola from 'consola';
import { toSnakeCaseKeys } from '@lenserfight/utils/text';
import { resolveConfig as resolveBaseConfig, loadUserConfig, saveUserConfig, type LenserfightConfig } from '../config/project-config';
import { reportCliError } from './error-reporter';

// ─── Profile overlay (Y1) ────────────────────────────────────────────────────
//
// Profiles live at `~/.lenserfight/profiles/<name>.json` and overlay the
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
    const dir = path.join(os.homedir(), '.lenserfight', 'profiles')
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

export async function callRpc<T = unknown>(
  functionName: string,
  params: Record<string, unknown> = {},
  options: RpcOptions = {}
): Promise<T> {
  let config = resolveConfig();

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
        'Service role key not found. Set SUPABASE_SERVICE_ROLE_KEY in your environment or ~/.lenserfight/config.json.'
      );
    }
    headers['Authorization'] = `Bearer ${config.supabaseServiceRoleKey}`;
  } else if (bearerToken) {
    if (options.requireAuth && !bearerToken) {
      throw new Error(
        'Authentication required. Run `lenserfight auth login` first.'
      );
    }
    headers['Authorization'] = `Bearer ${bearerToken}`;
  } else if (options.requireAuth) {
    throw new Error('Authentication required. Run `lenserfight auth login` first.')
  }

  const url = `${config.supabaseUrl}/rest/v1/rpc/${functionName}`;

  const res = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(toSnakeCaseKeys(params)),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }));
    const httpError = Object.assign(
      new Error(err.message || err.error || res.statusText),
      { status: res.status, code: err.code }
    );
    throw httpError;
  }

  return res.json() as Promise<T>;
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

export async function callRest<T = unknown>(
  schema: string,
  table: string,
  method: RestMethod,
  body?: Record<string, unknown> | Array<Record<string, unknown>>,
  options: RestOptions = {}
): Promise<T> {
  let config = resolveConfig()

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
  if (options.prefer) headers['Prefer'] = options.prefer

  const bearerToken = resolveBearerToken(config, options)
  if (options.useServiceRole) {
    if (!config.supabaseServiceRoleKey) {
      throw new Error(
        'Service role key not found. Set SUPABASE_SERVICE_ROLE_KEY in your environment or ~/.lenserfight/config.json.'
      )
    }
    headers['Authorization'] = `Bearer ${config.supabaseServiceRoleKey}`
  } else if (bearerToken) {
    headers['Authorization'] = `Bearer ${bearerToken}`
  } else if (options.requireAuth) {
    throw new Error('Authentication required. Run `lenserfight auth login` first.')
  }

  const params = new URLSearchParams()
  params.set('schema', schema)
  if (options.query) {
    for (const [key, value] of Object.entries(options.query)) {
      if (value === undefined) continue
      params.append(key, String(value))
    }
  }
  const url = `${config.supabaseUrl}/rest/v1/${table}?${params.toString()}`

  const res = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  })

  if (!res.ok) {
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
