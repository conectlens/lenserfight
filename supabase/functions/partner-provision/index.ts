// Supabase Edge Function: partner-provision
//
// POST /functions/v1/partner-provision
// Replaces: POST /v1/partners/chainabit/provision (platform-api)
//
// Creates or retrieves the Chainabit provision record for the authenticated user.
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

  if (req.method !== 'POST') {
    return errResponse('method_not_allowed', 'POST required', 405)
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

  // Return cached provision if it exists
  const { data: existing } = await serviceClient
    .from('partner_provisions')
    .select('external_id, account_id, token_scopes, starter_credits')
    .eq('user_id', user.id)
    .eq('partner_name', 'chainabit')
    .maybeSingle()

  if (existing) {
    return jsonResponse({
      data: {
        partnerName: 'chainabit',
        displayName: 'Chainabit',
        accountId: existing.account_id,
        tokenScopes: existing.token_scopes,
        starterCredits: existing.starter_credits,
      },
    })
  }

  // Provision new account with Chainabit
  const res = await fetch(`${CHAINABIT_API_URL}/partner/provisions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `ApiKey ${CHAINABIT_PARTNER_API_KEY}`,
    },
    body: JSON.stringify({
      email: user.email,
      display_name: (user.user_metadata?.['display_name'] as string | undefined) ?? user.email,
      source_user_id: user.id,
      starter_credits: 100,
      token_scopes: ['execution:run', 'wallet:read'],
    }),
  })

  if (!res.ok) {
    const body = await res.text()
    console.error(`[partner-provision] Chainabit error ${res.status}: ${body}`)
    return errResponse('provider_error', 'Failed to provision Chainabit account', 502)
  }

  const provision = await res.json() as {
    provision_id: string
    account_id: string
    developer_token: string | null
    token_scopes: string[]
    starter_credits_granted: number
  }

  await serviceClient.from('partner_provisions').upsert(
    {
      user_id: user.id,
      partner_name: 'chainabit',
      external_id: provision.provision_id,
      account_id: provision.account_id,
      token: provision.developer_token,
      token_scopes: provision.token_scopes,
      starter_credits: provision.starter_credits_granted,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id,partner_name' },
  )

  return jsonResponse({
    data: {
      partnerName: 'chainabit',
      displayName: 'Chainabit',
      accountId: provision.account_id,
      tokenScopes: provision.token_scopes,
      starterCredits: provision.starter_credits_granted,
    },
  })
})
