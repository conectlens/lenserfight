import { exec } from 'node:child_process';
import { loadUserConfig, saveUserConfig, resolveConfig } from '../config/project-config';
import { callRpc } from './api';
import type {
  ApproveDeviceRequestDTO,
  ApproveDeviceRequestResultDTO,
  DeviceApprovalRequestDTO,
  DeviceApprovalRequestResultDTO,
  DeviceLoginExchangeResultDTO,
  DeviceLoginRequestResultDTO,
  DeveloperTokenExchangeResultDTO,
  DeveloperTokenGrantDTO,
  DeveloperTokenSummaryDTO,
  ExchangeDeviceApprovalDTO,
} from '@lenserfight/types';

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: string;
}

export interface DeveloperTokenConfig {
  developerTokenId?: string;
  developerToken?: string;
  developerTokenExpiresAt?: string;
}

export function isAuthenticated(): boolean {
  const user = loadUserConfig();
  if (!user.authToken) return false;
  if (user.authExpiresAt) {
    if (new Date(user.authExpiresAt) < new Date()) return false;
  }
  return true;
}

export function getAuthToken(): string | undefined {
  return loadUserConfig().authToken;
}

export function saveAuthTokens(tokens: AuthTokens): void {
  saveUserConfig({
    authToken: tokens.accessToken,
    authRefreshToken: tokens.refreshToken,
    authExpiresAt: tokens.expiresAt,
  });
}

export function clearAuthTokens(): void {
  saveUserConfig({
    authToken: undefined,
    authRefreshToken: undefined,
    authExpiresAt: undefined,
  });
}

export function getDeveloperToken(): string | undefined {
  return loadUserConfig().developerToken;
}

export function getDeveloperTokenMetadata(): DeveloperTokenConfig {
  const user = loadUserConfig();
  return {
    developerTokenId: user.developerTokenId,
    developerToken: user.developerToken,
    developerTokenExpiresAt: user.developerTokenExpiresAt,
  };
}

export function isDeveloperTokenActive(): boolean {
  const user = loadUserConfig();
  if (!user.developerToken) return false;
  if (user.developerTokenExpiresAt && new Date(user.developerTokenExpiresAt) < new Date()) {
    return false;
  }
  return true;
}

export function saveDeveloperToken(token: DeveloperTokenGrantDTO): void {
  saveUserConfig({
    developerTokenId: token.tokenId,
    developerToken: token.token,
    developerTokenExpiresAt: token.expiresAt,
  });
}

export function clearDeveloperToken(): void {
  saveUserConfig({
    developerTokenId: undefined,
    developerToken: undefined,
    developerTokenExpiresAt: undefined,
  });
}

export async function loginWithEmail(
  email: string,
  password: string
): Promise<AuthTokens> {
  const config = resolveConfig();

  if (!config.supabaseUrl || !config.supabaseAnonKey) {
    throw new Error(
      'Supabase URL or anon key not found. Run `lenserfight init` first.'
    );
  }

  const res = await fetch(
    `${config.supabaseUrl}/auth/v1/token?grant_type=password`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: config.supabaseAnonKey,
      },
      body: JSON.stringify({ email, password }),
    }
  );

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error_description: res.statusText }));
    throw new Error(
      err.error_description || err.msg || err.message || 'Login failed'
    );
  }

  const data = await res.json();

  const tokens: AuthTokens = {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresAt: new Date(Date.now() + data.expires_in * 1000).toISOString(),
  };

  saveAuthTokens(tokens);
  return tokens;
}

export async function refreshAuthToken(): Promise<AuthTokens> {
  const user = loadUserConfig();

  if (!user.authRefreshToken) {
    throw new Error('No refresh token stored. Run `lenserfight auth login` first.');
  }

  const config = resolveConfig();

  if (!config.supabaseUrl || !config.supabaseAnonKey) {
    throw new Error('Supabase URL or anon key not found. Run `lenserfight init` first.');
  }

  const res = await fetch(
    `${config.supabaseUrl}/auth/v1/token?grant_type=refresh_token`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: config.supabaseAnonKey,
      },
      body: JSON.stringify({ refresh_token: user.authRefreshToken }),
    }
  );

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error_description: res.statusText }));
    throw new Error(err.error_description || err.msg || err.message || 'Token refresh failed');
  }

  const data = await res.json();

  const tokens: AuthTokens = {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresAt: new Date(Date.now() + data.expires_in * 1000).toISOString(),
  };

  saveAuthTokens(tokens);
  return tokens;
}

export function buildAuthAppUrl(pathname = '/'): string {
  const config = resolveConfig();
  return new URL(pathname, config.authBaseUrl).toString();
}

