// Supabase Edge Function: chainabit-oauth-callback
//
// GET /functions/v1/chainabit-oauth-callback?code=...&state=...
// Replaces: GET /v1/partners/chainabit/oauth/callback (platform-api)
//
// Handles both OAuth flows:
//   'login'   — Chainabit social sign-in: exchanges code → fetches userinfo → generates Supabase magic link
//   'connect' — Wallet link for authenticated user: exchanges code → upserts partner_provisions
//
// PKCE code_verifier is embedded in the base64url-encoded state — no client_secret required.
// Requires secrets: CHAINABIT_API_URL, CHAINABIT_CLIENT_ID, CHAINABIT_OAUTH_REDIRECT_URI

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const CHAINABIT_API_URL = Deno.env.get('CHAINABIT_API_URL') ?? 'https://api.chainabit.com'
const CHAINABIT_CLIENT_ID = Deno.env.get('CHAINABIT_CLIENT_ID') ?? ''
const CHAINABIT_OAUTH_REDIRECT_URI = Deno.env.get('CHAINABIT_OAUTH_REDIRECT_URI') ?? ''
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? ''
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
// Auth app callback — Supabase magic link must redirect here so the browser
// lands via a user-initiated navigation (not a cross-origin 302 chain), which
// prevents browsers from sending Origin: null on subsequent API calls.
const AUTH_CALLBACK_URL = Deno.env.get('AUTH_CALLBACK_URL') ?? 'https://auth.lenserfight.com/callback'

interface ChainabitOAuthState {
  flowType: 'login' | 'connect'
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

interface ChainabitUserInfo {
  sub: string
  email?: string
  name?: string
  preferred_username?: string
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

async function getUserInfo(accessToken: string): Promise<ChainabitUserInfo | null> {
  const res = await fetch(`${CHAINABIT_API_URL}/oauth/userinfo`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  if (!res.ok) return null
  return res.json() as Promise<ChainabitUserInfo>
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

  const tokens = await exchangeCode(code, state.codeVerifier)
  if (!tokens) return errorRedirect('token_exchange_failed', state.returnUrl)

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  })

  if (state.flowType === 'connect') {
    if (!state.userId) return errorRedirect('missing_user', state.returnUrl)

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

    return redirect(`${state.returnUrl}?chainabit_connected=true`)
  }

  // flowType === 'login': resolve Chainabit identity → Supabase user → session magic link
  const userInfo = await getUserInfo(tokens.access_token)
  if (!userInfo?.email) return errorRedirect('userinfo_failed', state.returnUrl)

  // redirectTo must point to auth.lenserfight.com/callback, not the final returnUrl
  // directly. A magic-link chain: supabase/auth/v1/verify → direct-to-app produces
  // 3+ cross-origin 302 hops, causing browsers to send Origin: null on all subsequent
  // fetches from the landing page. Routing through the auth callback breaks the chain.
  const authCallbackWithReturn = `${AUTH_CALLBACK_URL}?return_url=${encodeURIComponent(state.returnUrl)}`
  const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
    type: 'magiclink',
    email: userInfo.email,
    options: {
      redirectTo: authCallbackWithReturn,
      data: {
        display_name: userInfo.name ?? userInfo.preferred_username ?? userInfo.email,
        chainabit_id: userInfo.sub,
      },
    },
  })

  if (linkError || !linkData?.properties?.action_link) {
    return errorRedirect('session_failed', state.returnUrl)
  }

  // Wallet access (partner_provisions) is not provisioned automatically on login.
  // Users connect their Chainabit wallet explicitly from Settings → Partner Accounts.
  return redirect(linkData.properties.action_link)
})
