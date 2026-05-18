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
const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth'

serve(async (req: Request) => {
  const url = new URL(req.url)
  if (url.pathname.endsWith('/start')) {
    return handleStart(req)
  }

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
    workspace_id?: string
    provider?: string
    capability: string
    label: string
    nonce: string
    signature?: string
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

  const validState = await verifyStatePayload(statePayload)
  if (!validState) {
    return new Response(
      JSON.stringify({ error: 'invalid_state_signature' }),
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
    p_workspace_id: statePayload.workspace_id,
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

async function handleStart(req: Request): Promise<Response> {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'method_not_allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const authHeader = req.headers.get('Authorization') ?? ''
  const jwt = authHeader.replace(/^Bearer\s+/i, '')
  if (!jwt) {
    return new Response(JSON.stringify({ error: 'missing_auth' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const body = await req.json().catch(() => null) as {
    provider?: string
    capability?: string
    label?: string
  } | null

  if (!body || body.provider !== 'google' || !body.capability) {
    return new Response(JSON.stringify({ error: 'invalid_start_request' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  )

  const { data: userData, error: userError } = await supabase.auth.getUser(jwt)
  if (userError || !userData.user) {
    return new Response(JSON.stringify({ error: 'invalid_auth' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const { data: profile, error: profileError } = await supabase
    .schema('lensers')
    .from('profiles')
    .select('id')
    .eq('user_id', userData.user.id)
    .single()

  if (profileError || !profile?.id) {
    return new Response(JSON.stringify({ error: 'profile_not_found' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const { data: workspace, error: workspaceError } = await supabase
    .schema('tenancy')
    .from('workspaces')
    .select('id')
    .eq('owner_lenser_id', profile.id)
    .eq('type', 'personal')
    .eq('status', 'active')
    .order('created_at', { ascending: true })
    .limit(1)
    .single()

  if (workspaceError || !workspace?.id) {
    return new Response(JSON.stringify({ error: 'workspace_not_found' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const payload = {
    lenser_id: profile.id as string,
    workspace_id: workspace.id as string,
    provider: 'google',
    capability: body.capability,
    label: sanitizeLabel(body.label ?? 'primary'),
    nonce: crypto.randomUUID(),
  }
  const signature = await signStatePayload(payload)
  const state = base64UrlEncode(JSON.stringify({ ...payload, signature }))

  const clientId = Deno.env.get('GOOGLE_OAUTH_CLIENT_ID') ?? ''
  const redirectUri = Deno.env.get('GOOGLE_OAUTH_REDIRECT_URI') ?? ''
  const scopes = scopesForGoogleCapability(body.capability)
  if (!clientId || !redirectUri || scopes.length === 0) {
    return new Response(JSON.stringify({ error: 'oauth_not_configured' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: scopes.join(' '),
    access_type: 'offline',
    prompt: 'consent',
    state,
  })

  return new Response(JSON.stringify({ authUrl: `${GOOGLE_AUTH_URL}?${params.toString()}` }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
}

function sanitizeLabel(label: string): string {
  return /^[a-z0-9][a-z0-9_-]{0,47}$/.test(label) ? label : 'primary'
}

function scopesForGoogleCapability(capability: string): string[] {
  switch (capability) {
    case 'gmail':
      return ['https://www.googleapis.com/auth/gmail.send', 'https://www.googleapis.com/auth/gmail.readonly']
    case 'drive':
      return ['https://www.googleapis.com/auth/drive.file']
    case 'sheets':
      return ['https://www.googleapis.com/auth/spreadsheets']
    case 'docs':
      return ['https://www.googleapis.com/auth/documents']
    case 'calendar':
      return ['https://www.googleapis.com/auth/calendar', 'https://www.googleapis.com/auth/calendar.events']
    default:
      return []
  }
}

async function verifyStatePayload(payload: Record<string, unknown>): Promise<boolean> {
  const signature = typeof payload['signature'] === 'string' ? payload['signature'] : ''
  if (!signature) return false
  const unsigned = { ...payload }
  delete unsigned['signature']
  return timingSafeEqual(signature, await signStatePayload(unsigned))
}

async function signStatePayload(payload: Record<string, unknown>): Promise<string> {
  const secret = Deno.env.get('OAUTH_STATE_SECRET') ?? ''
  if (!secret) throw new Error('OAUTH_STATE_SECRET is required')
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const signature = await crypto.subtle.sign(
    'HMAC',
    key,
    new TextEncoder().encode(JSON.stringify(payload)),
  )
  return base64UrlEncodeBytes(new Uint8Array(signature))
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i += 1) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  }
  return diff === 0
}

function base64UrlEncode(value: string): string {
  return btoa(value).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
}

function base64UrlEncodeBytes(value: Uint8Array): string {
  let binary = ''
  for (const byte of value) binary += String.fromCharCode(byte)
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
}
