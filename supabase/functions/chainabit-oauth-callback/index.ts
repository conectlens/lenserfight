// Supabase Edge Function: chainabit-oauth-callback
//
// GET /functions/v1/chainabit-oauth-callback?code=...&state=...
//
// Handles the wallet-link OAuth flow for already-authenticated users:
//   'connect' — exchanges authorization code → upserts partner_provisions with access_token
//
// Sign-in (login/register) is handled by Supabase Auth using the custom:chainabit provider.
// This function only processes the connect flow initiated by startOAuthConnect().
//
// PKCE code_verifier is embedded in the base64url-encoded state — no client_secret required.
// Requires secrets: CHAINABIT_API_URL, CHAINABIT_CLIENT_ID, CHAINABIT_OAUTH_REDIRECT_URI

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const CHAINABIT_API_URL = Deno.env.get('CHAINABIT_API_URL') ?? 'https://api.chainabit.com'
const CHAINABIT_CLIENT_ID = Deno.env.get('CHAINABIT_CLIENT_ID') ?? ''
const CHAINABIT_OAUTH_REDIRECT_URI = Deno.env.get('CHAINABIT_OAUTH_REDIRECT_URI') ?? ''
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? ''
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
// APP_URL is the canonical web app origin used for return-URL allow-listing.
const APP_URL = Deno.env.get('APP_URL') ?? 'https://lenserfight.com'
const AUTH_APP_URL = Deno.env.get('AUTH_APP_URL') ?? 'https://auth.lenserfight.com'

/** Prevent open-redirect: returnUrl must share origin with APP_URL or AUTH_APP_URL. */
function isAllowedReturnUrl(url: string): boolean {
  try {
    const target = new URL(url)
    const allowed = [new URL(APP_URL).origin, new URL(AUTH_APP_URL).origin]
    return allowed.includes(target.origin)
  } catch {
    return false
  }
}

interface ChainabitOAuthState {
  flowType: 'connect'
  userId?: string
  codeVerifier: string
  returnUrl: string
  nonce: string
}

interface ChainabitTokenResponse {
  access_token: string
  refresh_token?: string
  expires_in?: number
}

function decodeOAuthState(raw: string): ChainabitOAuthState | null {
  try {
    const padded = raw
      .replace(/-/g, '+')
      .replace(/_/g, '/')
      .padEnd(raw.length + ((4 - (raw.length % 4)) % 4), '=')
    return JSON.parse(atob(padded)) as ChainabitOAuthState
  } catch {
    return null
  }
}

async function exchangeCode(code: string, codeVerifier: string): Promise<ChainabitTokenResponse | null> {
  const res = await fetch(`${CHAINABIT_API_URL}/oauth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: CHAINABIT_CLIENT_ID,
      code,
      redirect_uri: CHAINABIT_OAUTH_REDIRECT_URI,
      code_verifier: codeVerifier,
    }).toString(),
  })
  if (!res.ok) return null
  return res.json() as Promise<ChainabitTokenResponse>
}

function redirect(url: string): Response {
  return new Response(null, { status: 302, headers: { Location: url } })
}

Deno.serve(async (req: Request) => {
  const url = new URL(req.url)
  const code = url.searchParams.get('code')
  const stateParam = url.searchParams.get('state')
  const oauthError = url.searchParams.get('error')

  const errorRedirect = (reason: string, returnUrl = '/') =>
    redirect(`${returnUrl}?chainabit_error=${encodeURIComponent(reason)}`)

  if (oauthError || !code || !stateParam) {
    return errorRedirect(oauthError ?? 'missing_params')
  }

  const state = decodeOAuthState(stateParam)
  if (!state) return errorRedirect('invalid_state')

  // Validate returnUrl origin before using it in any redirect to prevent open-redirect.
  const safeReturnUrl = isAllowedReturnUrl(state.returnUrl) ? state.returnUrl : APP_URL

  // Guard: this callback only handles the wallet-connect flow.
  // Sign-in is handled by Supabase Auth (custom:chainabit provider).
  if (state.flowType !== 'connect') {
    return errorRedirect('unsupported_flow', safeReturnUrl)
  }

  if (!state.userId) return errorRedirect('missing_user', safeReturnUrl)

  const tokens = await exchangeCode(code, state.codeVerifier)
  if (!tokens) return errorRedirect('token_exchange_failed', safeReturnUrl)

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  })

  await supabase.from('partner_provisions').upsert(
    {
      user_id: state.userId,
      partner_name: 'chainabit',
      token: tokens.access_token,
      token_scopes: ['wallet:read', 'execution:run'],
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id,partner_name' },
  )

  return redirect(`${safeReturnUrl}?chainabit_connected=true`)
})
