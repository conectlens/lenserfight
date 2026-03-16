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
  dbPort: number;
  apiPort: number;
}

/** User-level config (~/.lenserfight/config.json) — secrets + auth tokens. */
export interface UserConfig {
  supabaseAnonKey?: string;
  supabaseServiceRoleKey?: string;
  defaultAdapterId?: string;
  authToken?: string;
  authRefreshToken?: string;
  authExpiresAt?: string;
}

/** Merged, fully-resolved config used by all commands. */
export interface LenserfightConfig {
  mode: 'local' | 'cloud';
  supabaseUrl: string;
  supabaseAnonKey: string;
  supabaseServiceRoleKey?: string;
  dbPort: number;
  apiPort: number;
  authToken?: string;
  authRefreshToken?: string;
  authExpiresAt?: string;
  defaultAdapterId?: string;
}

// ---------------------------------------------------------------------------
// Well-known Supabase local dev constants (public, same for every project)
// See: https://supabase.com/docs/guides/self-hosting/docker#api-keys
// ---------------------------------------------------------------------------

const LOCAL_SUPABASE_URL = 'http://127.0.0.1:54321';

const LOCAL_ANON_KEY =
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
    const { supabaseAnonKey: _a, supabaseServiceRoleKey: _s, authToken: _t, authRefreshToken: _r, authExpiresAt: _e, ...safe } = raw;
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
  const { supabaseAnonKey: _a, supabaseServiceRoleKey: _s, authToken: _t, authRefreshToken: _r, authExpiresAt: _e, ...safe } = { ...existing, ...config } as Record<string, unknown>;
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
  supabaseAnonKey?: string;
  supabaseServiceRoleKey?: string;
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

  const anonKey =
    process.env['SUPABASE_ANON_KEY'] ||
    process.env['VITE_SUPABASE_ANON_KEY'] ||
    file['SUPABASE_ANON_KEY'] ||
    file['VITE_SUPABASE_ANON_KEY'];

  const serviceKey =
    process.env['SUPABASE_SERVICE_ROLE_KEY'] ||
    file['SUPABASE_SERVICE_ROLE_KEY'];

  return {
    supabaseUrl: url || undefined,
    supabaseAnonKey: anonKey || undefined,
    supabaseServiceRoleKey: serviceKey || undefined,
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
  const isLocal = project.mode === 'local';

  return {
    mode: project.mode,
    supabaseUrl:
      env.supabaseUrl ||
      project.supabaseUrl ||
      (isLocal ? LOCAL_SUPABASE_URL : ''),
    supabaseAnonKey:
      env.supabaseAnonKey ||
      user.supabaseAnonKey ||
      (isLocal ? LOCAL_ANON_KEY : ''),
    supabaseServiceRoleKey:
      env.supabaseServiceRoleKey ||
      user.supabaseServiceRoleKey ||
      (isLocal ? LOCAL_SERVICE_KEY : undefined),
    dbPort: project.dbPort,
    apiPort: project.apiPort,
    authToken: user.authToken,
    authRefreshToken: user.authRefreshToken,
    authExpiresAt: user.authExpiresAt,
    defaultAdapterId: user.defaultAdapterId,
  };
}
