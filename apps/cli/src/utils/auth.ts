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
