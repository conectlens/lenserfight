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
 *    the oauth-token-refresh Edge Function. Refresh failures are non-fatal;
 *    the current (potentially near-expired) token is used as fallback.
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
 * @param edgeFunctionBaseUrl - Base URL for Supabase Edge Functions (optional;
 *        defaults to SUPABASE_FUNCTIONS_URL env var if available).
 */
export function createOAuthConnectionResolver(
  serviceClient: OAuthResolverServiceClient,
  lenserId: string,
  edgeFunctionBaseUrl?: string,
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
            edgeFunctionBaseUrl,
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
 * Triggers a token refresh via the oauth-token-refresh Edge Function.
 * Errors are swallowed — refresh failure is non-fatal; the current token
 * (possibly expired by the time the runner uses it) is the fallback.
 */
async function triggerTokenRefresh(
  serviceClient: OAuthResolverServiceClient,
  lenserId: string,
  ref: string,
  refreshToken: string,
  provider: string,
  edgeFunctionBaseUrl?: string,
): Promise<void> {
  try {
    // Prefer the edge function invocation via service client RPC proxy.
    // This avoids needing a direct HTTP client in the resolver.
    await serviceClient.rpc('fn_invoke_edge', {
      p_function: 'oauth-token-refresh',
      p_payload: {
        lenser_id: lenserId,
        ref,
        refresh_token: refreshToken,
        provider,
      },
    })
  } catch {
    // Edge function invocation may not be available in all worker environments.
    // Fall back to direct HTTP if a base URL is provided.
    if (edgeFunctionBaseUrl) {
      try {
        await fetch(`${edgeFunctionBaseUrl}/oauth-token-refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            lenser_id: lenserId,
            ref,
            refresh_token: refreshToken,
            provider,
          }),
        })
      } catch {
        // Refresh failed — proceed with current token
      }
    }
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
