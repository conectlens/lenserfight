// Supabase Edge Function: partner-revoke
//
// POST /functions/v1/partner-revoke
// Replaces: POST /v1/partners/chainabit/revoke (platform-api)
//
// Revokes the Chainabit developer token and clears it from the DB.
// Requires secrets: CHAINABIT_API_URL

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { handleCors, jsonResponse, errResponse } from '../_shared/cors.ts'

const CHAINABIT_API_URL = Deno.env.get('CHAINABIT_API_URL') ?? 'https://api.chainabit.com'
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
    .select('token')
    .eq('user_id', user.id)
    .eq('partner_name', 'chainabit')
    .maybeSingle<{ token: string | null }>()

  // Nothing to revoke if no token
  if (provision?.token) {
    const res = await fetch(`${CHAINABIT_API_URL}/oauth/revoke`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${provision.token}`,
      },
      body: JSON.stringify({ token: provision.token }),
    })
    if (!res.ok) {
      const body = await res.text()
      console.error(`[partner-revoke] Chainabit revoke error ${res.status}: ${body}`)
      // Non-fatal: clear token from DB regardless
    }

    await serviceClient
      .from('partner_provisions')
      .update({ token: null, updated_at: new Date().toISOString() })
      .eq('user_id', user.id)
      .eq('partner_name', 'chainabit')
  }

  return jsonResponse({ data: null }, 200)
})
