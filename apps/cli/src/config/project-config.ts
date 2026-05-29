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

export const LOCAL_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRFA0NiK7kyqHDkAkEXER0xnuvvidGu0XP2yJZCqMnY';

const LOCAL_SERVICE_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hj04zWl196z2-SBc0';

/** PostgREST + Edge Functions path on any Supabase project URL. */
export const SUPABASE_EDGE_FUNCTIONS_SUFFIX = '/functions/v1';
export const PRODUCTION_AUTH_BASE_URL = 'https://auth.lenserfight.com';

/** Official LenserFight Cloud Supabase project (public client credentials). */
export const PRODUCTION_SUPABASE_URL = 'https://jrjlbycxihqqbwmsmpjn.supabase.co';

/** Publishable/anon key for {@link PRODUCTION_SUPABASE_URL} — safe for CLI client RPC. */
export const PRODUCTION_SUPABASE_ANON_KEY =
  'sb_publishable_L1H6fuj1jULbxhWBrfze2Q_vUyb7cB6';

/** `{supabaseUrl}/functions/v1` — canonical HTTP API base when using Edge Functions. */
export function supabaseEdgeFunctionsBaseUrl(supabaseUrl: string): string {
  const base = supabaseUrl.trim().replace(/\/$/, '');
  if (base.endsWith(SUPABASE_EDGE_FUNCTIONS_SUFFIX)) {
    return base;
  }
  return `${base}${SUPABASE_EDGE_FUNCTIONS_SUFFIX}`;
}

/**
 * Execution / platform API base URL.
 * Explicit `API_URL` / `LENSERFIGHT_CLOUD_API_URL` wins when not dev-only in cloud mode;
 * otherwise derived from `SUPABASE_URL`.
 */
export function resolveCloudApiUrl(
  mode: EffectiveApiMode,
  supabaseUrl: string | undefined,
  explicitUrl?: string,
): string {
  const explicit = explicitUrl?.trim();
  if (explicit && !(mode === 'cloud' && isDevOnlyHostUrl(explicit))) {
    return explicit.replace(/\/$/, '');
  }
  if (supabaseUrl?.trim()) {
    return supabaseEdgeFunctionsBaseUrl(supabaseUrl);
  }
  return '';
}

/** True for localhost, LAN, or Tailscale/CGNAT hosts — not valid cloud API targets. */
export function isDevOnlyHostUrl(url: string): boolean {
  try {
    const { hostname } = new URL(url);
    if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1') {
      return true;
    }
    if (hostname.endsWith('.local')) return true;
    const parts = hostname.split('.').map((p) => Number(p));
    if (parts.length === 4 && parts.every((n) => !Number.isNaN(n))) {
      const [a, b] = parts;
      if (a === 10) return true;
      if (a === 192 && b === 168) return true;
      if (a === 172 && b >= 16 && b <= 31) return true;
      // Tailscale CGNAT 100.64.0.0/10
      if (a === 100 && b >= 64 && b <= 127) return true;
    }
    return false;
  } catch {
    return false;
  }
}

/** @deprecated Use {@link isDevOnlyHostUrl}. */
export const isDevOnlyAuthBaseUrl = isDevOnlyHostUrl;

export function isLocalSupabaseAnonKey(key?: string): boolean {
  const trimmed = key?.trim();
  return !!trimmed && trimmed === LOCAL_ANON_KEY;
}

function pickFirstCloudHostUrl(...candidates: (string | undefined)[]): string {
  for (const candidate of candidates) {
    const value = candidate?.trim();
    if (!value) continue;
    if (!isDevOnlyHostUrl(value)) return value;
  }
  return '';
}

/** Supabase API origin: cloud skips dev-only env/project URLs; falls back to production. */
export function resolveSupabaseUrl(
  mode: EffectiveApiMode,
  envUrl?: string,
  projectUrl?: string,
): string {
  if (mode === 'local') {
    return envUrl?.trim() || projectUrl?.trim() || LOCAL_SUPABASE_URL;
  }
  return pickFirstCloudHostUrl(envUrl, projectUrl) || PRODUCTION_SUPABASE_URL;
}

/** True when env keys are only valid together with a dev Supabase URL. */
function isEnvKeyBoundToDevSupabase(envKey?: string, envUrl?: string): boolean {
  return !!(envKey?.trim() && envUrl?.trim() && isDevOnlyHostUrl(envUrl));
}

/** Anon/publishable key: cloud skips local demo JWT and .env keys paired with dev URLs. */
export function resolveSupabaseAnonKey(
  mode: EffectiveApiMode,
  envKey?: string,
  userKey?: string,
  envUrl?: string,
): string {
  if (mode === 'local') {
    return envKey?.trim() || userKey?.trim() || LOCAL_ANON_KEY;
  }
  const envKeyUsable =
    envKey?.trim() && !isLocalSupabaseAnonKey(envKey) && !isEnvKeyBoundToDevSupabase(envKey, envUrl);
  if (envKeyUsable) return envKey.trim();
  for (const key of [userKey]) {
    const value = key?.trim();
    if (value && !isLocalSupabaseAnonKey(value)) return value;
  }
  return PRODUCTION_SUPABASE_ANON_KEY;
}

