// Supabase Edge Function: partner-send-claim
//
// POST /functions/v1/partner-send-claim
// Replaces: POST /v1/partners/chainabit/send-claim (platform-api)
//
// Sends a Chainabit claim email for the authenticated user's provision.
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

  const { data: provision } = await serviceClient
    .from('partner_provisions')
    .select('external_id')
    .eq('user_id', user.id)
    .eq('partner_name', 'chainabit')
    .maybeSingle<{ external_id: string }>()

  if (!provision?.external_id) {
    return errResponse('not_provisioned', 'No Chainabit provision found', 404)
  }

  const res = await fetch(
    `${CHAINABIT_API_URL}/partner/provisions/${provision.external_id}/send-claim`,
    {
      method: 'POST',
      headers: { Authorization: `ApiKey ${CHAINABIT_PARTNER_API_KEY}` },
    },
  )

  if (!res.ok) {
    const body = await res.text()
    console.error(`[partner-send-claim] error ${res.status}: ${body}`)
    return errResponse('provider_error', 'Failed to send claim email', 502)
  }

  return jsonResponse({ data: null }, 200)
})
