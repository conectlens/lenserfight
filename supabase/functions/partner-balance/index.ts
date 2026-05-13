// Supabase Edge Function: partner-balance
//
// GET /functions/v1/partner-balance
// Replaces: GET /v1/partners/chainabit/balance (platform-api)
//
// Returns the Chainabit wallet balance for the authenticated user.
// Prefers the developer token (wallet:read scope); falls back to partner API key.
// Requires secrets: CHAINABIT_API_URL, CHAINABIT_PARTNER_API_KEY

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { handleCors, jsonResponse, errResponse } from '../_shared/cors.ts'

const CHAINABIT_API_URL = Deno.env.get('CHAINABIT_API_URL') ?? 'https://api.chainabit.com'
const CHAINABIT_PARTNER_API_KEY = Deno.env.get('CHAINABIT_PARTNER_API_KEY') ?? ''
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? ''
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') ?? ''
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

Deno.serve(async (req: Request) => {
  const cors = handleCors(req)
  if (cors) return cors

  if (req.method !== 'GET') {
    return errResponse('method_not_allowed', 'GET required', 405)
  }

  const authHeader = req.headers.get('Authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return errResponse('unauthorized', 'Missing bearer token', 401)
  }

  const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false },
  })

  const { data: { user }, error: authError } = await userClient.auth.getUser()
  if (authError || !user) {
    return errResponse('unauthorized', 'Invalid token', 401)
  }

  const serviceClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  })

  const { data: provision } = await serviceClient
    .from('partner_provisions')
    .select('external_id, token')
    .eq('user_id', user.id)
    .eq('partner_name', 'chainabit')
    .maybeSingle<{ external_id: string; token: string | null }>()

  if (!provision?.external_id) {
    return errResponse('not_provisioned', 'No Chainabit provision found', 404)
  }

  let balance: { credits: number; accountId: string; currency: string }

  if (provision.token) {
    // Use developer token (wallet:read scope) — preferred path
    const res = await fetch(`${CHAINABIT_API_URL}/api/v1/wallet/me`, {
      headers: { Authorization: `Bearer ${provision.token}` },
    })
    if (!res.ok) {
      const body = await res.text()
      console.error(`[partner-balance] wallet/me error ${res.status}: ${body}`)
      return errResponse('provider_error', 'Failed to fetch balance', 502)
    }
    const body = await res.json() as { data: { balance: { total: number } } }
    balance = { credits: body.data.balance.total, accountId: '', currency: 'cr' }
  } else {
    // Fall back to partner API key
    const res = await fetch(
      `${CHAINABIT_API_URL}/partner/provisions/${provision.external_id}/balance`,
      { headers: { Authorization: `ApiKey ${CHAINABIT_PARTNER_API_KEY}` } },
    )
    if (!res.ok) {
      const body = await res.text()
      console.error(`[partner-balance] provisions balance error ${res.status}: ${body}`)
      return errResponse('provider_error', 'Failed to fetch balance', 502)
    }
    const data = await res.json() as { credits: number; account_id: string; currency: string }
    balance = { credits: data.credits, accountId: data.account_id, currency: data.currency }
  }

  return jsonResponse({ data: balance })
})
