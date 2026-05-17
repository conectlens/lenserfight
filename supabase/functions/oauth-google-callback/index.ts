/**
 * Edge Function: oauth-google-callback
 *
 * Receives Google OAuth 2.0 authorization code, exchanges it for tokens,
 * and stores them via fn_oauth_upsert_connection (service_role).
 * Redirects the user back to /settings/connections with a success indicator.
 *
 * Security notes:
 *  - client_secret never sent to the browser
 *  - tokens stored only via fn_oauth_upsert_connection (service_role Vault write)
 *  - no tokens logged at any point
 *  - state payload is decoded but NOT verified via HMAC here (nonce + server-
 *    side short-lived store is the correct defense; for Phase 1 the nonce is
 *    included in state but full CSRF verification is a Phase 2 hardening item)
 *
 * Required env vars (set in Supabase project settings → Functions → Secrets):
 *   GOOGLE_OAUTH_CLIENT_ID
 *   GOOGLE_OAUTH_CLIENT_SECRET
 *   GOOGLE_OAUTH_REDIRECT_URI   — must match the authorized redirect URI in GCP
 *   SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *   WEB_BASE_URL                — e.g. https://lenserfight.com
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { serve } from 'https://deno.land/std@0.208.0/http/server.ts'

const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token'

serve(async (req: Request) => {
  const url = new URL(req.url)
  const code = url.searchParams.get('code')
  const state = url.searchParams.get('state')
  const errorParam = url.searchParams.get('error')

  // Google sends error=access_denied when user cancels the consent screen
  if (errorParam) {
    const webBase = Deno.env.get('WEB_BASE_URL') ?? ''
    return Response.redirect(`${webBase}/settings/connections?error=${encodeURIComponent(errorParam)}`, 302)
  }

  if (!code || !state) {
    return new Response(
      JSON.stringify({ error: 'missing_params', detail: 'code and state are required' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } },
    )
  }

  // Decode state payload: base64url({ lenser_id, capability, label, nonce })
  let statePayload: {
    lenser_id: string
    capability: string
    label: string
    nonce: string
  }

  try {
    const decoded = atob(state.replace(/-/g, '+').replace(/_/g, '/'))
    statePayload = JSON.parse(decoded)
  } catch {
    return new Response(
      JSON.stringify({ error: 'invalid_state', detail: 'state payload could not be decoded' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } },
    )
  }

  if (!statePayload.lenser_id || !statePayload.capability || !statePayload.label) {
    return new Response(
      JSON.stringify({ error: 'invalid_state', detail: 'state payload missing required fields' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } },
    )
  }

  const clientId = Deno.env.get('GOOGLE_OAUTH_CLIENT_ID') ?? ''
  const clientSecret = Deno.env.get('GOOGLE_OAUTH_CLIENT_SECRET') ?? ''
  const redirectUri = Deno.env.get('GOOGLE_OAUTH_REDIRECT_URI') ?? ''
  const webBase = Deno.env.get('WEB_BASE_URL') ?? ''

  // Exchange authorization code for tokens
  let tokenRes: Response
  try {
    tokenRes = await fetch(GOOGLE_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }).toString(),
    })
  } catch (err) {
    console.error('[oauth-google-callback] token exchange network error:', err)
    return new Response(
      JSON.stringify({ error: 'token_exchange_network_error' }),
      { status: 502, headers: { 'Content-Type': 'application/json' } },
    )
  }

  if (!tokenRes.ok) {
    const body = await tokenRes.text()
    console.error('[oauth-google-callback] token exchange failed:', tokenRes.status, body)
    return new Response(
      JSON.stringify({ error: 'token_exchange_failed', status: tokenRes.status }),
      { status: 502, headers: { 'Content-Type': 'application/json' } },
    )
  }

  const tokens = await tokenRes.json() as {
    access_token: string
    refresh_token?: string
    expires_in: number
    scope: string
    token_type: string
  }

  const expiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString()
  const grantedScopes = tokens.scope.split(' ').filter(Boolean)

  // Store tokens via service_role RPC (never log the tokens)
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  )

  const { error: upsertError } = await supabase.rpc('fn_oauth_upsert_connection', {
    p_lenser_id: statePayload.lenser_id,
    p_provider: 'google',
    p_capability: statePayload.capability,
    p_label: statePayload.label,
    p_access_token: tokens.access_token,
    p_refresh_token: tokens.refresh_token ?? null,
    p_granted_scopes: grantedScopes,
    p_expires_at: expiresAt,
  })

  if (upsertError) {
    console.error('[oauth-google-callback] fn_oauth_upsert_connection failed:', upsertError.message)
    return new Response(
      JSON.stringify({ error: 'store_failed', detail: upsertError.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    )
  }

  // Redirect back to settings/connections with success indicator
  const successUrl = new URL('/settings/connections', webBase)
  successUrl.searchParams.set('connected', statePayload.capability)

  return Response.redirect(successUrl.toString(), 302)
})
