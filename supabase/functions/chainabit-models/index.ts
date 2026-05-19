// @ts-nocheck
// chainabit-models — Supabase Edge Function (Deno runtime)
//
// Returns Chainabit's active AI model catalog via GET /api/v1/ai/models.
// Token resolved from auth.identities (keycloak slot), not partner_provisions.
//
// Replaces the removed partner-models function.
//
// Required env vars:
//   SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY
//   CHAINABIT_API_URL (default: https://api.chainabit.com/api/v1)

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { handleCors, errResponse, jsonResponse } from '../_shared/cors.ts'
import {
  resolveChainabitToken,
  ProviderNotConnectedError,
  CapabilityDeniedError,
} from '../_shared/provider-token.ts'
import { requireCapabilities, CAPABILITIES } from '../_shared/capability-validator.ts'

declare const Deno: { env: { get(key: string): string | undefined } }

serve(async (req: Request): Promise<Response> => {
  const corsResponse = handleCors(req)
  if (corsResponse) return corsResponse

  if (req.method !== 'GET') {
    return new Response('Method Not Allowed', { status: 405 })
  }

  const authHeader = req.headers.get('Authorization')
  if (!authHeader) return errResponse('unauthenticated', 'Missing Authorization header', 401, req)

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const userClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: authHeader } },
  })
  const adminClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)

  const { data: { user }, error: authError } = await userClient.auth.getUser()
  if (authError || !user) return errResponse('unauthenticated', 'Invalid or expired token', 401, req)

  // Resolve Chainabit OAuth token and assert profile:read scope.
  // The model catalog endpoint is authenticated — a connected identity without
  // profile:read would hit a Chainabit 401/403 with an opaque error; we surface
  // it early with a clear insufficient_scope response instead.
  let token: { accessToken: string; scopes: string[] }
  try {
    token = await resolveChainabitToken(user.id, adminClient)
    requireCapabilities(token.scopes, CAPABILITIES.PROFILE_READ)
  } catch (err) {
    if (err instanceof ProviderNotConnectedError) {
      return errResponse('not_connected', err.message, 403, req)
    }
    if (err instanceof CapabilityDeniedError) {
      return errResponse('insufficient_scope', err.message, 403, req)
    }
    console.error('[chainabit-models] token resolution failed:', err)
    return errResponse('token_resolution_failed', 'Failed to resolve Chainabit token', 500, req)
  }

  const chainabitUrl = (Deno.env.get('CHAINABIT_API_URL') ?? 'https://api.chainabit.com/api/v1')
    .replace(/\/$/, '')

  const modelsRes = await fetch(`${chainabitUrl}/ai/models?isActive=true`, {
    headers: { Authorization: `Bearer ${token.accessToken}` },
  })

  if (!modelsRes.ok) {
    if (modelsRes.status === 401) {
      return errResponse('token_expired', 'Chainabit token expired — reconnect your account', 401, req)
    }
    const text = await modelsRes.text()
    console.error(`[chainabit-models] /ai/models ${modelsRes.status}:`, text.slice(0, 300))
    return errResponse('provider_error', 'Failed to fetch AI models', 502, req)
  }

  const body = (await modelsRes.json()) as { data: unknown[] }
  return jsonResponse(body.data ?? [], 200, req)
})
