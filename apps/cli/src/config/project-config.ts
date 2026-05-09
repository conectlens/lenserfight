import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { resolve } from 'node:path';

// ---------------------------------------------------------------------------
// Interfaces
// ---------------------------------------------------------------------------

/** Project-level config (.lenserfight.json) — no secrets, safe to commit. */
export interface ProjectConfig {
  mode: 'local' | 'cloud';
  supabaseUrl?: string;
  cloudApiUrl?: string;
  cloudId?: string;
  defaultStorageAdapter?: 'supabase' | 'local';
  dbPort: number;
  apiPort: number;
  autoOpenBrowser?: boolean;
  enabledApps?: string[];
}

/** User-level config (~/.lenserfight/config.json) — secrets + auth tokens. */
export interface UserConfig {
  supabaseAnonKey?: string;
  supabaseServiceRoleKey?: string;
  defaultAdapterId?: string;
  authToken?: string;
  authRefreshToken?: string;
  authExpiresAt?: string;
  developerTokenId?: string;
  developerToken?: string;
  developerTokenExpiresAt?: string;
  /** Active community context set by `lenserfight communities switch`. */
  communitySlug?: string;
  onboarding?: Record<string, OnboardingStateSnapshot>;
}

export interface OnboardingStateSnapshot {
  status: 'not_started' | 'in_progress' | 'partial' | 'complete';
  mode: 'local' | 'cloud';
  completedSteps: string[];
  skippedSteps: string[];
  lastError?: string;
  updatedAt: string;
}

/** Merged, fully-resolved config used by all commands. */
export interface LenserfightConfig {
  mode: 'local' | 'cloud';
  supabaseUrl: string;
  cloudApiUrl: string;
  cloudId?: string;
  defaultStorageAdapter?: 'supabase' | 'local';
  supabaseAnonKey: string;
  supabaseServiceRoleKey?: string;
  dbPort: number;
  apiPort: number;
  autoOpenBrowser?: boolean;
  enabledApps?: string[];
  ollamaBaseUrl?: string;
  apiKey?: string;
  authToken?: string;
  authRefreshToken?: string;
  authExpiresAt?: string;
  developerTokenId?: string;
  developerToken?: string;
  developerTokenExpiresAt?: string;
  defaultAdapterId?: string;
  authBaseUrl?: string;
}

// ---------------------------------------------------------------------------
// Well-known Supabase local dev constants (public, same for every project)
// See: https://supabase.com/docs/guides/self-hosting/docker#api-keys
// ---------------------------------------------------------------------------

export const LOCAL_SUPABASE_URL = 'http://127.0.0.1:54321';
const CLOUD_API_URL = 'https://api.lenserfight.com';

export const LOCAL_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRFA0NiK7kyqHDkAkEXER0xnuvvidGu0XP2yJZCqMnY';

const LOCAL_SERVICE_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hj04zWl196z2-SBc0';

// ---------------------------------------------------------------------------
// Project-level config (.lenserfight.json)
// ---------------------------------------------------------------------------

const PROJECT_CONFIG_FILE = '.lenserfight.json';

const DEFAULT_PROJECT_CONFIG: ProjectConfig = {
  mode: 'local',
  dbPort: 54322,
  apiPort: 54321,
};

export function findConfigPath(cwd = process.cwd()): string {
  return resolve(cwd, PROJECT_CONFIG_FILE);
}

export function configExists(cwd = process.cwd()): boolean {
  return existsSync(findConfigPath(cwd));
}

export function loadConfig(cwd = process.cwd()): ProjectConfig {
  const path = findConfigPath(cwd);
  if (!existsSync(path)) return { ...DEFAULT_PROJECT_CONFIG };
  try {
    const raw = JSON.parse(readFileSync(path, 'utf-8'));
    // Drop legacy secret fields that may exist in old config files
    const {
      supabaseAnonKey: _a,
      supabaseServiceRoleKey: _s,
      authToken: _t,
      authRefreshToken: _r,
      authExpiresAt: _e,
      developerTokenId: _dti,
      developerToken: _dt,
      developerTokenExpiresAt: _dte,
      ...safe
    } = raw;
    return { ...DEFAULT_PROJECT_CONFIG, ...safe };
  } catch {
    return { ...DEFAULT_PROJECT_CONFIG };
  }
}

export function saveConfig(
  config: Partial<ProjectConfig>,
  cwd = process.cwd()
): void {
  const path = findConfigPath(cwd);
  const existing = existsSync(path)
    ? (() => { try { return JSON.parse(readFileSync(path, 'utf-8')); } catch { return {}; } })()
    : {};
  // Strip secret fields — they must never be written to project config
  const {
    supabaseAnonKey: _a,
    supabaseServiceRoleKey: _s,
    authToken: _t,
    authRefreshToken: _r,
    authExpiresAt: _e,
    developerTokenId: _dti,
    developerToken: _dt,
    developerTokenExpiresAt: _dte,
    ...safe
  } = { ...existing, ...config } as Record<string, unknown>;
  writeFileSync(path, JSON.stringify(safe, null, 2) + '\n');
}

