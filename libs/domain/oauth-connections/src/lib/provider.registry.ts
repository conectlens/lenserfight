/**
 * OAuth Provider Registry — contributor extensibility point.
 *
 * Usage:
 *   // Built-in: Google is pre-registered.
 *   getOAuthProvider('google')  // → googleProvider
 *
 *   // Contributor extension (add a new provider without core changes):
 *   import { registerOAuthProvider } from '@lenserfight/domain/oauth-connections'
 *   registerOAuthProvider(myNotionProvider)
 *
 * New providers must also:
 *   1. Add a new migration extending the uoc_provider_check CHECK constraint.
 *   2. Add a new Edge Function variant for the OAuth callback.
 *   3. Add a runner implementation using resolveConnector() from NodeRunnerContext.
 *   4. See docs/how-to/contributors/adding-oauth-providers.md for the full checklist.
 */

import type { OAuthProvider, OAuthProviderDefinition } from './oauth-connection.types'
import { googleProvider } from './providers/google.provider'

const REGISTRY = new Map<OAuthProvider, OAuthProviderDefinition>()

// Pre-register the Google provider (Phase 1)
REGISTRY.set('google', googleProvider)

/**
 * Registers a new OAuth provider definition.
 * Throws if the provider is already registered (use updateOAuthProvider to replace).
 */
export function registerOAuthProvider(definition: OAuthProviderDefinition): void {
  if (REGISTRY.has(definition.provider)) {
    throw new Error(
      `OAuth provider already registered: ${definition.provider}. ` +
      `Use updateOAuthProvider() to replace an existing registration.`,
    )
  }
  REGISTRY.set(definition.provider, definition)
}

/**
 * Replaces an existing provider definition. Use sparingly.
 */
export function updateOAuthProvider(definition: OAuthProviderDefinition): void {
  REGISTRY.set(definition.provider, definition)
}

/**
 * Returns the provider definition for the given provider id.
 * Throws if the provider is not registered.
 */
export function getOAuthProvider(provider: OAuthProvider): OAuthProviderDefinition {
  const def = REGISTRY.get(provider)
  if (!def) {
    throw new Error(
      `OAuth provider not registered: ${provider}. ` +
      `Call registerOAuthProvider() before using this provider.`,
    )
  }
  return def
}

/**
 * Returns all registered provider definitions.
 */
export function listOAuthProviders(): OAuthProviderDefinition[] {
  return Array.from(REGISTRY.values())
}

/**
 * Returns the capability definition for a given provider + capability pair.
 * Returns undefined if provider or capability is not found.
 */
export function getOAuthCapabilityDefinition(
  provider: OAuthProvider,
  capability: string,
) {
  const def = REGISTRY.get(provider)
  if (!def) return undefined
  return def.capabilities.find((c) => c.capability === capability)
}
