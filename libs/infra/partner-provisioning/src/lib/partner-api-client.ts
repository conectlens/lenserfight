import { supabase } from '@lenserfight/data/supabase'
import { apiFetch, unwrapEnvelope } from '@lenserfight/data/repositories'
import { CHAINABIT_OAUTH_URL, CHAINABIT_OAUTH_CLIENT_ID, CHAINABIT_OAUTH_CALLBACK_URL } from '@lenserfight/utils/env'
import type { ChainabitAiModel, PartnerBalance, PartnerProvision, PartnerTokenRefreshResult } from './partner-provider.interface'

// Partner provisioning calls go to Supabase Edge Functions (no platform-api needed).
const SUPABASE_URL = (import.meta.env['SUPABASE_URL'] as string | undefined) ?? 'http://localhost:54321'
const EDGE_BASE = `${SUPABASE_URL}/functions/v1`

async function getAuthHeader(): Promise<Record<string, string>> {
  const { data } = await supabase.auth.getSession()
  if (!data.session?.access_token) throw new Error('401: Unauthenticated')
  return { Authorization: `Bearer ${data.session.access_token}` }
}

export interface PartnerProvisionRecord {
  partnerName: string
  displayName: string
  accountId: string | null
  tokenScopes: string[]
  starterCredits: number
}

// ── PKCE helpers (Web Crypto, browser-side) ───────────────────────────────────

function generateCodeVerifier(): string {
  const bytes = new Uint8Array(32)
  crypto.getRandomValues(bytes)
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '')
}

async function deriveCodeChallenge(verifier: string): Promise<string> {
  if (!crypto.subtle) {
    throw new Error(
      'Chainabit OAuth requires a secure context (HTTPS). This page must be served over HTTPS to use Chainabit sign-in.',
    )
  }
  const encoded = new TextEncoder().encode(verifier)
  const digest = await crypto.subtle.digest('SHA-256', encoded)
  return btoa(String.fromCharCode(...new Uint8Array(digest)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '')
}

export interface ChainabitOAuthState {
  flowType: 'login' | 'connect'
  userId?: string
  codeVerifier: string
  returnUrl: string
  nonce: string
}

export function encodeOAuthState(state: ChainabitOAuthState): string {
  return btoa(JSON.stringify(state))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '')
}

// ─────────────────────────────────────────────────────────────────────────────

// Module-level dedupe for partner-provision: collapses StrictMode double-effects,
// remounts, and concurrent callers into a single network call per (user, partner).
// Keyed by access-token tail so a session change naturally invalidates.
const provisionInFlight = new Map<string, Promise<PartnerProvisionRecord>>()

function provisionKey(token: string, partnerName: string): string {
  return `${partnerName}:${token.slice(-24)}`
}

