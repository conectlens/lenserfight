// _shared/provider-token.ts
//
// Resolves a user's Chainabit OAuth access token from auth.identities.
//
// HOW TOKENS GET INTO identity_data
// ----------------------------------
// Supabase GoTrue stores the userinfo endpoint response as identity_data for
// custom OAuth providers.  The Chainabit userinfo endpoint now returns
// access_token and expires_at (in addition to the standard profile fields), so
// GoTrue stores them in auth.identities.identity_data during linkIdentity().
//
// The refresh_token is NOT returned by the userinfo endpoint (it is stored
// server-side only).  Instead, the OAuth callback page calls
// fn_store_my_chainabit_tokens() immediately after linkIdentity() to persist
// the refresh_token from session.provider_refresh_token into identity_data.
//
// TOKEN REFRESH
// -------------
// resolveChainabitToken checks expires_at.  If the access_token is expired (or
// absent), it uses the stored refresh_token to obtain a new access_token from
// Chainabit's token endpoint, persists the new pair via fn_upsert_chainabit_tokens,
// and returns the fresh token.  Client-side session refresh is not required.
//
// Usage:
//   import { resolveChainabitToken, ProviderNotConnectedError } from '../_shared/provider-token.ts'
//   const { accessToken, scopes } = await resolveChainabitToken(userId, adminClient, refreshConfig)

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

export interface ProviderTokenResult {
  accessToken: string
  scopes: string[]
}

/** Config required for server-side token refresh. */
export interface ChainabitRefreshConfig {
  apiUrl: string
  clientId: string
  clientSecret: string
}

export class ProviderNotConnectedError extends Error {
  readonly code = 'not_connected'
  constructor() {
    super('No Chainabit account connected — connect your Chainabit account to use this capability')
    this.name = 'ProviderNotConnectedError'
  }
}

export class TokenExpiredError extends Error {
  readonly code = 'token_expired'
  constructor() {
    super('Chainabit token expired — reconnect your Chainabit account to restore access')
    this.name = 'TokenExpiredError'
  }
}

export class CapabilityDeniedError extends Error {
  readonly code = 'insufficient_scope'
  constructor(required: string[], granted: string[]) {
    super(
      `Required scopes [${required.join(', ')}] not granted. ` + `Granted: [${granted.join(', ')}]`
    )
    this.name = 'CapabilityDeniedError'
  }
}

/** Returns true if the token expires within the next 60 seconds. */
function isExpired(expiresAt: number | undefined): boolean {
  if (!expiresAt) return false // no expiry info — treat as valid, let Chainabit reject if bad
  return Date.now() / 1000 >= expiresAt - 60
}

/**
 * Calls Chainabit's token refresh endpoint and returns the new token pair.
 * Throws on network error or non-200 response.
 */
async function refreshAccessToken(
  refreshToken: string,
  config: ChainabitRefreshConfig
): Promise<{ accessToken: string; refreshToken: string; expiresAt: number; scope: string }> {
  const apiUrl = config.apiUrl.replace(/\/$/, '')
  const body = new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
    client_id: config.clientId,
    client_secret: config.clientSecret,
  })

  const res = await fetch(`${apiUrl}/oauth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  })

  if (!res.ok) {
    const text = await res.text().catch(() => '')
    console.error(`[provider-token] refresh failed ${res.status}:`, text.slice(0, 200))
    throw new TokenExpiredError()
  }

  const data = (await res.json()) as {
    access_token: string
    refresh_token: string
    expires_in: number
    scope: string
  }

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresAt: Math.floor(Date.now() / 1000) + data.expires_in,
    scope: data.scope ?? '',
  }
}

/**
 * Resolves the Chainabit OAuth access token for a user from auth.identities.
 *
 * 1. Reads access_token, refresh_token, expires_at, and scope from identity_data.
 * 2. If access_token is present and not expired → returns it immediately.
 * 3. If expired (or absent) and refresh_token is present → calls Chainabit's
 *    token endpoint to refresh, persists the new pair via fn_upsert_chainabit_tokens,
 *    and returns the fresh access_token.
 * 4. If neither token is available → throws TokenExpiredError (user must re-link).
 *
 * @param refreshConfig  Required env-var values for server-side refresh.
 *                       Pass undefined to skip refresh (legacy callers).
 *
 * @throws ProviderNotConnectedError  no custom:chainabit identity for this user
 * @throws TokenExpiredError          token absent/expired and refresh also failed
 */
export async function resolveChainabitToken(
  userId: string,
  adminClient: ReturnType<typeof createClient>,
  refreshConfig?: ChainabitRefreshConfig
): Promise<ProviderTokenResult> {
  const { data, error } = await adminClient.auth.admin.getUserById(userId)
  if (error || !data?.user) {
    throw new Error('Failed to look up user identity')
  }

  const identity = (data.user.identities ?? []).find((i) => i.provider === 'custom:chainabit')
  if (!identity) {
    throw new ProviderNotConnectedError()
  }

  const d = (identity.identity_data ?? {}) as Record<string, unknown>
  const accessToken  = d['access_token']  as string | undefined
  const refreshToken = d['refresh_token'] as string | undefined
  const expiresAt    = d['expires_at']    as number | undefined
  const scope        = d['scope']         as string | undefined

  const tokenValid = !!accessToken && !isExpired(expiresAt)

  if (tokenValid) {
    const scopes = scope ? scope.split(' ').filter(Boolean) : []
    return { accessToken: accessToken!, scopes }
  }

  // Token absent or expired — attempt server-side refresh.
  if (refreshToken && refreshConfig) {
    let refreshed: Awaited<ReturnType<typeof refreshAccessToken>>
    try {
      refreshed = await refreshAccessToken(refreshToken, refreshConfig)
    } catch {
      throw new TokenExpiredError()
    }

    // Persist the new token pair so subsequent calls don't re-refresh.
    await adminClient.rpc('fn_upsert_chainabit_tokens', {
      p_user_id:       userId,
      p_access_token:  refreshed.accessToken,
      p_refresh_token: refreshed.refreshToken,
      p_expires_at:    refreshed.expiresAt,
    })

    const scopes = refreshed.scope ? refreshed.scope.split(' ').filter(Boolean) : []
    return { accessToken: refreshed.accessToken, scopes }
  }

  // No refresh_token stored (or no refresh config) — user must re-link.
  throw new TokenExpiredError()
}
