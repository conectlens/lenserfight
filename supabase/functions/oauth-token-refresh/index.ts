/**
 * Edge Function: oauth-token-refresh
 *
 * Called by execution workers (via fn_invoke_edge or direct HTTP) when an
 * OAuth access token is within 5 minutes of expiry. Exchanges the refresh
 * token with the provider and stores the new access token via
 * fn_oauth_upsert_connection (service_role).
 *
 * This function is NOT user-callable. It is invoked exclusively from the
 * server-side createOAuthConnectionResolver (service_role context).
 *
 * Security notes:
 *  - refresh_token is passed in the request body (never in URL/headers)
 *  - no tokens are logged
 *  - if refresh fails, the function returns a non-fatal error; the execution
 *    worker proceeds with the current (possibly expired) access token
 *
 * Required env vars:
 *   GOOGLE_OAUTH_CLIENT_ID
 *   GOOGLE_OAUTH_CLIENT_SECRET
 *   SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { serve } from 'https://deno.land/std@0.208.0/http/server.ts'

serve(async (req: Request) => {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'method_not_allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  let body: {
    lenser_id: string
    ref: string
    refresh_token: string
    provider: string
  }

  try {
    body = await req.json()
  } catch {
    return new Response(JSON.stringify({ error: 'invalid_json' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const { lenser_id, ref, refresh_token, provider } = body

  if (!lenser_id || !ref || !refresh_token || !provider) {
    return new Response(JSON.stringify({ error: 'missing_fields' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  if (provider !== 'google') {
    return new Response(
      JSON.stringify({ error: 'unsupported_provider', provider }),
      { status: 400, headers: { 'Content-Type': 'application/json' } },
    )
  }

  // Exchange refresh token for new access token
  const clientId = Deno.env.get('GOOGLE_OAUTH_CLIENT_ID') ?? ''
  const clientSecret = Deno.env.get('GOOGLE_OAUTH_CLIENT_SECRET') ?? ''

  let tokenRes: Response
  try {
    tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token,
        grant_type: 'refresh_token',
      }).toString(),
    })
  } catch (err) {
    console.error('[oauth-token-refresh] network error during token refresh:', err)
    return new Response(JSON.stringify({ ok: false, error: 'network_error' }), {
      status: 502,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  if (!tokenRes.ok) {
    const detail = await tokenRes.text()
    console.error('[oauth-token-refresh] Google token refresh failed:', tokenRes.status, detail)
    return new Response(
      JSON.stringify({ ok: false, error: 'refresh_failed', status: tokenRes.status }),
      { status: 502, headers: { 'Content-Type': 'application/json' } },
    )
  }

  const refreshed = await tokenRes.json() as {
    access_token: string
    expires_in: number
    scope?: string
  }

  const expiresAt = new Date(Date.now() + refreshed.expires_in * 1000).toISOString()
  const grantedScopes = refreshed.scope ? refreshed.scope.split(' ').filter(Boolean) : []

  // Extract capability and label from ref (e.g. 'google.gmail.primary')
  const parts = ref.split('.')
  const capability = parts[1] ?? ''
  const label = parts.slice(2).join('.')

  if (!capability || !label) {
    return new Response(
      JSON.stringify({ ok: false, error: 'invalid_ref', ref }),
      { status: 400, headers: { 'Content-Type': 'application/json' } },
    )
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  )

  const { error: upsertError } = await supabase.rpc('fn_oauth_upsert_connection', {
    p_lenser_id: lenser_id,
    p_provider: provider,
    p_capability: capability,
    p_label: label,
    p_access_token: refreshed.access_token,
    p_refresh_token: null,           // refresh_token unchanged; preserved by upsert COALESCE
    p_granted_scopes: grantedScopes.length > 0 ? grantedScopes : [],
    p_expires_at: expiresAt,
  })

  if (upsertError) {
    console.error('[oauth-token-refresh] fn_oauth_upsert_connection failed:', upsertError.message)
    return new Response(
      JSON.stringify({ ok: false, error: 'store_failed' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    )
  }

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
})