export const partnerApiClient = {
  async provision(partnerName: string): Promise<PartnerProvisionRecord> {
    const { data } = await supabase.auth.getSession()
    const token = data.session?.access_token
    if (!token) throw new Error('401: Unauthenticated')

    const key = provisionKey(token, partnerName)
    const existing = provisionInFlight.get(key)
    if (existing) return existing

    const promise = (async () => {
      const res = await apiFetch(`${EDGE_BASE}/partner-provision`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      })
      return unwrapEnvelope<PartnerProvisionRecord>(res)
    })()

    provisionInFlight.set(key, promise)
    promise.catch(() => {
      // Drop failed promises so callers can retry; successes stay cached for the session.
      provisionInFlight.delete(key)
    })
    return promise
  },

  async getBalance(partnerName: string): Promise<PartnerBalance> {
    const authHeader = await getAuthHeader()
    const res = await apiFetch(`${EDGE_BASE}/partner-balance`, {
      headers: { ...authHeader },
    })
    return unwrapEnvelope<PartnerBalance>(res)
  },

  async refreshToken(partnerName: string): Promise<PartnerTokenRefreshResult> {
    const authHeader = await getAuthHeader()
    const res = await apiFetch(`${EDGE_BASE}/partner-refresh-token`, {
      method: 'POST',
      headers: { ...authHeader },
    })
    return unwrapEnvelope<PartnerTokenRefreshResult>(res)
  },

  async sendClaimEmail(partnerName: string): Promise<void> {
    const authHeader = await getAuthHeader()
    await apiFetch(`${EDGE_BASE}/partner-send-claim`, {
      method: 'POST',
      headers: { ...authHeader },
    })
  },

  async getAiModels(partnerName: string): Promise<ChainabitAiModel[]> {
    const authHeader = await getAuthHeader()
    const res = await apiFetch(`${EDGE_BASE}/partner-models`, {
      headers: { ...authHeader },
    })
    return unwrapEnvelope<ChainabitAiModel[]>(res)
  },

  /**
   * Initiates the Chainabit OAuth login flow for unauthenticated users (social sign-in).
   * No Supabase session required — this is the entry point for "Continue with Chainabit"
   * on the Login/Register pages. The platform API callback creates the Supabase session.
   */
  async startOAuthLogin(returnUrl: string = window.location.href): Promise<void> {
    if (!CHAINABIT_OAUTH_CLIENT_ID) {
      throw new Error('Chainabit OAuth is not configured (missing CHAINABIT_OAUTH_CLIENT_ID).')
    }
    if (!CHAINABIT_OAUTH_CALLBACK_URL) {
      throw new Error('Chainabit OAuth is not configured (missing CHAINABIT_OAUTH_REDIRECT_URI).')
    }

    const codeVerifier = generateCodeVerifier()
    const codeChallenge = await deriveCodeChallenge(codeVerifier)
    const nonce = Array.from(crypto.getRandomValues(new Uint8Array(8)))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('')

    const state = encodeOAuthState({ flowType: 'login', codeVerifier, returnUrl, nonce })

    const authorizeUrl = new URL(`${CHAINABIT_OAUTH_URL}/oauth/authorize`)
    authorizeUrl.searchParams.set('client_id', CHAINABIT_OAUTH_CLIENT_ID)
    authorizeUrl.searchParams.set('response_type', 'code')
    authorizeUrl.searchParams.set('redirect_uri', CHAINABIT_OAUTH_CALLBACK_URL)
    authorizeUrl.searchParams.set('scope', 'email:read profile:read wallet:read execution:run')
    authorizeUrl.searchParams.set('code_challenge', codeChallenge)
    authorizeUrl.searchParams.set('code_challenge_method', 'S256')
    authorizeUrl.searchParams.set('state', state)

    window.location.href = authorizeUrl.toString()
  },

  async revokeToken(partnerName: string): Promise<void> {
    const authHeader = await getAuthHeader()
    await apiFetch(`${EDGE_BASE}/partner-revoke`, {
      method: 'POST',
      headers: { ...authHeader },
    })
  },

  /**
   * Initiates the Chainabit OAuth 2.0 Authorization Code + PKCE flow.
   * PKCE is generated in the browser — no client_secret is needed or stored.
   * The browser redirects directly to Chainabit's authorize endpoint
   * (Chainabit = provider, LenserFight = partner/consumer).
   * The code exchange happens server-side in the platform API callback.
   */
  async startOAuthConnect(returnUrl: string = window.location.href): Promise<void> {
    const { data } = await supabase.auth.getSession()
    const userId = data.session?.user?.id
    if (!userId) throw new Error('Must be authenticated to connect Chainabit')

    const codeVerifier = generateCodeVerifier()
    const codeChallenge = await deriveCodeChallenge(codeVerifier)
    const nonce = Array.from(crypto.getRandomValues(new Uint8Array(8)))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('')

    const state = encodeOAuthState({ flowType: 'connect', userId, codeVerifier, returnUrl, nonce })

    const authorizeUrl = new URL(`${CHAINABIT_OAUTH_URL}/oauth/authorize`)
    authorizeUrl.searchParams.set('client_id', CHAINABIT_OAUTH_CLIENT_ID)
    authorizeUrl.searchParams.set('response_type', 'code')
    authorizeUrl.searchParams.set('redirect_uri', CHAINABIT_OAUTH_CALLBACK_URL)
    authorizeUrl.searchParams.set('scope', 'wallet:read execution:run')
    authorizeUrl.searchParams.set('code_challenge', codeChallenge)
    authorizeUrl.searchParams.set('code_challenge_method', 'S256')
    authorizeUrl.searchParams.set('state', state)

    window.location.href = authorizeUrl.toString()
  },
}