export async function requestDeviceApproval(
  dto: DeviceApprovalRequestDTO = {}
): Promise<DeviceApprovalRequestResultDTO> {
  const result = await callRpc<DeviceApprovalRequestResultDTO>(
    'fn_auth_request_device_approval',
    {
      p_label: dto.label ?? null,
      p_request_ttl_minutes: dto.requestTtlMinutes ?? null,
      p_token_ttl_hours: dto.tokenTtlHours ?? null,
    },
    { requireAuth: true }
  );

  return result
}

export async function approveDeviceRequest(
  dto: ApproveDeviceRequestDTO
): Promise<ApproveDeviceRequestResultDTO> {
  return callRpc<ApproveDeviceRequestResultDTO>('fn_auth_approve_device_request', {
    p_user_code: dto.userCode,
  }, { requireAuth: true })
}

export async function exchangeDeviceApproval(
  dto: ExchangeDeviceApprovalDTO
): Promise<DeveloperTokenExchangeResultDTO> {
  return callRpc<DeveloperTokenExchangeResultDTO>(
    'fn_auth_exchange_device_approval',
    {
      p_request_id: dto.requestId,
      p_request_secret: dto.requestSecret,
    },
    { requireAuth: true }
  )
}

export async function listDeveloperTokens(): Promise<DeveloperTokenSummaryDTO[]> {
  return callRpc<DeveloperTokenSummaryDTO[]>('fn_auth_list_developer_tokens', {}, {
    requireAuth: true,
  })
}

export async function revokeDeveloperToken(tokenId: string): Promise<void> {
  await callRpc('fn_auth_revoke_developer_token', { p_token_id: tokenId }, { requireAuth: true })
}

export async function waitForDeveloperToken(
  request: DeviceApprovalRequestResultDTO,
  onStatus?: (status: DeveloperTokenExchangeResultDTO) => void
): Promise<DeveloperTokenGrantDTO> {
  const pollIntervalMs = Math.max(request.pollIntervalSeconds, 1) * 1000
  const deadline = new Date(request.expiresAt).getTime()

  while (Date.now() <= deadline) {
    const status = await exchangeDeviceApproval({
      requestId: request.requestId,
      requestSecret: request.requestSecret,
    })

    onStatus?.(status)

    if (status.status === 'approved' && status.token && status.tokenId && status.createdAt) {
      return {
        tokenId: status.tokenId,
        token: status.token,
        label: status.label ?? null,
        tokenPrefix: status.tokenPrefix ?? status.token.slice(0, 8),
        expiresAt: status.expiresAt,
        createdAt: status.createdAt,
      }
    }

    if (status.status === 'expired' || status.status === 'invalid') {
      throw new Error('Device approval request expired or became invalid.')
    }

    await new Promise((resolve) => setTimeout(resolve, pollIntervalMs))
  }

  throw new Error('Device approval request expired before approval.')
}

export interface RegisterResult {
  id: string;
  email: string;
  handle: string;
}

export async function registerUser(
  email: string,
  password: string,
  displayName?: string
): Promise<RegisterResult> {
  const config = resolveConfig();

  if (!config.supabaseUrl) {
    throw new Error('Supabase URL not found. Run `lenserfight init` first.');
  }

  let userId: string;
  let userEmail: string;

  if (config.mode === 'local') {
    if (!config.supabaseServiceRoleKey) {
      throw new Error(
        'Service role key not found. Local register requires the service role key.'
      );
    }

    const res = await fetch(`${config.supabaseUrl}/auth/v1/admin/users`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: config.supabaseServiceRoleKey,
        Authorization: `Bearer ${config.supabaseServiceRoleKey}`,
      },
      body: JSON.stringify({
        email,
        password,
        email_confirm: true,
        user_metadata: displayName ? { display_name: displayName } : {},
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: res.statusText }));
      throw new Error(
        err.msg || err.message || err.error_description || 'Registration failed'
      );
    }

    const data = await res.json();
    userId = data.id;
    userEmail = data.email;
  } else {
    if (!config.supabaseAnonKey) {
      throw new Error(
        'Supabase anon key not found. Run `lenserfight init` first.'
      );
    }

    const res = await fetch(`${config.supabaseUrl}/auth/v1/signup`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: config.supabaseAnonKey,
      },
      body: JSON.stringify({
        email,
        password,
        data: displayName ? { display_name: displayName } : {},
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: res.statusText }));
      throw new Error(
        err.msg || err.message || err.error_description || 'Registration failed'
      );
    }

    const data = await res.json();
    userId = data.id ?? data.user?.id;
    userEmail = data.email ?? data.user?.email ?? email;

    if (!userId) {
      throw new Error(
        'Registration submitted. Check your email to confirm before logging in.'
      );
    }
  }

  const handle = generateHandle(displayName ?? email);
  await createLenserProfile(userId, handle, displayName ?? '', config);

  return { id: userId, email: userEmail, handle };
}