function isLocalSupabaseServiceRoleKey(key?: string): boolean {
  const trimmed = key?.trim();
  return !!trimmed && trimmed === LOCAL_SERVICE_KEY;
}

export function resolveSupabaseServiceRoleKey(
  mode: EffectiveApiMode,
  envKey?: string,
  userKey?: string,
): string | undefined {
  if (mode === 'local') {
    return envKey?.trim() || userKey?.trim() || LOCAL_SERVICE_KEY;
  }
  for (const key of [envKey, userKey]) {
    const value = key?.trim();
    if (value && !isLocalSupabaseServiceRoleKey(value)) return value;
  }
  return undefined;
}

/** Browser login base URL: Cloud always uses production; Supabase local may use AUTH_BASE_URL. */
export function resolveAuthBaseUrl(
  mode: EffectiveApiMode,
  envAuthBaseUrl?: string,
): string | undefined {
  if (mode === 'cloud') {
    if (envAuthBaseUrl && isDevOnlyHostUrl(envAuthBaseUrl)) {
      return PRODUCTION_AUTH_BASE_URL;
    }
    return envAuthBaseUrl || PRODUCTION_AUTH_BASE_URL;
  }
  return envAuthBaseUrl;
}

/** Fail fast when cloud mode still resolves to a dev-only backend (should not happen). */
export function assertCloudSupabaseConfigured(config: LenserfightConfig): void {
  if (config.mode !== 'cloud') return;
  if (!config.supabaseUrl?.trim() || isDevOnlyHostUrl(config.supabaseUrl)) {
    throw new Error(
      'Cloud mode could not resolve a hosted Supabase URL. Run `lf use cloud` and retry, or `lf init --mode cloud --url https://<project-ref>.supabase.co`.',
    );
  }
  if (!config.supabaseAnonKey?.trim() || isLocalSupabaseAnonKey(config.supabaseAnonKey)) {
    throw new Error(
      'Cloud mode could not resolve a hosted Supabase anon/publishable key. Set SUPABASE_ANON_KEY for a custom project or use the default cloud target.',
    );
  }
}

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

