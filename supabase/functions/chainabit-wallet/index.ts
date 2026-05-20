// @ts-nocheck
// chainabit-wallet — Supabase Edge Function (Deno runtime)
//
// Returns the authenticated user's Chainabit wallet balance by proxying
// GET /api/v1/wallet/me with their OAuth access token.
//
// Replaces the removed partner-balance function.  The token is resolved from
// auth.identities (keycloak slot, stored by Supabase Custom OAuth Provider)
// rather than from the now-dropped partner_provisions table.
//
// Required env vars:
//   SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY
//   CHAINABIT_API_URL      (default: https://api.chainabit.com/api/v1)
//   CHAINABIT_CLIENT_ID    (same value as SUPABASE_AUTH_CHAINABIT_CLIENT_ID)
//   CHAINABIT_CLIENT_SECRET (same value as SUPABASE_AUTH_CHAINABIT_SECRET)

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { handleCors, errResponse, jsonResponse } from '../_shared/cors.ts'
import {
  resolveChainabitToken,
  ProviderNotConnectedError,
  TokenExpiredError,
  type ChainabitRefreshConfig,
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

  const chainabitUrl = (Deno.env.get('CHAINABIT_API_URL') ?? 'https://api.chainabit.com/api/v1')
    .replace(/\/$/, '')

  // Build server-side refresh config from edge function secrets.
  // Set CHAINABIT_CLIENT_ID and CHAINABIT_CLIENT_SECRET in Supabase Dashboard →
  // Edge Functions → Secrets (same values as SUPABASE_AUTH_CHAINABIT_CLIENT_ID
  // and SUPABASE_AUTH_CHAINABIT_SECRET used by the Auth provider).
  const clientId     = Deno.env.get('CHAINABIT_CLIENT_ID')
  const clientSecret = Deno.env.get('CHAINABIT_CLIENT_SECRET')
  const refreshConfig: ChainabitRefreshConfig | undefined =
    clientId && clientSecret
      ? { apiUrl: chainabitUrl, clientId, clientSecret }
      : undefined

  // Resolve Chainabit OAuth token from auth.identities.  If the stored
  // access_token is expired, resolveChainabitToken performs a server-side
  // refresh using the stored refresh_token and persists the new pair.
  let token: { accessToken: string; scopes: string[] }
  try {
    token = await resolveChainabitToken(user.id, adminClient, refreshConfig)
  } catch (err) {
    if (err instanceof ProviderNotConnectedError) {
      return errResponse('not_connected', err.message, 403, req)
    }
    if (err instanceof TokenExpiredError) {
      return errResponse('token_expired', err.message, 401, req)
    }
    console.error('[chainabit-wallet] token resolution failed:', err)
    return errResponse('token_resolution_failed', 'Failed to resolve Chainabit token', 500, req)
  }

  // Enforce wallet:read capability before calling Chainabit.
  try {
    requireCapabilities(token.scopes, CAPABILITIES.WALLET_READ)
  } catch {
    return errResponse(
      'insufficient_scope',
      'wallet:read scope required — reconnect your Chainabit account',
      403,
      req,
    )
  }

  const walletRes = await fetch(`${chainabitUrl}/wallet/me`, {
    headers: { Authorization: `Bearer ${token.accessToken}` },
  })

  if (!walletRes.ok) {
    if (walletRes.status === 401) {
      // Token expired and refresh was not possible — user must reconnect.
      return errResponse(
        'token_expired',
        'Chainabit token expired — reconnect your account',
        401,
        req,
      )
    }
    const text = await walletRes.text()
    console.error(`[chainabit-wallet] /wallet/me ${walletRes.status}:`, text.slice(0, 300))
    return errResponse('provider_error', 'Failed to fetch wallet balance', 502, req)
  }

  const body = (await walletRes.json()) as {
    data: {
      balance: {
        total: number
        subscriptionCredits: number
        purchasedCredits: number
      }
    }
  }

  return jsonResponse(
    {
      credits: body.data.balance.total,
      subscriptionCredits: body.data.balance.subscriptionCredits,
      purchasedCredits: body.data.balance.purchasedCredits,
      currency: 'cr',
    },
    200,
    req,
  )
})
