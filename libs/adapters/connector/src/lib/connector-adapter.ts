import type {
  ConnectorMetadata,
  DispatchEvent,
  DispatchResult,
  VerifyResult,
} from './connector.types'

/**
 * @experimental Phase 10 alpha. Stable interface promoted to v1 in Phase 16
 * via RFC-0001. Breaking changes go through the RFC process; additive changes
 * may land in minor releases. Implementations should use the versioned
 * `ConnectorAdapterV1` symbol to opt in to the alpha contract explicitly.
 */
export interface ConnectorAdapterV1 {
  /** Stable identifier for the adapter — matches the registry key. */
  id(): string

  /** Static description of the connector this adapter speaks for. */
  metadata(): ConnectorMetadata

  /** Validate a service token, returning the scopes it carries. */
  verify(token: string): Promise<VerifyResult>

  /**
   * Dispatch an event payload to the external system.
   * Adapters MUST resolve (never throw) — surface failures via `ok: false`.
   */
  dispatch(event: DispatchEvent): Promise<DispatchResult>
}

/**
 * Unversioned alias resolving to the current default adapter contract.
 * New code can import this; long-lived consumers should pin to a versioned
 * symbol (`ConnectorAdapterV1`) so a future v2 doesn't silently change shape.
 */
export type ConnectorAdapter = ConnectorAdapterV1
