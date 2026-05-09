import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.SUPABASE_URL as string
const supabaseAnonKey = import.meta.env.SUPABASE_PUBLISHABLE_KEY as string

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  db: { schema: 'public' },
})
