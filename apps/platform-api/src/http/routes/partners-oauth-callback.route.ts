import type { IncomingMessage, ServerResponse } from 'node:http'
import {
  CHAINABIT_API_URL,
  CHAINABIT_CLIENT_ID,
  CHAINABIT_OAUTH_REDIRECT_URI,
} from '@lenserfight/utils/env'
import { createServiceSupabaseClient } from '../../lib/supabase'
import type { ChainabitOAuthState } from '@lenserfight/infra/partner-provisioning'

function decodeOAuthState(raw: string): ChainabitOAuthState | null {
  try {
    const padded = raw.replace(/-/g, '+').replace(/_/g, '/').padEnd(
      raw.length + ((4 - (raw.length % 4)) % 4),
      '=',
    )
    return JSON.parse(atob(padded)) as ChainabitOAuthState
  } catch {
    return null
  }
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

// Public client (PKCE) — code_verifier is in the state, no client_secret required
async function exchangeCode(code: string, codeVerifier: string): Promise<ChainabitTokenResponse | null> {
  const res = await fetch(`${CHAINABIT_API_URL()}/oauth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: CHAINABIT_CLIENT_ID(),
      code,
      redirect_uri: CHAINABIT_OAUTH_REDIRECT_URI(),
      code_verifier: codeVerifier,
    }).toString(),
  })
  if (!res.ok) return null
  return res.json() as Promise<ChainabitTokenResponse>
}

async function getUserInfo(accessToken: string): Promise<ChainabitUserInfo | null> {
  const res = await fetch(`${CHAINABIT_API_URL()}/oauth/userinfo`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  if (!res.ok) return null
  return res.json() as Promise<ChainabitUserInfo>
}

/**
 * GET /v1/partners/chainabit/oauth/callback
 * Handles both 'connect' (wallet link for authenticated user) and 'login' (social sign-in).
 * Chainabit is the OAuth provider; this is the partner callback that completes the flow.
 * PKCE code_verifier was generated on the frontend and embedded in the state — no secret needed.
 */
export async function handlePartnersOAuthCallbackRoute(
  req: IncomingMessage,
  res: ServerResponse,
): Promise<void> {
  const url = new URL(req.url!, 'http://localhost')
  const code = url.searchParams.get('code')
  const stateParam = url.searchParams.get('state')
  const oauthError = url.searchParams.get('error')

  const errorRedirect = (reason: string, returnUrl = '/') => {
    res.writeHead(302, { Location: `${returnUrl}?chainabit_error=${encodeURIComponent(reason)}` })
    res.end()
  }

  if (oauthError || !code || !stateParam) {
    errorRedirect(oauthError ?? 'missing_params')
    return
  }

  const state = decodeOAuthState(stateParam)
  if (!state) {
    errorRedirect('invalid_state')
    return
  }

  const tokens = await exchangeCode(code, state.codeVerifier)
  if (!tokens) {
    errorRedirect('token_exchange_failed', state.returnUrl)
    return
  }

  const supabase = createServiceSupabaseClient()

  if (state.flowType === 'connect') {
    if (!state.userId) {
      errorRedirect('missing_user', state.returnUrl)
      return
    }
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
    res.writeHead(302, { Location: `${state.returnUrl}?chainabit_connected=true` })
    res.end()
    return
  }

  // flowType === 'login': resolve Chainabit identity → Supabase user → session magic link
  const userInfo = await getUserInfo(tokens.access_token)
  if (!userInfo?.email) {
    errorRedirect('userinfo_failed', state.returnUrl)
    return
  }

  const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
    type: 'magiclink',
    email: userInfo.email,
    options: {
      redirectTo: state.returnUrl,
      data: {
        display_name: userInfo.name ?? userInfo.preferred_username ?? userInfo.email,
        chainabit_id: userInfo.sub,
      },
    },
  })

  if (linkError || !linkData?.properties?.action_link) {
    errorRedirect('session_failed', state.returnUrl)
    return
  }

  const userId = linkData.user?.id
  if (userId) {
    await supabase.from('partner_provisions').upsert(
      {
        user_id: userId,
        partner_name: 'chainabit',
        token: tokens.access_token,
        token_scopes: ['email:read', 'profile:read', 'wallet:read', 'execution:run'],
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,partner_name' },
    )
  }

  // Supabase's magic link redirects to returnUrl with session tokens in fragment
  res.writeHead(302, { Location: linkData.properties.action_link })
  res.end()
}
