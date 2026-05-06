/**
 * Server-side environment variable accessors.
 * All raw `process.env` reads across the monorepo must go through here.
 * Throws at construction time when a required variable is missing.
 */

function required(key: string): string {
  const v = process.env[key]
  if (!v) throw new Error(`Missing required env var: ${key}`)
  return v
}

function optional(key: string, fallback = ''): string {
  return process.env[key] ?? fallback
}

// ── Supabase ──────────────────────────────────────────────────────────────────
export const SUPABASE_URL = (): string => {
  const v = optional('SUPABASE_URL') || optional('VITE_SUPABASE_URL')
  if (!v) throw new Error('Missing required env var: SUPABASE_URL (or VITE_SUPABASE_URL)')
  return v
}

export const SUPABASE_ANON_KEY = (): string =>
  optional('SUPABASE_ANON_KEY') || optional('VITE_SUPABASE_ANON_KEY')

export const SUPABASE_SERVICE_ROLE_KEY = (): string =>
  required('SUPABASE_SERVICE_ROLE_KEY')

// ── Platform API ──────────────────────────────────────────────────────────────
export const PLATFORM_API_PORT = (): number =>
  parseInt(optional('PORT', '8786'), 10)

export const PLATFORM_API_CORS_ORIGIN = (): string =>
  optional('CORS_ORIGIN', '*')

export const PLATFORM_API_WORKER_INTERVAL_MS = (): number =>
  parseInt(optional('PLATFORM_API_WORKER_INTERVAL_MS', '2000'), 10)

export const PLATFORM_API_WORKER_ONCE = (): boolean =>
  optional('PLATFORM_API_WORKER_ONCE') === 'true'

// ── Partner — Chainabit ───────────────────────────────────────────────────────
export const CHAINABIT_API_URL = (): string => required('CHAINABIT_API_URL')
export const CHAINABIT_PARTNER_API_KEY = (): string => required('CHAINABIT_PARTNER_API_KEY')

// ── LenserFight Cloud / CLI ───────────────────────────────────────────────────
export const LENSERFIGHT_CLOUD_API_URL = (): string =>
  optional('LENSERFIGHT_CLOUD_API_URL') || optional('VITE_API_URL', '')

export const LENSERFIGHT_OLLAMA_BASE_URL = (): string =>
  optional('LENSERFIGHT_OLLAMA_BASE_URL') || optional('VITE_OLLAMA_BASE_URL', '')

export const LENSERFIGHT_API_KEY = (): string => optional('LENSERFIGHT_API_KEY')

export const LENSERFIGHT_DEVELOPER_TOKEN = (): string =>
  optional('LENSERFIGHT_DEVELOPER_TOKEN')

export const LENSERFIGHT_DEVELOPER_TOKEN_EXPIRES_AT = (): string =>
  optional('LENSERFIGHT_DEVELOPER_TOKEN_EXPIRES_AT')

// ── AI Providers ──────────────────────────────────────────────────────────────
export const GEMINI_API_KEY = (): string => optional('GEMINI_API_KEY')
