/**
 * Native override of readEnv: tries EXPO_PUBLIC_KEY first, then KEY, then fallback.
 * All public env vars for Expo must be prefixed with EXPO_PUBLIC_ in .env files;
 * the unprefixed fallback supports server-side process.env usage in Edge Functions.
 */
export function readEnv(key: string, fallback = ''): string {
  const raw = process.env[`EXPO_PUBLIC_${key}`] ?? process.env[key]
  return typeof raw === 'string' && raw.trim() !== '' ? raw.trim() : fallback
}

function readPublicBaseUrl(envKey: string, fallback: string): string {
  const expoKey = `EXPO_PUBLIC_${envKey}`
  const raw = process.env[expoKey] ?? process.env[envKey]
  return typeof raw === 'string' && raw.trim() !== ''
    ? raw.trim().replace(/\/$/, '')
    : fallback.replace(/\/$/, '')
}

function stripSupabaseRestPath(url: string): string {
  return url.replace(/\/rest\/v\d+\/?$/, '')
}

export const AUTH_BASE_URL = readPublicBaseUrl('AUTH_BASE_URL', 'https://auth.lenserfight.com')
export const ARENA_BASE_URL = readPublicBaseUrl('ARENA_URL', 'https://lenserfight.com')
export const WEB_BASE_URL = readPublicBaseUrl('WEB_BASE_URL', 'https://lenserfight.com')
export const DOCS_BASE_URL = readPublicBaseUrl('DOCS_BASE_URL', 'https://docs.lenserfight.com')
export const CHAINABIT_APP_URL = readPublicBaseUrl('CHAINABIT_APP_URL', 'https://app.chainabit.com')
export const API_BASE_URL = stripSupabaseRestPath(
  readPublicBaseUrl('API_URL', 'https://api.lenserfight.com')
)

const chainabitApiBase = readPublicBaseUrl('CHAINABIT_API_URL', 'https://api.chainabit.com')

export function chainabitUrl(path: string, version = 1): string {
  return `${chainabitApiBase}/api/v${version}/${path}`
}

export const MODE = process.env.NODE_ENV ?? 'development'
export const isProd = process.env.ENV_MODE === 'production' || process.env.NODE_ENV === 'production'

export type DataBackendKind = 'supabase' | 'file'

export const DATA_SOURCE = process.env.EXPO_PUBLIC_DATA_SOURCE ?? process.env.DATA_SOURCE ?? 'supabase'
export const dataBackendKind: DataBackendKind = DATA_SOURCE === 'file' ? 'file' : 'supabase'
export const isFileDataBackend = dataBackendKind === 'file'
export const isLocal = !isProd

export type LocalSeedCredentials = {
  email: string
  password: string
  displayName: string
}

export async function loadDevSeedCredentials(): Promise<LocalSeedCredentials | null> {
  return null
}

export const CAPTCHA_SITE_KEY = process.env.EXPO_PUBLIC_CAPTCHA_SITE_KEY ?? ''
export const ENABLE_CAPTCHA = false
export const GA_MEASUREMENT_ID = process.env.EXPO_PUBLIC_GA_MEASUREMENT_ID ?? ''
export const PUBLIC_POSTHOG_PROJECT_TOKEN =
  process.env.EXPO_PUBLIC_POSTHOG_PROJECT_TOKEN ?? ''
export const PUBLIC_POSTHOG_HOST =
  process.env.EXPO_PUBLIC_POSTHOG_HOST ?? 'https://us.i.posthog.com'
