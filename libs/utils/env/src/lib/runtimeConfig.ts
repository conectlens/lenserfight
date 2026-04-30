import { resolveProductEdition } from './appSurface'

function readPublicBaseUrl(envKey: string, fallback: string): string {
  const raw = import.meta.env[envKey] as string | undefined
  const s =
    typeof raw === 'string' && raw.trim() !== '' ? raw.trim().replace(/\/$/, '') : fallback.replace(/\/$/, '')
  return s
}

/** Default local auth origin (`nx serve auth` — see `apps/auth/vite.config.mts`). */
const DEV_AUTH_BASE_URL = 'http://localhost:3004'

/**
 * SSO / auth app origin (no trailing slash).
 * Set `VITE_AUTH_BASE_URL` in repo-root `.env` / `.env.local`.
 * In Vite dev, if unset, defaults to {@link DEV_AUTH_BASE_URL} instead of production.
 */
export const AUTH_BASE_URL = readPublicBaseUrl(
  'VITE_AUTH_BASE_URL',
  import.meta.env.DEV ? DEV_AUTH_BASE_URL : 'https://auth.lenserfight.com',
)

/** Main / arena app origin for battles, get-started, etc. Override with `VITE_ARENA_URL`. */
export const ARENA_BASE_URL = readPublicBaseUrl('VITE_ARENA_URL', 'https://lenserfight.com')

/** Community web origin (return URLs, links). Override with `VITE_WEB_BASE_URL`. */
export const WEB_BASE_URL = readPublicBaseUrl('VITE_WEB_BASE_URL', 'https://lenserfight.com')

/** Documentation site origin. Override with `VITE_DOCS_BASE_URL` (e.g. http://localhost:5174 in local dev). */
export const DOCS_BASE_URL = readPublicBaseUrl('VITE_DOCS_BASE_URL', 'https://docs.lenserfight.com')

// Environment
export const MODE = import.meta.env.MODE // "development", "production", "test"
export const isProd = MODE === 'production'

// Data Source — `supabase` (default) or `file` (planned lightweight workspace; use Supabase for full fidelity)
export type DataBackendKind = 'supabase' | 'file'

export const DATA_SOURCE = import.meta.env.VITE_DATA_SOURCE || 'supabase'

export const dataBackendKind: DataBackendKind =
  import.meta.env.VITE_DATA_SOURCE === 'file' ? 'file' : 'supabase'

export const isFileDataBackend = dataBackendKind === 'file'

// Mock flag
export const isMock = import.meta.env.VITE_MOCK === 'true'

// Local development flag (Vite dev server)
export const isLocal = MODE === 'development'

// Seed credentials for local auto-fill (matches supabase/seed.sql)
export const LOCAL_SEED_CREDENTIALS = {
  email: 'alice@lenserfight.local',
  password: 'Alice#Lenser2026!',
  displayName: 'Alice Arena',
} as const

function featureEnabled(envKey: string, editionDefault: boolean): boolean {
  const v = import.meta.env[envKey]
  if (v === 'true') return true
  if (v === 'false') return false
  return editionDefault
}

const editionIsCloud = resolveProductEdition() === 'cloud'

// Feature Flags — explicit `VITE_FEATURE_*=true|false` wins; otherwise cloud edition defaults on.
export const FEATURES = {
  CHALLENGES_TAB: featureEnabled('VITE_FEATURE_CHALLENGES_TAB', editionIsCloud),
  LENSER_ACTIVITY: featureEnabled('VITE_FEATURE_LENSER_ACTIVITY', editionIsCloud),
  NOTIFICATIONS: featureEnabled('VITE_FEATURE_NOTIFICATIONS', editionIsCloud),
  NETWORK_LINKS: featureEnabled('VITE_FEATURE_NETWORK_LINKS', editionIsCloud),
  AGENTS: featureEnabled('VITE_FEATURE_AGENTS', editionIsCloud),
  // MVP launch guard: battle entrypoints stay private until public arena is ready.
  PUBLIC_BATTLES: featureEnabled('VITE_FEATURE_PUBLIC_BATTLES', editionIsCloud),
  // Supabase publishing and cloud wiring are still staged for post-MVP rollout.
  SUPABASE_INTEGRATION: featureEnabled('VITE_FEATURE_SUPABASE_INTEGRATION', editionIsCloud),
  // CRON scheduling is out of OSS beta scope — deferred to Wave 2 / post-stabilization.
  CRON_SCHEDULING: featureEnabled('VITE_FEATURE_CRON_SCHEDULING', false),
}

export { resolveProductEdition, SURFACE } from './appSurface'
export type { AppSurface, ProductEdition } from './appSurface'

// Captcha
export const CAPTCHA_SITE_KEY = import.meta.env.VITE_CAPTCHA_SITE_KEY || ''

export const ENABLE_CAPTCHA = isProd && !isMock
