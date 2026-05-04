import { createClient } from '@supabase/supabase-js'
import { cookieStorage } from './cookieStorage'

// Fall back to placeholder values in file-storage mode so this module can be
// imported without throwing — the supabase client is never actually called when
// VITE_DATA_SOURCE=file (repositories go through the file-mode factory instead).
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'http://localhost:54321'
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'placeholder-key-for-file-mode'

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
