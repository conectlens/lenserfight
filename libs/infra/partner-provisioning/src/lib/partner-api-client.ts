import { supabase, getCachedAccessToken, getCachedSession } from '@lenserfight/data/supabase'
import { apiFetch, unwrapEnvelope } from '@lenserfight/data/repositories/apiFetch'
import { AUTH_BASE_URL, readEnv } from '@lenserfight/utils/env'
import type { ChainabitAiModel, ProviderBalance } from './partner-provider.interface'

// All connector calls go through Supabase Edge Functions.
const SUPABASE_URL = readEnv('SUPABASE_URL', 'http://localhost:54321')
const EDGE_BASE = `${SUPABASE_URL}/functions/v1`

async function getAuthHeader(): Promise<Record<string, string>> {
  // getCachedAccessToken() is a synchronous in-memory read (no I/O).
  // getSession() fallback reads from local storage only — no server round-trip.
  // If the token was revoked server-side, the Edge Function will return 401;
  // callers should detect that and trigger supabase.auth.signOut().
  const token =
    getCachedAccessToken() ?? (await supabase.auth.getSession()).data.session?.access_token
  if (!token) throw new Error('401: Unauthenticated')
  return { Authorization: `Bearer ${token}` }
}

export const CHAINABIT_OAUTH_PROVIDER = 'custom:chainabit'

type SessionUserWithProviders = {
  app_metadata?: { provider?: string; providers?: string[] }
  identities?: { provider: string }[]
}

/** True when the Supabase user carries a linked custom:chainabit identity. */
export function userHasChainabitIdentity(user: SessionUserWithProviders | null | undefined): boolean {
  if (!user) return false
  const meta = user.app_metadata ?? {}
  if (
    meta.provider === CHAINABIT_OAUTH_PROVIDER ||
    (Array.isArray(meta.providers) && meta.providers.includes(CHAINABIT_OAUTH_PROVIDER))
  ) {
    return true
  }
  return (
    Array.isArray(user.identities) &&
    user.identities.some((identity) => identity.provider === CHAINABIT_OAUTH_PROVIDER)
  )
}

/**
 * Checks whether the current user has a Chainabit account linked via OAuth.
 * Reads app_metadata and identities from the session cache — no network call.
 *
 * TIMING NOTE: on the OAuth callback page, call `await waitForSessionReady()`
 * before this function to avoid a false `false` before INITIAL_SESSION fires.
 */
export function isChainabitConnected(): boolean {
  const session = getCachedSession()
  return userHasChainabitIdentity(session?.user as SessionUserWithProviders | undefined)
}

/** Reads OAuth error_code from the current URL hash or query string. */
export function parseOAuthErrorCodeFromLocation(
  location: Pick<Location, 'search' | 'hash'> = window.location
): string | null {
  for (const raw of [location.hash.slice(1), location.search.slice(1)]) {
    if (!raw) continue
    try {
      const code = new URLSearchParams(raw).get('error_code')
      if (code) return code
    } catch {
      // ignore malformed fragments
    }
  }
  return null
}

/** Removes Supabase OAuth error params from the address bar without navigation. */
export function stripOAuthErrorParamsFromLocation(
  location: Location = window.location
): void {
  const url = new URL(location.href)
  for (const key of ['error', 'error_code', 'error_description']) {
    url.searchParams.delete(key)
  }
  const next = `${url.pathname}${url.search}${url.hash}`
  window.history.replaceState(window.history.state, '', next)
}

function extractErrorCode(err: unknown): string | undefined {
  if (err && typeof err === 'object') {
    const e = err as Record<string, unknown>
    const ef = e['error']
    if (ef && typeof ef === 'object') return (ef as Record<string, unknown>)['code'] as string
    return e['code'] as string | undefined
  }
  return undefined
}

