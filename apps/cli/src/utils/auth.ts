import { loadConfig, saveConfig } from '../config/project-config';

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: string;
}

export function isAuthenticated(): boolean {
  const config = loadConfig();
  if (!config.authToken) return false;

  if (config.authExpiresAt) {
    const expiry = new Date(config.authExpiresAt);
    if (expiry < new Date()) return false;
  }

  return true;
}

export function getAuthToken(): string | undefined {
  const config = loadConfig();
  return config.authToken;
}

export function saveAuthTokens(tokens: AuthTokens): void {
  saveConfig({
    authToken: tokens.accessToken,
    authRefreshToken: tokens.refreshToken,
    authExpiresAt: tokens.expiresAt,
  });
}

export function clearAuthTokens(): void {
  saveConfig({
    authToken: undefined,
    authRefreshToken: undefined,
    authExpiresAt: undefined,
  });
}

export async function loginWithEmail(
  email: string,
  password: string
): Promise<AuthTokens> {
  const config = loadConfig();

  if (!config.supabaseUrl || !config.supabaseAnonKey) {
    throw new Error(
      'Supabase URL and anon key must be set. Run `lenserfight init` first.'
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

export async function getUserInfo(): Promise<Record<string, unknown> | null> {
  const config = loadConfig();
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
