import { createClient } from '@supabase/supabase-js'
import { cookieStorage } from './cookieStorage'

const shouldUsePlaceholderClient =
  import.meta.env.DATA_SOURCE === 'file' || import.meta.env.DEV || process.env.NODE_ENV === 'test'

// Keep file/test/dev imports non-throwing, but never let a production bundle
// silently talk to the local Supabase placeholder.
const supabaseUrl =
  import.meta.env.SUPABASE_URL || (shouldUsePlaceholderClient ? 'http://localhost:54321' : undefined)
const supabaseKey =
  import.meta.env.SUPABASE_PUBLISHABLE_KEY ||
  (shouldUsePlaceholderClient ? 'placeholder-key-for-file-mode' : undefined)

if (!supabaseUrl || !supabaseKey) {
  throw new Error(
    'Missing Supabase public env: set SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY for this Vite app.'
  )
}

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    storageKey: 'lf_auth_token',
    persistSession: true,
    detectSessionInUrl: true,
    storage: cookieStorage,
  },
})

// Exported as rememberMeStorage for backward compatibility with LoginPage
export { cookieStorage as rememberMeStorage }
