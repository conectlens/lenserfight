import { resolveProductEdition } from './appSurface'

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
}

export { resolveProductEdition, SURFACE } from './appSurface'
export type { AppSurface, ProductEdition } from './appSurface'

// Captcha
export const CAPTCHA_SITE_KEY = import.meta.env.VITE_CAPTCHA_SITE_KEY || ''

export const ENABLE_CAPTCHA = isProd && !isMock
