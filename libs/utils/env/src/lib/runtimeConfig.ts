import { resolveProductEdition } from './appSurface'

function readPublicBaseUrl(envKey: string, fallback: string): string {
  const raw = import.meta.env[envKey] as string | undefined
  const s =
    typeof raw === 'string' && raw.trim() !== '' ? raw.trim().replace(/\/$/, '') : fallback.replace(/\/$/, '')
  return s
}

/**
 * Strips the Supabase PostgREST version path from a URL so that
 * `API_URL=http://127.0.0.1:54321/rest/v1` doesn't cause double-versioned
 * paths like `/rest/v1/v1/partners/...` when platform API routes append `/v1/`.
 * Also emits a dev-mode warning so the misconfiguration is visible early.
 */
function stripSupabaseRestPath(url: string): string {
  return url.replace(/\/rest\/v\d+\/?$/, '')
}

/** Default local auth origin (`nx serve auth` — see `apps/auth/vite.config.mts`). */
const DEV_AUTH_BASE_URL = 'http://localhost:3004'

/**
 * SSO / auth app origin (no trailing slash).
 * Set `AUTH_BASE_URL` in repo-root `.env` / `.env.local`.
 * In Vite dev, if unset, defaults to {@link DEV_AUTH_BASE_URL} instead of production.
 */
export const AUTH_BASE_URL = readPublicBaseUrl(
  'AUTH_BASE_URL',
  import.meta.env.DEV ? DEV_AUTH_BASE_URL : 'https://auth.lenserfight.com',
)

/** Main / arena app origin for battles, get-started, etc. Override with `ARENA_URL`. */
export const ARENA_BASE_URL = readPublicBaseUrl('ARENA_URL', 'https://lenserfight.com')

/** Community web origin (return URLs, links). Override with `WEB_BASE_URL`. */
export const WEB_BASE_URL = readPublicBaseUrl('WEB_BASE_URL', 'https://lenserfight.com')

/** Documentation site origin. Override with `DOCS_BASE_URL` (e.g. http://localhost:5174 in local dev). */
export const DOCS_BASE_URL = readPublicBaseUrl('DOCS_BASE_URL', 'https://docs.lenserfight.com')

/** Chainabit web app origin — used for deep-links to wallet top-up and partner attribution. Override with `CHAINABIT_APP_URL`. */
export const CHAINABIT_APP_URL = readPublicBaseUrl('CHAINABIT_APP_URL', 'https://app.chainabit.com')

/** Chainabit API v1 base URL — all endpoints live under /api/v1/. Override with CHAINABIT_API_URL. */
export const CHAINABIT_OAUTH_URL = readPublicBaseUrl('CHAINABIT_API_URL', 'https://api.chainabit.com') + '/api/v1'

/**
 * Chainabit OAuth public client ID.
 * Not a secret — Chainabit uses PKCE (no client_secret for public clients).
 * Set CHAINABIT_OAUTH_CLIENT_ID in your .env file.
 */
export const CHAINABIT_OAUTH_CLIENT_ID: string = (import.meta.env['CHAINABIT_OAUTH_CLIENT_ID'] as string) ?? ''

/**
 * Full URL of LenserFight's platform API OAuth callback.
 * Must match the redirect_uri registered on the Chainabit OAuth client.
 * e.g. https://api.lenserfight.com/v1/partners/chainabit/oauth/callback
 */
export const CHAINABIT_OAUTH_CALLBACK_URL: string = (import.meta.env['CHAINABIT_OAUTH_REDIRECT_URI'] as string) ?? ''

/**
 * LenserFight Platform API base URL (no trailing slash).
 * In development defaults to the ngrok tunnel to bypass CORS restrictions on localhost.
 * Override with `API_URL`.
 */
export const API_BASE_URL = stripSupabaseRestPath(readPublicBaseUrl(
  'API_URL',
  import.meta.env.DEV ? 'https://wyatt-proportioned-ashlyn.ngrok-free.dev' : 'https://api.lenserfight.com',
))

/**
 * Chainabit direct API base URL (no trailing slash, no version prefix).
 * All versioned endpoint construction goes through {@link chainabitUrl}.
 */
const _CHAINABIT_API_BASE = readPublicBaseUrl('CHAINABIT_API_URL', 'https://api.chainabit.com')

