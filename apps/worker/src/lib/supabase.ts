import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY } from '@lenserfight/utils/env'

export interface SupabaseEnv {
  url: string
  anonKey: string
  serviceRoleKey: string
}

export function getSupabaseEnv(): SupabaseEnv {
  return {
    url: SUPABASE_URL(),
    anonKey: SUPABASE_ANON_KEY(),
    serviceRoleKey: SUPABASE_SERVICE_ROLE_KEY(),
  }
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