function generateHandle(source: string): string {
  const base = source.includes('@') ? source.split('@')[0] : source;
  const slug = base
    .toLowerCase()
    .replace(/[^a-z0-9._]/g, '_')
    .replace(/^[^a-z0-9]+/, '');
  const suffix = Math.floor(Math.random() * 900 + 100);
  const trimmed = slug.slice(0, 20);
  const candidate =
    trimmed.length >= 1 ? `${trimmed}_${suffix}` : `user_${suffix}`;
  return candidate.slice(0, 24);
}

async function createLenserProfile(
  userId: string,
  handle: string,
  displayName: string,
  config: import('../config/project-config').LenserfightConfig
): Promise<void> {
  const key = config.supabaseServiceRoleKey ?? config.supabaseAnonKey;
  const authHeader = config.supabaseServiceRoleKey
    ? `Bearer ${config.supabaseServiceRoleKey}`
    : config.authToken
    ? `Bearer ${config.authToken}`
    : `Bearer ${config.supabaseAnonKey}`;

  const doInsert = async (h: string) =>
    fetch(`${config.supabaseUrl}/rest/v1/lensers.profiles`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: key!,
        Authorization: authHeader,
        Prefer: 'return=minimal',
      },
      body: JSON.stringify({
        user_id: userId,
        handle: h,
        display_name: displayName || h,
      }),
    });

  let res = await doInsert(handle);

  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }));
    const msg: string = err.message || err.details || '';
    if (
      res.status === 409 ||
      msg.includes('duplicate') ||
      msg.includes('unique')
    ) {
      const retryHandle = generateHandle(
        handle + Math.random().toString(36).slice(2, 5)
      );
      res = await doInsert(retryHandle);
      if (!res.ok) {
        throw new Error(
          `Auth user created (id: ${userId}) but profile creation failed. ` +
            `Create the profile manually via the Supabase dashboard.`
        );
      }
      return;
    }
    throw new Error(
      `Auth user created (id: ${userId}) but profile creation failed: ${msg || res.statusText}`
    );
  }
}

export async function getUserInfo(): Promise<Record<string, unknown> | null> {
  const config = resolveConfig();
  const token = config.authToken;

  if (!token) return null;

  const res = await fetch(`${config.supabaseUrl}/auth/v1/user`, {
    headers: {
      apikey: config.supabaseAnonKey,
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) return null;

  return res.json();
}

// ---------------------------------------------------------------------------
// Browser-based login (Device Authorization Grant — unauthenticated initiation)
// ---------------------------------------------------------------------------

export function openBrowser(url: string): void {
  const cmd =
    process.platform === 'win32'
      ? `start "" "${url}"`
      : process.platform === 'darwin'
      ? `open "${url}"`
      : `xdg-open "${url}"`;
  exec(cmd); // non-fatal — user always has the URL printed to the terminal
}

export async function requestDeviceLogin(): Promise<DeviceLoginRequestResultDTO> {
  return callRpc<DeviceLoginRequestResultDTO>(
    'fn_auth_request_device_login',
    { p_request_ttl_minutes: 10 },
    { noAuth: true } // anon — never attach a stale/expired token
  );
}

export async function exchangeDeviceLogin(dto: {
  requestId: string;
  requestSecret: string;
}): Promise<DeviceLoginExchangeResultDTO> {
  return callRpc<DeviceLoginExchangeResultDTO>(
    'fn_auth_exchange_device_login',
    { p_request_id: dto.requestId, p_request_secret: dto.requestSecret },
    { noAuth: true } // anon — never attach a stale/expired token
  );
}

export async function waitForSessionLogin(
  request: DeviceLoginRequestResultDTO,
  onStatus?: (status: DeviceLoginExchangeResultDTO) => void
): Promise<AuthTokens> {
  const pollMs = Math.max(request.pollIntervalSeconds, 3) * 1000;
  const deadline = new Date(request.expiresAt).getTime();

  while (Date.now() <= deadline) {
    const status = await exchangeDeviceLogin({
      requestId: request.requestId,
      requestSecret: request.requestSecret,
    });

    onStatus?.(status);

    if (status.status === 'approved' && status.accessToken && status.refreshToken) {
      const tokens: AuthTokens = {
        accessToken: status.accessToken,
        refreshToken: status.refreshToken,
        expiresAt: new Date(Date.now() + 3600 * 1000).toISOString(),
      };
      saveAuthTokens(tokens);
      return tokens;
    }

    if (status.status === 'expired' || status.status === 'invalid') {
      throw new Error('Login request expired or became invalid.');
    }

    await new Promise((resolve) => setTimeout(resolve, pollMs));
  }

  throw new Error('Login request expired before browser approval.');
}