// ---------------------------------------------------------------------------
// User-level config (~/.lenserfight/config.json)
// ---------------------------------------------------------------------------

const USER_CONFIG_DIR = resolve(homedir(), '.lenserfight');
const USER_CONFIG_PATH = resolve(USER_CONFIG_DIR, 'config.json');

export function loadUserConfig(): UserConfig {
  if (!existsSync(USER_CONFIG_PATH)) return {};
  try {
    return JSON.parse(readFileSync(USER_CONFIG_PATH, 'utf-8'));
  } catch {
    return {};
  }
}

export function ensureUserConfigDir(): boolean {
  if (!existsSync(USER_CONFIG_DIR)) {
    mkdirSync(USER_CONFIG_DIR, { recursive: true });
  }
  if (!existsSync(USER_CONFIG_PATH)) {
    writeFileSync(USER_CONFIG_PATH, '{}\n');
    return true;
  }
  return false;
}

export function saveUserConfig(partial: Partial<UserConfig>): void {
  if (!existsSync(USER_CONFIG_DIR)) {
    mkdirSync(USER_CONFIG_DIR, { recursive: true });
  }
  const existing = loadUserConfig();
  const merged: Record<string, unknown> = { ...existing };
  for (const [k, v] of Object.entries(partial)) {
    if (v === undefined) {
      delete merged[k];
    } else {
      merged[k] = v;
    }
  }
  writeFileSync(USER_CONFIG_PATH, JSON.stringify(merged, null, 2) + '\n');
}

// ---------------------------------------------------------------------------
// Env file resolution (.env.local → .env → process.env)
// ---------------------------------------------------------------------------

interface EnvValues {
  supabaseUrl?: string;
  cloudApiUrl?: string;
  supabaseAnonKey?: string;
  supabaseServiceRoleKey?: string;
  defaultStorageAdapter?: 'supabase' | 'local';
  ollamaBaseUrl?: string;
  apiKey?: string;
  developerToken?: string;
  developerTokenExpiresAt?: string;
  authBaseUrl?: string;
}

function parseEnvFile(filePath: string): Record<string, string> {
  if (!existsSync(filePath)) return {};
  try {
    const lines = readFileSync(filePath, 'utf-8').split('\n');
    const result: Record<string, string> = {};
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eqIdx = trimmed.indexOf('=');
      if (eqIdx < 1) continue;
      const key = trimmed.slice(0, eqIdx).trim();
      const value = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, '');
      result[key] = value;
    }
    return result;
  } catch {
    return {};
  }
}

export function loadEnvConfig(cwd = process.cwd()): EnvValues {
  // .env.local takes priority over .env
  const envBase = parseEnvFile(resolve(cwd, '.env'));
  const envLocal = parseEnvFile(resolve(cwd, '.env.local'));
  const file = { ...envBase, ...envLocal };

  // process.env takes highest priority
  const url =
    process.env['SUPABASE_URL'] ||
    process.env['VITE_SUPABASE_URL'] ||
    file['SUPABASE_URL'] ||
    file['VITE_SUPABASE_URL'];

  const cloudApiUrl =
    process.env['LENSERFIGHT_CLOUD_API_URL'] ||
    process.env['VITE_API_URL'] ||
    file['LENSERFIGHT_CLOUD_API_URL'] ||
    file['VITE_API_URL'];

  const anonKey =
    process.env['SUPABASE_ANON_KEY'] ||
    process.env['VITE_SUPABASE_ANON_KEY'] ||
    file['SUPABASE_ANON_KEY'] ||
    file['VITE_SUPABASE_ANON_KEY'];

  const serviceKey =
    process.env['SUPABASE_SERVICE_ROLE_KEY'] ||
    file['SUPABASE_SERVICE_ROLE_KEY'];

  const defaultStorageAdapterRaw =
    process.env['VITE_DEFAULT_STORAGE_ADAPTER'] ||
    file['VITE_DEFAULT_STORAGE_ADAPTER'];

  const ollamaBaseUrl =
    process.env['LENSERFIGHT_OLLAMA_BASE_URL'] ||
    process.env['VITE_OLLAMA_BASE_URL'] ||
    file['LENSERFIGHT_OLLAMA_BASE_URL'] ||
    file['VITE_OLLAMA_BASE_URL'];

  const apiKey =
    process.env['LENSERFIGHT_API_KEY'] ||
    file['LENSERFIGHT_API_KEY'];

  const developerToken =
    process.env['LENSERFIGHT_DEVELOPER_TOKEN'] ||
    file['LENSERFIGHT_DEVELOPER_TOKEN'];

  const developerTokenExpiresAt =
    process.env['LENSERFIGHT_DEVELOPER_TOKEN_EXPIRES_AT'] ||
    file['LENSERFIGHT_DEVELOPER_TOKEN_EXPIRES_AT'];

  const authBaseUrl =
    process.env['VITE_AUTH_BASE_URL'] ||
    file['VITE_AUTH_BASE_URL'];

  return {
    supabaseUrl: url || undefined,
    cloudApiUrl: cloudApiUrl || undefined,
    supabaseAnonKey: anonKey || undefined,
    supabaseServiceRoleKey: serviceKey || undefined,
    defaultStorageAdapter:
      defaultStorageAdapterRaw === 'local' || defaultStorageAdapterRaw === 'supabase'
        ? defaultStorageAdapterRaw
        : undefined,
    ollamaBaseUrl: ollamaBaseUrl || undefined,
    apiKey: apiKey || undefined,
    developerToken: developerToken || undefined,
    developerTokenExpiresAt: developerTokenExpiresAt || undefined,
    authBaseUrl: authBaseUrl || undefined,
  };
}

