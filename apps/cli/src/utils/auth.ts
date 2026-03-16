import { loadUserConfig, saveUserConfig, resolveConfig } from '../config/project-config';

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: string;
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
