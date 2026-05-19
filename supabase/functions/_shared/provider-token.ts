// _shared/provider-token.ts
//
// Resolves a user's Chainabit OAuth access token from auth.identities.
//
// Supabase Custom OAuth Provider stores the access_token, refresh_token,
// expires_at, and scope in auth.identities (provider = 'custom:chainabit')
// when the user connects via supabase.auth.linkIdentity({ provider: 'chainabit' }).
//
// Token refresh is handled by Supabase itself: when the client calls
// supabase.auth.refreshSession(), Supabase refreshes the provider token using
// the stored refresh_token and writes the new pair back into auth.identities.
// Edge Functions do not need to perform or store token refreshes manually.
//
// If the access_token is expired (Chainabit returns 401), Edge Functions
// surface a `token_expired` error.  The client detects this, calls
// supabase.auth.refreshSession(), then retries the Edge Function call.
//
// Usage:
//   import { resolveChainabitToken, ProviderNotConnectedError } from '../_shared/provider-token.ts'
//   const { accessToken, scopes } = await resolveChainabitToken(user.id, adminClient)

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

export interface ProviderTokenResult {
  accessToken: string
  scopes: string[]
}

export class ProviderNotConnectedError extends Error {
  readonly code = 'not_connected'
  constructor() {
    super(
      'No Chainabit account connected — connect your Chainabit account to use this capability',
    )
    this.name = 'ProviderNotConnectedError'
  }
}

/**
 * Thrown when the Chainabit access_token is present in identity_data but has
 * been rejected by Chainabit's API with HTTP 401.  Edge Functions catch this
 * and surface it to the client so it can call supabase.auth.refreshSession()
 * and retry.  This is distinct from ProviderNotConnectedError (no identity /
 * no token field at all).
 */
export class TokenExpiredError extends Error {
  readonly code = 'token_expired'
  constructor() {
    super('Chainabit token expired — call supabase.auth.refreshSession() then retry')
    this.name = 'TokenExpiredError'
  }
}

export class CapabilityDeniedError extends Error {
  readonly code = 'insufficient_scope'
  constructor(required: string[], granted: string[]) {
    super(
      `Required scopes [${required.join(', ')}] not granted. ` +
        `Granted: [${granted.join(', ')}]`,
    )
    this.name = 'CapabilityDeniedError'
  }
}

/**
 * Resolves the Chainabit OAuth access token for a user from auth.identities.
 *
 * Reads the custom:chainabit identity stored by Supabase Custom OAuth Provider.
 * Does not attempt token refresh — Supabase handles that automatically via
 * its own session refresh cycle.
 *
 * EXPIRY: this function does NOT detect expired tokens.  An expired token will
 * still have an access_token field in identity_data and will be returned here.
 * Expiry is detected downstream when Chainabit's API returns HTTP 401; callers
 * should catch that and throw TokenExpiredError (or map it to a 401 response)
 * so the client can call supabase.auth.refreshSession() and retry.
 *
 * @throws ProviderNotConnectedError  when no custom:chainabit identity exists,
 *                                    or the identity has no access_token field
 *                                    (e.g. partial OAuth flow, Chainabit-side revocation)
 */
export async function resolveChainabitToken(
  userId: string,
  adminClient: ReturnType<typeof createClient>,
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
  const accessToken = d['access_token'] as string | undefined
  const scope = d['scope'] as string | undefined

  if (!accessToken) {
    throw new ProviderNotConnectedError()
  }

  const scopes = scope ? scope.split(' ').filter(Boolean) : []
  return { accessToken, scopes }
}