export const connectorApiClient = {
  /**
   * Fetches the user's Chainabit wallet balance.
   * Token is resolved server-side from auth.identities — not passed by the client.
   *
   * If the edge function returns `token_expired` (Chainabit API returned 401),
   * attempts one session refresh so Supabase can write a fresh provider token
   * into auth.identities, then retries.  If still expired, throws so the caller
   * can surface the "Reconnect" UI.
   */
  async getBalance(): Promise<ProviderBalance> {
    const authHeader = await getAuthHeader()
    try {
      const res = await apiFetch(`${EDGE_BASE}/chainabit-wallet`, { headers: { ...authHeader } })
      return unwrapEnvelope<ProviderBalance>(res)
    } catch (err: unknown) {
      if (extractErrorCode(err) === 'token_expired') {
        await supabase.auth.refreshSession()
        const retryHeader = await getAuthHeader()
        const res = await apiFetch(`${EDGE_BASE}/chainabit-wallet`, { headers: { ...retryHeader } })
        return unwrapEnvelope<ProviderBalance>(res)
      }
      throw err
    }
  },

  /**
   * Fetches available Chainabit AI models.
   */
  async getAiModels(): Promise<ChainabitAiModel[]> {
    const authHeader = await getAuthHeader()
    const res = await apiFetch(`${EDGE_BASE}/chainabit-models`, {
      headers: { ...authHeader },
    })
    return unwrapEnvelope<ChainabitAiModel[]>(res)
  },

  /**
   * Initiates Chainabit OAuth via Supabase linkIdentity.
   * Supabase handles PKCE, token exchange, and storage in auth.identities.
   */
  async connect(returnUrl: string = window.location.href): Promise<void> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase.auth as any).linkIdentity({
      provider: 'custom:chainabit',
      options: {
        // provider=chainabit marker lets OAuthCallbackPage detect this flow and
        // store session.provider_refresh_token into identity_data via
        // fn_store_my_chainabit_tokens so server-side refresh works later.
        redirectTo: `${AUTH_BASE_URL}/callback?provider=chainabit&return_url=${encodeURIComponent(returnUrl)}`,
      },
    })
    if (error) throw error
    if (data?.url) {
      window.location.href = data.url
      return
    }
    throw new Error(
      'Chainabit OAuth flow did not return a redirect URL — the identity may already be linked'
    )
  },

  /**
   * Unlinks the Chainabit identity from the current user's account.
   */
  async disconnect(): Promise<void> {
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()
    if (userError || !user) throw userError ?? new Error('Unauthenticated')
    const identity = user.identities?.find((i) => i.provider === 'custom:chainabit')
    if (!identity) return
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase.auth as any).unlinkIdentity(identity)
    if (error) throw error
  },
}

// Back-compat aliases: existing code that imports `partnerApiClient` continues to
// compile.  Migrate call sites to `connectorApiClient` over time.
/** @deprecated Use connectorApiClient.getBalance() */
export const partnerApiClient = {
  getBalance: (_partnerName: string) => connectorApiClient.getBalance(),
  getAiModels: (_partnerName: string) => connectorApiClient.getAiModels(),
  startOAuthConnect: (returnUrl?: string) =>
    returnUrl !== undefined ? connectorApiClient.connect(returnUrl) : connectorApiClient.connect(),
  revokeToken: (_partnerName: string) => connectorApiClient.disconnect(),
  /** @deprecated provisioning removed */
  provision: (_partnerName: string): Promise<never> => Promise.reject(new Error('provisioning removed')),
  /** @deprecated provisioning removed */
  refreshToken: (_partnerName: string): Promise<never> => Promise.reject(new Error('provisioning removed')),
  /** @deprecated provisioning removed */
  sendClaimEmail: (_partnerName: string): Promise<void> => Promise.reject(new Error('provisioning removed')),
}

/** @deprecated No longer used — provisioning removed */
export type PartnerProvisionRecord = never
/** @deprecated No longer used — provisioning removed */
export type ChainabitOAuthState = never
