import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { resolve } from 'node:path';

// ---------------------------------------------------------------------------
// Interfaces
// ---------------------------------------------------------------------------

/** Project-level config (.lenserfight/lenserfight.json) — no secrets, safe to commit. */
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

/** Device-level config — secrets, auth tokens, and workspace registry. */
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
  /** Registry of project workspaces synced from project configs. */
  workspaces?: Record<string, WorkspaceSnapshot>;
}

export interface OnboardingStateSnapshot {
  status: 'not_started' | 'in_progress' | 'partial' | 'complete';
  mode: 'local' | 'cloud';
  completedSteps: string[];
  skippedSteps: string[];
  lastError?: string;
  updatedAt: string;
}

/** One entry per project workspace, synced to device config on every project-config write. */
export interface WorkspaceSnapshot {
  mode: 'local' | 'cloud';
  lastSeenAt: string;
  configPath: string;
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
// OS-aware device config directory
//
//   Windows : %APPDATA%\lenserfight\
//   macOS   : ~/Library/Application Support/lenserfight/
//   Linux   : $XDG_CONFIG_HOME/lenserfight/   (default: ~/.config/lenserfight/)
//   Pardus  : same as Linux (XDG-compliant, Debian-based)
//
// The legacy ~/.lenserfight/ path is kept for backward compatibility:
// reads fall back to it; writes mirror to it when the file already exists.
// ---------------------------------------------------------------------------

export function getDeviceConfigDir(): string {
  if (process.platform === 'win32') {
    const appData =
      process.env['APPDATA'] ?? resolve(homedir(), 'AppData', 'Roaming');
    return resolve(appData, 'lenserfight');
  }
  if (process.platform === 'darwin') {
    return resolve(homedir(), 'Library', 'Application Support', 'lenserfight');
  }
  // Linux, Pardus (TÜBİTAK), and other XDG-compliant systems
  const xdgConfig =
    process.env['XDG_CONFIG_HOME'] ?? resolve(homedir(), '.config');
  return resolve(xdgConfig, 'lenserfight');
}

export function getDeviceConfigPath(): string {
  return resolve(getDeviceConfigDir(), 'config.json');
}

// Legacy ~/.lenserfight — kept for backward compatibility
const LEGACY_DEVICE_CONFIG_DIR = resolve(homedir(), '.lenserfight');
const LEGACY_DEVICE_CONFIG_PATH = resolve(LEGACY_DEVICE_CONFIG_DIR, 'lenserfight.json');

// ---------------------------------------------------------------------------
// Project-level config
//
// Primary  : .lenserfight/lenserfight.json   (directory-based, new)
// Legacy   : .lenserfight.json               (flat file, read-only for compat)
//
// `saveConfig` always writes to the directory-based path and creates the
// .lenserfight/ directory if it does not yet exist.
// ---------------------------------------------------------------------------

const PROJECT_CONFIG_DIR_NAME = '.lenserfight';
const PROJECT_CONFIG_FILE_IN_DIR = 'lenserfight.json';
const PROJECT_CONFIG_LEGACY_FILE = '.lenserfight.json';

const DEFAULT_PROJECT_CONFIG: ProjectConfig = {
  mode: 'local',
  dbPort: 54322,
  apiPort: 54321,
};

/** Returns the .lenserfight/ directory path for the given project root. */
export function findProjectConfigDir(cwd = process.cwd()): string {
  return resolve(cwd, PROJECT_CONFIG_DIR_NAME);
}

/** Returns the canonical project config path (.lenserfight/lenserfight.json). */
export function findConfigPath(cwd = process.cwd()): string {
  return resolve(cwd, PROJECT_CONFIG_DIR_NAME, PROJECT_CONFIG_FILE_IN_DIR);
}

/** Returns the legacy flat-file project config path (.lenserfight.json). */
export function findLegacyConfigPath(cwd = process.cwd()): string {
  return resolve(cwd, PROJECT_CONFIG_LEGACY_FILE);
}

export function configExists(cwd = process.cwd()): boolean {
  return (
    existsSync(findConfigPath(cwd)) || existsSync(findLegacyConfigPath(cwd))
  );
}

function stripSecrets(raw: Record<string, unknown>): Record<string, unknown> {
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
  return safe;
}

export function loadConfig(cwd = process.cwd()): ProjectConfig {
  const dirPath = findConfigPath(cwd);
  const legacyPath = findLegacyConfigPath(cwd);

  // Prefer directory-based config; fall back to legacy flat file
  const activePath = existsSync(dirPath)
    ? dirPath
    : existsSync(legacyPath)
    ? legacyPath
    : null;

  if (!activePath) return { ...DEFAULT_PROJECT_CONFIG };
  try {
    const raw = JSON.parse(readFileSync(activePath, 'utf-8'));
    return { ...DEFAULT_PROJECT_CONFIG, ...stripSecrets(raw) } as ProjectConfig;
  } catch {
    return { ...DEFAULT_PROJECT_CONFIG };
  }
}

export function saveConfig(
  config: Partial<ProjectConfig>,
  cwd = process.cwd()
): void {
  const configDir = findProjectConfigDir(cwd);
  if (!existsSync(configDir)) {
    mkdirSync(configDir, { recursive: true });
  }

  const dirPath = findConfigPath(cwd);
  const legacyPath = findLegacyConfigPath(cwd);

  // Seed from whichever source currently exists
  const existing: Record<string, unknown> = (() => {
    const src = existsSync(dirPath)
      ? dirPath
      : existsSync(legacyPath)
      ? legacyPath
      : null;
    if (!src) return {};
    try {
      return JSON.parse(readFileSync(src, 'utf-8'));
    } catch {
      return {};
    }
  })();

  const safe = stripSecrets({ ...existing, ...config } as Record<string, unknown>);
  writeFileSync(dirPath, JSON.stringify(safe, null, 2) + '\n');

  // Best-effort: register this workspace in the device config so the TUI
  // and `lf config sync` can discover all known projects across devices.
  try {
    syncWorkspaceToDevice(
      cwd,
      ((config.mode ?? existing['mode'] ?? 'local') as 'local' | 'cloud'),
      dirPath,
    );
  } catch {
    // non-fatal — workspace sync does not block project config writes
  }
}

// ---------------------------------------------------------------------------
// Device-level config
// ---------------------------------------------------------------------------

export function loadUserConfig(): UserConfig {
  const primary = getDeviceConfigPath();
  for (const path of [primary, LEGACY_DEVICE_CONFIG_PATH]) {
    if (existsSync(path)) {
      try {
        return JSON.parse(readFileSync(path, 'utf-8'));
      } catch {
        // fall through to next candidate
      }
    }
  }
  return {};
}

export function ensureUserConfigDir(): boolean {
  const dir = getDeviceConfigDir();
  let created = false;
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
    created = true;
  }
  const path = getDeviceConfigPath();
  if (!existsSync(path)) {
    writeFileSync(path, '{}\n');
    return true;
  }
  return created;
}

