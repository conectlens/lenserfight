import { supabase } from '@lenserfight/data/supabase'
import { apiFetch, unwrapEnvelope } from '@lenserfight/data/repositories'
import { AUTH_BASE_URL } from '@lenserfight/utils/env'
import type { ChainabitAiModel, ProviderBalance } from './partner-provider.interface'

// All connector calls go through Supabase Edge Functions.
const SUPABASE_URL = (import.meta.env['SUPABASE_URL'] as string | undefined) ?? 'http://localhost:54321'
const EDGE_BASE = `${SUPABASE_URL}/functions/v1`

async function getAuthHeader(): Promise<Record<string, string>> {
  const { data } = await supabase.auth.getSession()
  if (!data.session?.access_token) throw new Error('401: Unauthenticated')
  return { Authorization: `Bearer ${data.session.access_token}` }
}

/**
 * Checks whether the current user has a Chainabit account linked via OAuth.
 * Reads the provider list from the in-memory Supabase session — no extra network call.
 */
export function isChainabitConnected(): boolean {
  // currentSession is a getter on SupabaseClient in supabase-js v2
  const session = (supabase.auth as unknown as { currentSession: { user?: { app_metadata?: { provider?: string; providers?: string[] } } } | null }).currentSession
  if (!session?.user) return false
  const meta = session.user.app_metadata ?? {}
  return (
    meta.provider === 'keycloak' ||
    (Array.isArray(meta.providers) && meta.providers.includes('keycloak'))
  )
}

export const connectorApiClient = {
  /**
   * Fetches the user's Chainabit wallet balance.
   * Token is resolved server-side from auth.identities — not passed by the client.
   */
  async getBalance(): Promise<ProviderBalance> {
    const authHeader = await getAuthHeader()
    const res = await apiFetch(`${EDGE_BASE}/chainabit-wallet`, {
      headers: { ...authHeader },
    })
    return unwrapEnvelope<ProviderBalance>(res)
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
      provider: 'keycloak',
      options: {
        redirectTo: `${AUTH_BASE_URL}/callback?return_url=${encodeURIComponent(returnUrl)}`,
      },
    })
    if (error) throw error
    if (data?.url) {
      window.location.href = data.url
    }
  },

  /**
   * Unlinks the Chainabit identity from the current user's account.
   */
  async disconnect(): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser()
    const identity = user?.identities?.find((i) => i.provider === 'keycloak')
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
  startOAuthConnect: (returnUrl: string) => connectorApiClient.connect(returnUrl),
}

/** @deprecated No longer used — provisioning removed */
export type PartnerProvisionRecord = never
/** @deprecated No longer used — provisioning removed */
export type ChainabitOAuthState = never
