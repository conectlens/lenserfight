import { createClient } from '@supabase/supabase-js'

type StorageValue = string | null

const memoryStorage = new Map<string, string>()

const nativeStorage = {
  getItem(key: string): StorageValue {
    return memoryStorage.get(key) ?? null
  },
  setItem(key: string, value: string): void {
    memoryStorage.set(key, value)
  },
  removeItem(key: string): void {
    memoryStorage.delete(key)
  },
}

const isTest = process.env.NODE_ENV === 'test'
const isDev = process.env.NODE_ENV !== 'production'

const supabaseUrl =
  process.env.EXPO_PUBLIC_SUPABASE_URL ||
  process.env.SUPABASE_URL ||
  (isDev || isTest ? 'http://localhost:54321' : undefined)

if (isDev && supabaseUrl && supabaseUrl.includes('localhost')) {
  console.warn(
    `⚠️ [LenserFight Mobile Dev Warning]: Supabase URL is set to '${supabaseUrl}'. ` +
    `When developing with Expo Go on a physical device, 'localhost' will NOT resolve to your machine. ` +
    `Ensure your backend server is bound to 0.0.0.0, and configure EXPO_PUBLIC_SUPABASE_URL with your local IP (e.g. http://192.168.1.5:54321).`
  )
}

const supabaseKey =
  process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.SUPABASE_PUBLISHABLE_KEY ||
  process.env.SUPABASE_ANON_KEY ||
  (isDev || isTest ? 'placeholder-key-for-mobile-dev' : undefined)

if (!supabaseUrl || !supabaseKey) {
  throw new Error(
    'Missing Supabase public env: set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY for mobile.'
  )
}

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    storageKey: 'lf_auth_token',
    persistSession: true,
    detectSessionInUrl: false,
    autoRefreshToken: true,
    storage: nativeStorage,
  },
})

export const rememberMeStorage = {
  setRememberMe(): void {
    // Native MVP uses one persistent-session policy. AsyncStorage can replace this adapter later.
  },
  ...nativeStorage,
}
