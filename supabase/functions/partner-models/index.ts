// Supabase Edge Function: partner-models
//
// GET /functions/v1/partner-models
// Replaces: GET /v1/partners/chainabit/models (platform-api)
//
// Lists available AI models from Chainabit using the user's developer token.
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
    .select('token')
    .eq('user_id', user.id)
    .eq('partner_name', 'chainabit')
    .maybeSingle<{ token: string | null }>()

  if (!provision?.token) {
    return errResponse('not_provisioned', 'No Chainabit developer token found', 404)
  }

  const res = await fetch(`${CHAINABIT_API_URL}/api/v1/ai/models?isActive=true`, {
    headers: { Authorization: `Bearer ${provision.token}` },
  })

  if (!res.ok) {
    const body = await res.text()
    console.error(`[partner-models] error ${res.status}: ${body}`)
    return errResponse('provider_error', 'Failed to fetch AI models', 502)
  }

  const body = await res.json() as { data: unknown[] }
  return jsonResponse({ data: body.data })
})