export function saveUserConfig(partial: Partial<UserConfig>): void {
  const dir = getDeviceConfigDir();
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
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
  const primary = getDeviceConfigPath();
  writeFileSync(primary, JSON.stringify(merged, null, 2) + '\n');

  // Mirror to legacy path if it already exists — avoids breaking tooling
  // that was written before OS-aware paths were introduced.
  if (existsSync(LEGACY_DEVICE_CONFIG_PATH)) {
    try {
      writeFileSync(
        LEGACY_DEVICE_CONFIG_PATH,
        JSON.stringify(merged, null, 2) + '\n',
      );
    } catch {
      // non-fatal
    }
  }
}

// ---------------------------------------------------------------------------
// Workspace sync — project → device registry
// ---------------------------------------------------------------------------

function syncWorkspaceToDevice(
  cwd: string,
  mode: 'local' | 'cloud',
  configPath: string,
): void {
  const existing = loadUserConfig();
  const workspaces: Record<string, WorkspaceSnapshot> = {
    ...(existing.workspaces ?? {}),
    [resolve(cwd)]: {
      mode,
      lastSeenAt: new Date().toISOString(),
      configPath,
    },
  };
  saveUserConfig({ workspaces });
}

/** Returns all project workspaces registered in the device config. */
export function listWorkspaces(): Record<string, WorkspaceSnapshot> {
  return loadUserConfig().workspaces ?? {};
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
    file['SUPABASE_URL'];

  const cloudApiUrl =
    process.env['LENSERFIGHT_CLOUD_API_URL'] ||
    process.env['API_URL'] ||
    file['LENSERFIGHT_CLOUD_API_URL'] ||
    file['API_URL'];

  const anonKey =
    process.env['SUPABASE_ANON_KEY'] ||
    file['SUPABASE_ANON_KEY'];

  const serviceKey =
    process.env['SUPABASE_SERVICE_ROLE_KEY'] ||
    file['SUPABASE_SERVICE_ROLE_KEY'];

  const defaultStorageAdapterRaw =
    process.env['DEFAULT_STORAGE_ADAPTER'] ||
    file['DEFAULT_STORAGE_ADAPTER'];

  const ollamaBaseUrl =
    process.env['LENSERFIGHT_OLLAMA_BASE_URL'] ||
    process.env['OLLAMA_BASE_URL'] ||
    file['LENSERFIGHT_OLLAMA_BASE_URL'] ||
    file['OLLAMA_BASE_URL'];

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
    process.env['AUTH_BASE_URL'] ||
    file['AUTH_BASE_URL'];

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
//   2. Device config  (OS-aware path, legacy ~/.lenserfight/ fallback)
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
    process.stderr.write(`[${ts}] device config: ${getDeviceConfigPath()}\n`);
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
