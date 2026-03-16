import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// Derive the parent domain so the auth cookie is shared across all apps.
// e.g. "forum.lenserfight.com" → ".lenserfight.com"; localhost stays as-is.
const getSharedCookieDomain = (): string => {
  const hostname = window.location.hostname
  if (hostname === 'localhost' || hostname === '127.0.0.1') return hostname
  const parts = hostname.split('.')
  return parts.length > 2 ? '.' + parts.slice(-2).join('.') : hostname
}

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    storageKey: 'lf_auth_token',
    persistSession: true,
    detectSessionInUrl: true,
    cookieOptions: {
      domain: getSharedCookieDomain(),
      sameSite: 'lax',
      secure: window.location.protocol === 'https:',
    },
  },
})
