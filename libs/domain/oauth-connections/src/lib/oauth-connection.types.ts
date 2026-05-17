/**
 * Domain types for user outbound connector connections.
 *
 * This module covers LenserFight → external services, authenticated on behalf
 * of a specific user/workspace. It intentionally remains distinct from the
 * inbound platform API connector schema under connectors.*.
 */

// ── Provider and capability identifiers ──────────────────────────────────────

export type ConnectorProvider =
  | 'notion'
  | 'google'
  | 'asana'
  | 'monday'
  | 'zapier'
  | 'slack'
  | 'github'
  | 'gitlab'
  | 'jira'
  | 'linear'
  | 'trello'
  | 'airtable'
  | 'hubspot'
  | 'salesforce'
  | 'discord'
  | 'microsoft_teams'
  | 'microsoft_outlook'
  | 'microsoft_onedrive'
  | 'microsoft_excel'
  | 'dropbox'
  | 'box'
  | 'calendly'
  | 'clickup'
  | 'todoist'
  | 'custom_http'

/** Backwards-compatible name used by the first OAuth implementation. */
export type OAuthProvider = ConnectorProvider

export type ConnectorCapability =
  | 'database'
  | 'page'
  | 'gmail'
  | 'drive'
  | 'sheets'
  | 'docs'
  | 'calendar'
  | 'tasks'
  | 'boards'
  | 'webhooks'
  | 'chat'
  | 'repos'
  | 'issues'
  | 'projects'
  | 'lists'
  | 'records'
  | 'crm'
  | 'messages'
  | 'channels'
  | 'files'
  | 'events'
  | 'http'

export type GoogleCapability = 'gmail' | 'drive' | 'sheets' | 'docs' | 'calendar'

/**
 * Union of all supported OAuth capabilities across all providers.
 * Grows as new providers are added via registerOAuthProvider().
 */
/** Backwards-compatible name used by the first OAuth implementation. */
export type OAuthCapability = ConnectorCapability

export type ConnectorAuthStrategy = 'oauth2' | 'api_key' | 'webhook' | 'none'

export type ConnectorAvailability = 'available' | 'experimental' | 'metadata_only' | 'planned'

export interface ConnectorRateLimitPolicy {
  readonly requestsPerMinute?: number
  readonly burst?: number
  readonly providerPolicyUrl?: string
}

export interface ConnectorExecutionSafetyPolicy {
  readonly serverSideOnly: boolean
  readonly allowAiPromptUseByDefault: boolean
  readonly masksSecretsInLogs: boolean
  readonly requiresAllowlist?: boolean
  readonly responseSizeLimitBytes?: number
}

export interface ConnectorDocumentationMetadata {
  readonly docsSlug: string
  readonly examples: readonly string[]
}

export interface ConnectorUiMetadata {
  readonly icon?: string
  readonly category: 'productivity' | 'communication' | 'developer' | 'crm' | 'storage' | 'automation' | 'custom'
  readonly availability: ConnectorAvailability
  readonly connectLabel?: string
}

export interface ConnectorTestFixtureStrategy {
  readonly fixtureKind: 'mock_adapter' | 'http_fixture' | 'metadata_only'
  readonly notes: string
}

export interface ConnectorOperationDefinition {
  readonly operation: string
  readonly displayName: string
  readonly description: string
  readonly availability: ConnectorAvailability
  readonly requiredScopes?: readonly string[]
  readonly outputShape: 'object' | 'array' | 'status'
}

// ── Provider contract types ───────────────────────────────────────────────────

/**
 * Defines a single capability within an OAuth provider.
 * Each capability maps to a set of required OAuth scopes and a set of
 * supported operations that runners can perform with it.
 */
export interface ConnectorCapabilityDefinition {
  readonly capability: ConnectorCapability
  readonly provider: ConnectorProvider
  /** Scopes/permissions required for this capability. */
  readonly requiredScopes: readonly string[]
  readonly optionalScopes?: readonly string[]
  /** Human-readable label shown in UI. */
  readonly displayName: string
  /** Short description shown in /settings/connections. */
  readonly description: string
  /** Operations available through this capability (informational). */
  readonly supportedOperations: readonly string[]
  readonly operations?: readonly ConnectorOperationDefinition[]
}

export type OAuthCapabilityDefinition = ConnectorCapabilityDefinition

/**
 * Defines a complete OAuth provider.
 * Implement this interface and call registerOAuthProvider() to add a new provider.
 */
export interface ConnectorProviderDefinition {
  readonly provider: ConnectorProvider
  readonly displayName: string
  readonly description: string
  readonly authStrategy: ConnectorAuthStrategy
  readonly capabilities: readonly ConnectorCapabilityDefinition[]
  readonly availability: ConnectorAvailability
  readonly revocationBehavior: string
  readonly tokenRefreshBehavior: string | null
  readonly secretStorageRequirements: string
  readonly rateLimit: ConnectorRateLimitPolicy
  readonly executionSafety: ConnectorExecutionSafetyPolicy
  readonly docs: ConnectorDocumentationMetadata
  readonly ui: ConnectorUiMetadata
  readonly testFixtures: ConnectorTestFixtureStrategy
  /**
   * Builds the provider's OAuth 2.0 authorization URL.
   * The state param should be a base64url-encoded JSON payload with at minimum
   * { lenser_id, capability, label, nonce }.
   */
  buildAuthUrl?(capability: ConnectorCapability, redirectUri: string, state: string): string
}

export type OAuthProviderDefinition = ConnectorProviderDefinition

// ── Connection record (safe metadata — no tokens) ────────────────────────────

/**
 * A resolved user OAuth connection as returned by fn_oauth_list_connections().
 * Never contains tokens, vault secret IDs, or sensitive fields.
 */
export interface UserOAuthConnection {
  id: string
  workspaceId?: string | null
  provider: ConnectorProvider
  capability: ConnectorCapability
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
  readonly provider: ConnectorProvider
  readonly capability: ConnectorCapability
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
  workspace_id?: string
  provider?: ConnectorProvider
  capability: ConnectorCapability
  label: string
  /** Random nonce to prevent replay attacks. */
  nonce: string
  /** Optional HMAC/signature over the state payload for server-side validation. */
  signature?: string
}