/** User-level preferences (mode, URLs, ports) — not committed to git. */
export function getUserPreferencesPath(): string {
  return resolve(getDeviceConfigDir(), 'lenserfight.json');
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
  mode: 'cloud',
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

/** True when this working directory has a project-scoped config file. */
export function projectConfigExists(cwd = process.cwd()): boolean {
  return (
    existsSync(findConfigPath(cwd)) || existsSync(findLegacyConfigPath(cwd))
  );
}

/** @alias {@link projectConfigExists} */
export function configExists(cwd = process.cwd()): boolean {
  return projectConfigExists(cwd);
}

export function userPreferencesExist(): boolean {
  if (existsSync(getUserPreferencesPath())) return true;
  // Legacy ~/.lenserfight/lenserfight.json may hold mode/URL (or older combined config)
  if (!existsSync(LEGACY_DEVICE_CONFIG_PATH)) return false;
  try {
    const raw = JSON.parse(readFileSync(LEGACY_DEVICE_CONFIG_PATH, 'utf-8')) as Record<string, unknown>;
    return typeof raw['mode'] === 'string' || typeof raw['supabaseUrl'] === 'string';
  } catch {
    return false;
  }
}

function readProjectConfigFile(activePath: string): ProjectConfig {
  try {
    const raw = JSON.parse(readFileSync(activePath, 'utf-8'));
    return { ...DEFAULT_PROJECT_CONFIG, ...stripSecrets(raw) } as ProjectConfig;
  } catch {
    return { ...DEFAULT_PROJECT_CONFIG };
  }
}

function readUserPreferences(): ProjectConfig {
  const candidates = [getUserPreferencesPath(), LEGACY_DEVICE_CONFIG_PATH];
  for (const path of candidates) {
    if (!existsSync(path)) continue;
    try {
      const raw = JSON.parse(readFileSync(path, 'utf-8')) as Record<string, unknown>;
      if (path === LEGACY_DEVICE_CONFIG_PATH && !raw['mode'] && !raw['supabaseUrl']) {
        continue;
      }
      return { ...DEFAULT_PROJECT_CONFIG, ...stripSecrets(raw) } as ProjectConfig;
    } catch {
      // try next candidate
    }
  }
  return { ...DEFAULT_PROJECT_CONFIG };
}

function applyCloudSafeProjectFields(safe: Record<string, unknown>): void {
  const effectiveMode = safe['mode'] ?? 'cloud';
  if (effectiveMode !== 'cloud') return;
  if (typeof safe['supabaseUrl'] === 'string' && isDevOnlyHostUrl(safe['supabaseUrl'])) {
    delete safe['supabaseUrl'];
  }
  if (typeof safe['cloudApiUrl'] === 'string' && isDevOnlyHostUrl(safe['cloudApiUrl'])) {
    delete safe['cloudApiUrl'];
  }
}

export function saveUserPreferences(config: Partial<ProjectConfig>): void {
  ensureUserConfigDir();
  const existing = readUserPreferences();
  const merged = { ...existing, ...config } as Record<string, unknown>;
  const safe = stripSecrets(merged);
  applyCloudSafeProjectFields(safe);
  writeFileSync(getUserPreferencesPath(), JSON.stringify(safe, null, 2) + '\n');
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

/** Project-scoped file only (ignores user preferences). */
export function readProjectConfigAt(cwd = process.cwd()): ProjectConfig {
  const dirPath = findConfigPath(cwd);
  const legacyPath = findLegacyConfigPath(cwd);
  const activePath = existsSync(dirPath)
    ? dirPath
    : existsSync(legacyPath)
      ? legacyPath
      : null;
  if (!activePath) return { ...DEFAULT_PROJECT_CONFIG };
  return readProjectConfigFile(activePath);
}

export function loadConfig(cwd = process.cwd()): ProjectConfig {
  const user = readUserPreferences();
  if (!projectConfigExists(cwd)) return user;
  // User preferences own mode; project may supply repo-local ports/URLs only.
  const project = readProjectConfigAt(cwd);
  return { ...project, ...user };
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

  const merged = { ...existing, ...config } as Record<string, unknown>;
  const safe = stripSecrets(merged);
  applyCloudSafeProjectFields(safe);
  writeFileSync(dirPath, JSON.stringify(safe, null, 2) + '\n');

  // Best-effort: register this workspace in the device config so the TUI
  // and `lf config sync` can discover all known projects across devices.
  try {
    syncWorkspaceToDevice(
      cwd,
      ((config.mode ?? existing['mode'] ?? 'cloud') as 'local' | 'cloud'),
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
    process.env['SUPABASE_PUBLISHABLE_KEY'] ||
    file['SUPABASE_ANON_KEY'] ||
    file['SUPABASE_PUBLISHABLE_KEY'];

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
// Effective API mode (Supabase local vs Cloud) — single precedence everywhere
// ---------------------------------------------------------------------------

export type EffectiveApiMode = 'local' | 'cloud';

export type EffectiveModeSource = 'env-local' | 'env-cloud' | 'project' | 'user' | 'default';

/** Resolved API target for this invocation (`local` = Supabase local stack only). */
export function getEffectiveMode(cwd = process.cwd()): {
  mode: EffectiveApiMode;
  source: EffectiveModeSource;
} {
  if (process.env['LF_LOCAL'] === '1') {
    return { mode: 'local', source: 'env-local' };
  }
  if (process.env['LF_CLOUD'] === '1') {
    return { mode: 'cloud', source: 'env-cloud' };
  }
  if (userPreferencesExist()) {
    return { mode: readUserPreferences().mode, source: 'user' };
  }
  if (projectConfigExists(cwd)) {
    return { mode: readProjectConfigAt(cwd).mode, source: 'project' };
  }
  return { mode: 'cloud', source: 'default' };
}

// ---------------------------------------------------------------------------
// Fully-resolved config — used by all commands
// Resolution order (highest → lowest):
//   1. process.env / .env.local / .env
//   2. Device config  (OS-aware path, legacy ~/.lenserfight/ fallback)
//   3. Well-known defaults: local Supabase stack | production cloud project
// ---------------------------------------------------------------------------

export function resolveConfig(cwd = process.cwd()): LenserfightConfig {
  const project = loadConfig(cwd);
  const user = loadUserConfig();
  const env = loadEnvConfig(cwd);

  const { mode } = getEffectiveMode(cwd);

  const isLocal = mode === 'local';

  const supabaseUrl = resolveSupabaseUrl(mode, env.supabaseUrl, project.supabaseUrl);

  const result: LenserfightConfig = {
    mode,
    supabaseUrl,
    cloudApiUrl: resolveCloudApiUrl(
      mode,
      supabaseUrl || undefined,
      env.cloudApiUrl || project.cloudApiUrl,
    ),
    cloudId: project.cloudId,
    defaultStorageAdapter:
      env.defaultStorageAdapter ||
      project.defaultStorageAdapter ||
      (isLocal ? 'supabase' : undefined),
    autoOpenBrowser: project.autoOpenBrowser,
    enabledApps: project.enabledApps,
    supabaseAnonKey: resolveSupabaseAnonKey(
      mode,
      env.supabaseAnonKey,
      user.supabaseAnonKey,
      env.supabaseUrl,
    ),
    supabaseServiceRoleKey: resolveSupabaseServiceRoleKey(
      mode,
      env.supabaseServiceRoleKey,
      user.supabaseServiceRoleKey,
    ),
    apiKey: env.apiKey,
    developerToken:
      env.developerToken ||
      user.developerToken,
    developerTokenExpiresAt:
      env.developerTokenExpiresAt ||
      user.developerTokenExpiresAt,
    developerTokenId: user.developerTokenId,
    ollamaBaseUrl: env.ollamaBaseUrl,
    authBaseUrl: resolveAuthBaseUrl(mode, env.authBaseUrl),
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
