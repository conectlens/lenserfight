/**
 * Domain types for user OAuth connections.
 *
 * These are business-layer types. They are intentionally decoupled from:
 *  - libs/adapters/connector  (platform API connectors: external → LenserFight)
 *  - libs/types/connector.types.ts  (also platform-facing)
 *
 * This module covers the inverse direction: LenserFight → external services,
 * authenticated on behalf of a specific user.
 */

// ── Provider and capability identifiers ──────────────────────────────────────

export type OAuthProvider = 'google'

export type GoogleCapability = 'gmail' | 'drive' | 'sheets' | 'docs' | 'calendar'

/**
 * Union of all supported OAuth capabilities across all providers.
 * Grows as new providers are added via registerOAuthProvider().
 */
export type OAuthCapability = GoogleCapability

// ── Provider contract types ───────────────────────────────────────────────────

/**
 * Defines a single capability within an OAuth provider.
 * Each capability maps to a set of required OAuth scopes and a set of
 * supported operations that runners can perform with it.
 */
export interface OAuthCapabilityDefinition {
  readonly capability: OAuthCapability
  readonly provider: OAuthProvider
  /** OAuth 2.0 scopes required for this capability. */
  readonly requiredScopes: readonly string[]
  /** Human-readable label shown in UI. */
  readonly displayName: string
  /** Short description shown in /settings/connections. */
  readonly description: string
  /** Operations available through this capability (informational). */
  readonly supportedOperations: readonly string[]
}

/**
 * Defines a complete OAuth provider.
 * Implement this interface and call registerOAuthProvider() to add a new provider.
 */
export interface OAuthProviderDefinition {
  readonly provider: OAuthProvider
  readonly displayName: string
  readonly capabilities: readonly OAuthCapabilityDefinition[]
  /**
   * Builds the provider's OAuth 2.0 authorization URL.
   * The state param should be a base64url-encoded JSON payload with at minimum
   * { lenser_id, capability, label, nonce }.
   */
  buildAuthUrl(capability: OAuthCapability, redirectUri: string, state: string): string
}

// ── Connection record (safe metadata — no tokens) ────────────────────────────

/**
 * A resolved user OAuth connection as returned by fn_oauth_list_connections().
 * Never contains tokens, vault secret IDs, or sensitive fields.
 */
export interface UserOAuthConnection {
  id: string
  provider: OAuthProvider
  capability: OAuthCapability
  connectionLabel: string
  /** Stable reference slug, e.g. 'google.gmail.primary'. */
  ref: string
  grantedScopes: string[]
  expiresAt: string | null
  isActive: boolean
  createdAt: string
  updatedAt: string
}

// ── Connector reference (expression syntax) ──────────────────────────────────

/**
 * A parsed connector reference from [[:connector:google.gmail.primary]] syntax.
 */
export interface ConnectorRef {
  /** The full inner ref string: 'google.gmail.primary'. */
  readonly raw: string
  readonly provider: OAuthProvider
  readonly capability: OAuthCapability
  /** The user-defined label: 'primary', 'work', etc. */
  readonly label: string
}

/**
 * Result of parsing a [[:connector:...]] token.
 */
export type ConnectorRefParseResult =
  | { readonly ok: true; readonly ref: ConnectorRef }
  | { readonly ok: false; readonly raw: string; readonly reason: string }

// ── OAuth state payload (encoded in the `state` query param) ─────────────────

/**
 * Payload encoded in the OAuth state param during the connect flow.
 * Decoded by the Edge Function after the provider redirects back.
 */
export interface OAuthStatePayload {
  lenser_id: string
  capability: OAuthCapability
  label: string
  /** Random nonce to prevent replay attacks. */
  nonce: string
}
