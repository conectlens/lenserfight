/**
 * Composite Connector Resolver — dispatches to the correct resolver based on
 * the ref format.
 *
 * Dispatch logic:
 *  - If the slug parses as a valid connector ref ('google.gmail.primary'),
 *    delegate to the OAuth connection resolver.
 *  - Otherwise, delegate to the platform API connector resolver.
 *
 * This means WorkflowExecutionContext.resolveConnector transparently handles
 * both [[:connector:ref]] OAuth connections and platform API connector slugs
 * without callers needing to know which system owns the credential.
 *
 * Usage in workers:
 *   const resolver = createCompositeConnectorResolver(oauthResolver, platformResolver)
 *   ctx.resolveConnector = resolver.resolve.bind(resolver)
 */

import type { ConnectorCredentialResolver } from './connector-credential-resolver'
import { parseConnectorRef } from '@lenserfight/domain/oauth-connections'

/**
 * Creates a composite resolver that routes refs to the appropriate backend.
 *
 * @param oauthResolver    - Resolver for [[:connector:provider.cap.label]] OAuth refs.
 * @param platformResolver - Resolver for platform API connector slugs.
 */
export function createCompositeConnectorResolver(
  oauthResolver: ConnectorCredentialResolver,
  platformResolver: ConnectorCredentialResolver,
): ConnectorCredentialResolver {
  return {
    async resolve(slug: string, scopes?: string[]): Promise<string | null> {
      const parsed = parseConnectorRef(slug)
      if (parsed.ok) {
        return oauthResolver.resolve(slug, scopes)
      }
      return platformResolver.resolve(slug, scopes)
    },
  }
}
