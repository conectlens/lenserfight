/**
 * ConnectorCredentialResolver — resolves connector credentials for workflow execution.
 *
 * Design:
 * - Server-side: calls Supabase RPCs to fetch/verify connector tokens.
 * - Browser-side (dry-run): always returns null — credentials never leave server.
 *
 * Security:
 * - Raw tokens are ephemeral in memory during execution only.
 * - Never logged, never included in execution results or node metadata.
 * - Connector resolution is scoped to the workspace owning the workflow.
 */

export interface ConnectorCredentialResolver {
  /**
   * Resolve a connector credential by slug.
   * @param connectorSlug - The workspace-scoped connector slug.
   * @param requiredScopes - Optional scopes the connector must have.
   * @returns The decrypted token string, or null if unavailable/unauthorized.
   */
  resolve(connectorSlug: string, requiredScopes?: string[]): Promise<string | null>
}

/**
 * Null resolver for browser/dry-run context.
 * Always returns null — credentials are never exposed to the frontend.
 */
export const nullConnectorResolver: ConnectorCredentialResolver = {
  async resolve(): Promise<null> {
    return null
  },
}

/**
 * Creates a server-side connector resolver that calls the existing
 * connector RPCs to verify and retrieve credentials.
 *
 * @param rpcCall - Function that executes a Supabase RPC and returns data.
 *                  Typically: `(name, params) => supabase.rpc(name, params).then(r => r.data)`
 */
export function createServerConnectorResolver(
  rpcCall: (rpcName: string, params: Record<string, unknown>) => Promise<unknown>,
): ConnectorCredentialResolver {
  return {
    async resolve(connectorSlug: string, requiredScopes?: string[]): Promise<string | null> {
      try {
        // Use the existing fn_connector_test RPC to verify validity
        const testResult = await rpcCall('fn_connector_test', { p_slug: connectorSlug }) as {
          ok?: boolean
          scopes?: string[]
          reason?: string
        } | null

        if (!testResult || !testResult.ok) {
          return null
        }

        // Verify required scopes are present
        if (requiredScopes?.length) {
          const available = new Set(testResult.scopes ?? [])
          const missing = requiredScopes.filter((s) => !available.has(s))
          if (missing.length > 0) {
            return null
          }
        }

        // Retrieve the active token via fn_connector_resolve_token
        // This RPC returns the decrypted token for execution use only.
        const token = await rpcCall('fn_connector_resolve_token', { p_slug: connectorSlug }) as string | null
        return token ?? null
      } catch {
        return null
      }
    },
  }
}
