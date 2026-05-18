/**
 * OAuth Connection Resolver — resolves [[:connector:ref]] OAuth credentials
 * for workflow/agent/battle execution.
 *
 * Implements the existing ConnectorCredentialResolver interface so it can be
 * composed transparently with the platform connector resolver.
 *
 * Security:
 *  - Calls service_role-only RPCs (fn_oauth_resolve_connection,
 *    fn_oauth_get_connection_for_refresh). Never usable from the browser.
 *  - The nullOAuthConnectionResolver is used in browser/dry-run context
 *    and always returns null.
 *  - Tokens are ephemeral in memory during execution only — never logged,
 *    never included in node output_data or execution metadata.
 *  - Token refresh is attempted pre-emptively (5-minute window) by calling
 *    the provider token endpoint directly. Refresh failures are non-fatal;
 *    the current (potentially near-expired) token is used as fallback.
 *
 * Required env vars for Google token refresh:
 *   GOOGLE_OAUTH_CLIENT_ID
 *   GOOGLE_OAUTH_CLIENT_SECRET
 */

import type { ConnectorCredentialResolver } from './connector-credential-resolver'
import { parseConnectorRef } from '@lenserfight/domain/oauth-connections'

export interface OAuthResolverServiceClient {
  rpc<T = unknown>(
    fn: string,
    args: Record<string, unknown>,
  ): Promise<{ data: T | null; error: { message: string } | null }>
}

/**
 * Creates a server-side resolver for OAuth connections.
 *
 * @param serviceClient - A Supabase service-role client (or equivalent RPC wrapper).
 * @param lenserId - The profile id of the workflow/agent/battle owner.
 */
export function createOAuthConnectionResolver(
  serviceClient: OAuthResolverServiceClient,
  lenserId: string,
): ConnectorCredentialResolver {
  return {
    async resolve(ref: string, requiredScopes?: string[]): Promise<string | null> {
      // Only handle valid connector refs (provider.capability.label format)
      const parsed = parseConnectorRef(ref)
      if (!parsed.ok) return null

      try {
        // Step 1: Pre-emptive refresh check
        const { data: refreshMeta } = await serviceClient.rpc<{
          connection_id: string
          workspace_id?: string
          refresh_token: string
          expires_at: string | null
          granted_scopes: string[]
          provider: string
          capability: string
        } | null>('fn_oauth_get_connection_for_refresh', {
          p_lenser_id: lenserId,
          p_ref: ref,
        })

        if (refreshMeta?.refresh_token) {
          // fn_oauth_get_connection_for_refresh only returns data when refresh
          // is actually needed (within 5-min expiry window). Trigger refresh.
          await triggerTokenRefresh(
            serviceClient,
            lenserId,
            ref,
            refreshMeta.refresh_token,
            refreshMeta.provider,
            refreshMeta.workspace_id,
          )
        }

        // Step 2: Resolve the (potentially freshly refreshed) access token
        const { data: token, error } = await serviceClient.rpc<string | null>(
          'fn_oauth_resolve_connection',
          {
            p_lenser_id: lenserId,
            p_ref: ref,
            p_required_scopes: requiredScopes ?? [],
          },
        )

        if (error || !token) return null
        return token
      } catch {
        // Credential resolution failures are non-fatal — the runner decides
        // how to handle a null token (typically returns an error output).
        return null
      }
    },
  }
}

/**
 * Refreshes a Google OAuth access token directly using the Google token endpoint,
 * then stores the new access token via fn_oauth_upsert_connection (service_role).
 * Errors are swallowed — refresh failure is non-fatal; the current token
 * (possibly expired by the time the runner uses it) is the fallback.
 */
async function triggerTokenRefresh(
  serviceClient: OAuthResolverServiceClient,
  lenserId: string,
  ref: string,
  refreshToken: string,
  provider: string,
  workspaceId?: string,
): Promise<void> {
  if (provider !== 'google') return

  try {
    const clientId = process.env['GOOGLE_OAUTH_CLIENT_ID'] ?? ''
    const clientSecret = process.env['GOOGLE_OAUTH_CLIENT_SECRET'] ?? ''

    // Skip refresh when credentials are not configured — avoids a guaranteed-fail HTTP call.
    if (!clientId || !clientSecret) return

    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
      }).toString(),
    })

    if (!tokenRes.ok) return

    const refreshed = await tokenRes.json() as {
      access_token: string
      expires_in: number
      scope?: string
    }

    const expiresAt = new Date(Date.now() + refreshed.expires_in * 1000).toISOString()
    const grantedScopes = refreshed.scope ? refreshed.scope.split(' ').filter(Boolean) : []

    // Parse ref: provider.capability.label (e.g. 'google.gmail.primary')
    const parts = ref.split('.')
    const capability = parts[1] ?? ''
    const label = parts.slice(2).join('.')

    if (!capability || !label) return

    await serviceClient.rpc('fn_oauth_upsert_connection', {
      p_lenser_id: lenserId,
      p_workspace_id: workspaceId,
      p_provider: provider,
      p_capability: capability,
      p_label: label,
      p_access_token: refreshed.access_token,
      p_refresh_token: null,           // refresh_token unchanged; preserved by upsert COALESCE
      p_granted_scopes: grantedScopes.length > 0 ? grantedScopes : [],
      p_expires_at: expiresAt,
    })
  } catch {
    // Refresh failed — proceed with current token
  }
}

/**
 * Null resolver for browser / dry-run context.
 * OAuth credentials are never resolved client-side.
 */
export const nullOAuthConnectionResolver: ConnectorCredentialResolver = {
  async resolve(): Promise<null> {
    return null
  },
}
