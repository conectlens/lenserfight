// _shared/provider-token.ts
//
// Resolves a user's Chainabit OAuth access token from auth.identities.
//
// Supabase Custom OAuth Provider (custom_chainabit) stores the access_token,
// refresh_token, expires_at, and scope in auth.identities when the user
// connects via supabase.auth.linkIdentity({ provider: 'custom_chainabit' }).
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
 * Reads the custom_chainabit identity stored by Supabase Custom OAuth Provider.
 * Does not attempt token refresh — Supabase handles that automatically via
 * its own session refresh cycle.
 *
 * @throws ProviderNotConnectedError  when no custom_chainabit identity or access_token is found
 */
export async function resolveChainabitToken(
  userId: string,
  adminClient: ReturnType<typeof createClient>,
): Promise<ProviderTokenResult> {
  const { data, error } = await adminClient.auth.admin.getUserById(userId)
  if (error || !data?.user) {
    throw new Error('Failed to look up user identity')
  }

  const identity = (data.user.identities ?? []).find((i) => i.provider === 'custom_chainabit')
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
