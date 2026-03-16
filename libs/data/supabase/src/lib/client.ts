import { createClient } from '@supabase/supabase-js'
import { rememberMeStorage } from './rememberMeStorage'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// Derive the parent domain so the auth cookie is shared across all apps.
// e.g. "forum.lenserfight.com" → ".lenserfight.com"
//      "forum.localhost"       → ".localhost"   (dev proxy subdomains)
//      "localhost"             → "localhost"    (direct Vite dev server)
const getSharedCookieDomain = (): string => {
  const hostname = window.location.hostname
  if (hostname === 'localhost' || hostname === '127.0.0.1') return hostname
  // Dev proxy runs apps on *.localhost — return .localhost so the cookie is
  // shared across all subdomain apps (forum.localhost, auth.localhost, etc.)
  if (hostname.endsWith('.localhost')) return '.localhost'
  const parts = hostname.split('.')
  return parts.length > 2 ? '.' + parts.slice(-2).join('.') : hostname
}

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    storageKey: 'lf_auth_token',
    persistSession: true,
    detectSessionInUrl: true,
    storage: rememberMeStorage,
    cookieOptions: {
      domain: getSharedCookieDomain(),
      sameSite: 'lax',
      secure: window.location.protocol === 'https:',
    },
  },
})

export { rememberMeStorage }
