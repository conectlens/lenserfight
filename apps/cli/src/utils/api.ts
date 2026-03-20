import consola from 'consola';
import { toSnakeCaseKeys } from '@lenserfight/utils/text';
import { resolveConfig, type LenserfightConfig } from '../config/project-config';
import { reportCliError } from './error-reporter';

export interface RpcOptions {
  requireAuth?: boolean;
  useServiceRole?: boolean;
}

export async function callRpc<T = unknown>(
  functionName: string,
  params: Record<string, unknown> = {},
  options: RpcOptions = {}
): Promise<T> {
  const config = resolveConfig();

  if (!config.supabaseAnonKey) {
    throw new Error(
      'Supabase anon key not found. Set SUPABASE_ANON_KEY in your environment or run `lenserfight init --mode cloud`.'
    );
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    apikey: config.supabaseAnonKey,
  };

  if (options.useServiceRole) {
    if (!config.supabaseServiceRoleKey) {
      throw new Error(
        'Service role key not found. Set SUPABASE_SERVICE_ROLE_KEY in your environment or ~/.lenserfight/config.json.'
      );
    }
    headers['Authorization'] = `Bearer ${config.supabaseServiceRoleKey}`;
  } else if (options.requireAuth || config.authToken) {
    const token = config.authToken;
    if (options.requireAuth && !token) {
      throw new Error(
        'Authentication required. Run `lenserfight auth login` first.'
      );
    }
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
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
