import type { ToolDefinition } from '@opencode-ai/plugin'

/**
 * @stable Introduced Phase 2 of the OpenCode integration (see
 * docs/en/tutorials/getting-started/cli-getting-started.md for context).
 *
 * Breaking changes (renames, removals, behavior changes) require a new
 * versioned interface (`OpencodeToolAdapterV1` -> `OpencodeToolAdapterV2`)
 * and a deprecation cycle on V1, mirroring the convention established by
 * `ConnectorAdapterV1` in `@lenserfight/adapters-connector`.
 *
 * Implementations should pin to the versioned symbol (`OpencodeToolAdapterV1`),
 * not the unversioned alias (`OpencodeToolAdapter`), so a future V2 release
 * does not silently change the shape of long-lived adapters.
 */
export interface OpencodeToolAdapterV1 {
  /** Stable identifier for the adapter — matches the registry key and the
   * tool name OpenCode's LLM will see (e.g. `lf_lens_run`). */
  id(): string

  /** Static description of the tool this adapter exposes. */
  metadata(): OpencodeToolMetadata

  /** Builds the `@opencode-ai/plugin` `ToolDefinition` OpenCode invokes. */
  toToolDefinition(): ToolDefinition
}

export interface OpencodeToolMetadata {
  /** Short human-readable description surfaced to the LLM and in `lf opencode` listings. */
  description: string
  /** Name of the LenserFight MCP tool this adapter mirrors, for traceability. */
  mirrorsMcpTool: string
}

/**
 * Unversioned alias resolving to the current default adapter contract.
 * New code can import this; long-lived consumers should pin to a versioned
 * symbol (`OpencodeToolAdapterV1`) so a future v2 doesn't silently change shape.
 */
export type OpencodeToolAdapter = OpencodeToolAdapterV1
