import type {
  ConnectorMetadata,
  DispatchEvent,
  DispatchResult,
  VerifyResult,
} from './connector.types'

/**
 * @stable Promoted to V1 stable in Phase M (2026-05-08). Governed by RFC-0001.
 *
 * Breaking changes (renames, removals, behavior changes) require a new
 * versioned interface (`ConnectorAdapterV2`) and a deprecation cycle on V1.
 * Additive, optional fields may land in V1 minor releases.
 *
 * Implementations should pin to the versioned symbol (`ConnectorAdapterV1`),
 * not the unversioned alias (`ConnectorAdapter`), so a future V2 release does
 * not silently change the shape of long-lived adapters.
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