/**
 * Versioning adapter for all direct Chainabit API calls.
 * Builds `{base}/api/v{version}/{path}` — path must NOT start with a slash.
 * Change `defaultVersion` here to migrate all call sites at once.
 */
export function chainabitUrl(path: string, version = 1): string {
  return `${_CHAINABIT_API_BASE}/api/v${version}/${path}`
}

// Environment
export const MODE = import.meta.env.MODE // "development", "production", "test"
export const isProd = MODE === 'production'

// Data Source — `supabase` (default) or `file` (planned lightweight workspace; use Supabase for full fidelity)
export type DataBackendKind = 'supabase' | 'file'

export const DATA_SOURCE = import.meta.env.DATA_SOURCE || 'supabase'

export const dataBackendKind: DataBackendKind =
  import.meta.env.DATA_SOURCE === 'file' ? 'file' : 'supabase'

export const isFileDataBackend = dataBackendKind === 'file'

// Mock flag
export const isMock = import.meta.env.MOCK === 'true'

// Local development flag (Vite dev server)
export const isLocal = MODE === 'development'

// Seed credentials for local auto-fill (matches supabase/seed.sql)
export const LOCAL_SEED_CREDENTIALS = {
  email: 'hey@lenserfight.com',
  password: 'LenserFight#DevSeed2026!',
  displayName: 'LenserFight',
} as const

function featureEnabled(envKey: string, editionDefault: boolean): boolean {
  const v = import.meta.env[envKey]
  if (v === 'true') return true
  if (v === 'false') return false
  return editionDefault
}

const editionIsCloud = resolveProductEdition() === 'cloud'

// Feature Flags — explicit `FEATURE_*=true|false` wins; otherwise cloud edition defaults on.
export const FEATURES = {
  CHALLENGES_TAB: featureEnabled('FEATURE_CHALLENGES_TAB', editionIsCloud),
  LENSER_ACTIVITY: featureEnabled('FEATURE_LENSER_ACTIVITY', editionIsCloud),
  NOTIFICATIONS: featureEnabled('FEATURE_NOTIFICATIONS', editionIsCloud),
  NETWORK_LINKS: featureEnabled('FEATURE_NETWORK_LINKS', editionIsCloud),
  AGENTS: featureEnabled('FEATURE_AGENTS', editionIsCloud),
  // MVP launch guard: battle entrypoints stay private until public arena is ready.
  PUBLIC_BATTLES: featureEnabled('FEATURE_PUBLIC_BATTLES', editionIsCloud),
  // Supabase publishing and cloud wiring are still staged for post-MVP rollout.
  SUPABASE_INTEGRATION: featureEnabled('FEATURE_SUPABASE_INTEGRATION', editionIsCloud),
  // CRON scheduling: on by default for cloud; off by default for self-hosted/community.
  CRON_SCHEDULING: featureEnabled('FEATURE_CRON_SCHEDULING', editionIsCloud),
  // Analytics dashboard: cost/quality/performance charts per agent.
  AGENT_ANALYTICS: featureEnabled('FEATURE_AGENT_ANALYTICS', editionIsCloud),
  // Cloud waiting list gate. Self-hosted/community installs typically bypass this.
  WAITING_LIST: featureEnabled('FEATURE_WAITING_LIST', editionIsCloud),
  // Chainabit execution bridge: routes battle jobs to Chainabit's cloud executor.
  // Requires CHAINABIT_API_URL and CHAINABIT_PARTNER_API_KEY on the server side.
  CHAINABIT_EXECUTION: featureEnabled('FEATURE_CHAINABIT_EXECUTION', false),
}

export { resolveProductEdition, SURFACE } from './appSurface'
export type { AppSurface, ProductEdition } from './appSurface'

// Captcha
export const CAPTCHA_SITE_KEY = import.meta.env.CAPTCHA_SITE_KEY || ''

export const ENABLE_CAPTCHA = isProd && !isMock

// Analytics
export const GA_MEASUREMENT_ID = import.meta.env.GA_MEASUREMENT_ID || ''
export const PUBLIC_POSTHOG_PROJECT_TOKEN = (import.meta.env['PUBLIC_POSTHOG_PROJECT_TOKEN'] as string | undefined) ?? ''
export const PUBLIC_POSTHOG_HOST = (import.meta.env['PUBLIC_POSTHOG_HOST'] as string | undefined) ?? 'https://us.i.posthog.com'
