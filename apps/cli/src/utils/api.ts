import consola from 'consola';
import { toSnakeCaseKeys } from '@lenserfight/utils/text';
import { resolveConfig, loadUserConfig, saveUserConfig, type LenserfightConfig } from '../config/project-config';
import { reportCliError } from './error-reporter';

export interface RpcOptions {
  requireAuth?: boolean;
  useServiceRole?: boolean;
  useDeveloperToken?: boolean;
  /** Explicitly suppress any stored token — use for anon RPC calls. */
  noAuth?: boolean;
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
