// Environment
export const MODE = import.meta.env.MODE // "development", "production", "test"
export const isProd = MODE === 'production'

// Data Source
export const DATA_SOURCE = import.meta.env.VITE_DATA_SOURCE || 'supabase'

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

// Feature Flags
export const FEATURES = {
  CHALLENGES_TAB: import.meta.env.VITE_FEATURE_CHALLENGES_TAB === 'true',
  LENSER_ACTIVITY: import.meta.env.VITE_FEATURE_LENSER_ACTIVITY === 'true',
  NOTIFICATIONS: import.meta.env.VITE_FEATURE_NOTIFICATIONS === 'true',
  NETWORK_LINKS: import.meta.env.VITE_FEATURE_NETWORK_LINKS === 'true',
  AGENTS: import.meta.env.VITE_FEATURE_AGENTS === 'true',
}

// Captcha
export const CAPTCHA_SITE_KEY = import.meta.env.VITE_CAPTCHA_SITE_KEY || ''

export const ENABLE_CAPTCHA = isProd && !isMock
