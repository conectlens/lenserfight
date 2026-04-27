import type { IncomingMessage } from 'node:http'
import type { User } from '@supabase/supabase-js'
import { createServiceSupabaseClient, createUserSupabaseClient } from '../supabase'
import { getBearerToken } from '../http'

export interface AuthContext {
  accessToken: string
  user: User
  userClient: ReturnType<typeof createUserSupabaseClient>
  serviceClient: ReturnType<typeof createServiceSupabaseClient>
}

export async function authenticateRequest(req: IncomingMessage): Promise<AuthContext> {
  const token = getBearerToken(req)
  if (!token) {
    throw new Error('Missing bearer token')
  }

  const serviceClient = createServiceSupabaseClient()
  const { data, error } = await serviceClient.auth.getUser(token)
  if (error || !data.user) {
    throw new Error('Invalid bearer token')
  }

  return {
    accessToken: token,
    user: data.user,
    userClient: createUserSupabaseClient(token),
    serviceClient,
  }
}