// ---------------------------------------------------------------------------
// Fully-resolved config — used by all commands
// Resolution order (highest → lowest):
//   1. process.env / .env.local / .env
//   2. ~/.lenserfight/config.json  (user-level)
//   3. Well-known local Supabase defaults (mode: local only)
// ---------------------------------------------------------------------------

export function resolveConfig(cwd = process.cwd()): LenserfightConfig {
  const project = loadConfig(cwd);
  const user = loadUserConfig();
  const env = loadEnvConfig(cwd);

  // --local global flag overrides project config mode for this invocation
  const forcedLocal = process.env['LF_LOCAL'] === '1';
  const isLocal = forcedLocal || project.mode === 'local';

  const result: LenserfightConfig = {
    mode: forcedLocal ? 'local' : project.mode,
    supabaseUrl:
      env.supabaseUrl ||
      project.supabaseUrl ||
      (isLocal ? LOCAL_SUPABASE_URL : ''),
    cloudApiUrl:
      env.cloudApiUrl ||
      project.cloudApiUrl ||
      (isLocal ? 'http://localhost:8786' : CLOUD_API_URL),
    cloudId: project.cloudId,
    defaultStorageAdapter:
      env.defaultStorageAdapter ||
      project.defaultStorageAdapter ||
      (isLocal ? 'supabase' : undefined),
    autoOpenBrowser: project.autoOpenBrowser,
    enabledApps: project.enabledApps,
    supabaseAnonKey:
      env.supabaseAnonKey ||
      user.supabaseAnonKey ||
      (isLocal ? LOCAL_ANON_KEY : ''),
    supabaseServiceRoleKey:
      env.supabaseServiceRoleKey ||
      user.supabaseServiceRoleKey ||
      (isLocal ? LOCAL_SERVICE_KEY : undefined),
    apiKey: env.apiKey,
    developerToken:
      env.developerToken ||
      user.developerToken,
    developerTokenExpiresAt:
      env.developerTokenExpiresAt ||
      user.developerTokenExpiresAt,
    developerTokenId: user.developerTokenId,
    ollamaBaseUrl: env.ollamaBaseUrl,
    authBaseUrl: env.authBaseUrl,
    dbPort: project.dbPort,
    apiPort: project.apiPort,
    authToken: user.authToken,
    authRefreshToken: user.authRefreshToken,
    authExpiresAt: user.authExpiresAt,
    defaultAdapterId: user.defaultAdapterId,
  };

  if (process.env['LF_DEBUG'] === '1') {
    const ts = new Date().toISOString().slice(11, 23);
    const loaded = ['.env', '.env.local'].filter((f) => existsSync(resolve(cwd, f)));
    process.stderr.write(`[${ts}] config: mode=${result.mode} supabaseUrl=${result.supabaseUrl} cloudApiUrl=${result.cloudApiUrl}\n`);
    process.stderr.write(`[${ts}] env files: ${loaded.length ? loaded.join(', ') : 'none'}\n`);
  }

  return result;
}

export function getWorkspaceKey(cwd = process.cwd()): string {
  return resolve(cwd)
}

export function getOnboardingState(cwd = process.cwd()): OnboardingStateSnapshot | null {
  const user = loadUserConfig()
  const key = getWorkspaceKey(cwd)
  return user.onboarding?.[key] ?? null
}

export function saveOnboardingState(
  partial: Partial<OnboardingStateSnapshot>,
  cwd = process.cwd(),
): OnboardingStateSnapshot {
  const user = loadUserConfig()
  const key = getWorkspaceKey(cwd)
  const current = user.onboarding?.[key] ?? {
    status: 'not_started' as const,
    mode: 'local' as const,
    completedSteps: [],
    skippedSteps: [],
    updatedAt: new Date().toISOString(),
  }

  const next: OnboardingStateSnapshot = {
    ...current,
    ...partial,
    updatedAt: new Date().toISOString(),
  }

  saveUserConfig({
    onboarding: {
      ...(user.onboarding ?? {}),
      [key]: next,
    },
  })

  return next
}
