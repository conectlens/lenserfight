import { createClient, type SupabaseClient } from '@supabase/supabase-js'

export interface SupabaseEnv {
  url: string
  anonKey: string
  serviceRoleKey: string
}

export function getSupabaseEnv(): SupabaseEnv {
  const url = process.env['SUPABASE_URL'] || process.env['VITE_SUPABASE_URL']
  const anonKey = process.env['SUPABASE_ANON_KEY'] || process.env['VITE_SUPABASE_ANON_KEY']
  const serviceRoleKey = process.env['SUPABASE_SERVICE_ROLE_KEY']

  if (!url || !anonKey || !serviceRoleKey) {
    throw new Error('SUPABASE_URL, SUPABASE_ANON_KEY, and SUPABASE_SERVICE_ROLE_KEY are required.')
  }

  return { url, anonKey, serviceRoleKey }
}

function createBaseClient(apiKey: string, authorization?: string): SupabaseClient {
  const env = getSupabaseEnv()
  return createClient(env.url, apiKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
    global: authorization
      ? {
          headers: {
            Authorization: authorization,
          },
        }
      : undefined,
  })
}

export function createServiceSupabaseClient(): SupabaseClient {
  const env = getSupabaseEnv()
  return createBaseClient(env.serviceRoleKey, `Bearer ${env.serviceRoleKey}`)
}

export function createUserSupabaseClient(accessToken: string): SupabaseClient {
  const env = getSupabaseEnv()
  return createBaseClient(env.anonKey, `Bearer ${accessToken}`)
}
