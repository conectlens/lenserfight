/**
 * INodeRunner — GRASP Polymorphism interface for workflow node execution.
 *
 * Each node type (code, json_transform, switch, etc.) implements this
 * interface. The NodeRunnerRegistry dispatches to the correct runner based
 * on the node_type field, enabling Open/Closed extension without modifying
 * the core execution pipeline.
 *
 * Design decisions:
 * - Information Expert: each runner owns its execution logic.
 * - Low Coupling: runners depend only on NodeRunnerContext, not the full service.
 * - Indirection: the registry decouples callers from concrete runners.
 */

import type { ExecutionInput, ExecutionResult, WorkflowNodeType } from '../execution.types'
import type { LensOutputContract } from '@lenserfight/types'

/**
 * Immutable context passed to every node runner. Contains everything the
 * runner needs without coupling it to the full WorkflowExecutionContext.
 */
export interface NodeRunnerContext {
  /** Unique node identifier within the workflow run. */
  readonly nodeId: string
  /** Outputs from upstream nodes keyed by source nodeId. */
  readonly upstreamOutputs: ReadonlyMap<string, ExecutionResult>
  /** Workflow-scoped resolved parameters (root inputs + set_variables accumulation). */
  readonly resolvedParams: Record<string, unknown>
  /** Per-node configuration from the canvas (expressions, templates, etc.). */
  readonly nodeConfig: Record<string, unknown>
  /** AbortSignal for cooperative cancellation. */
  readonly signal?: AbortSignal
  /** Fully rendered prompt (template after [[label]] substitution). Available for AI-calling runners. */
  readonly resolvedPrompt?: string
  /** Provider execution function. Closed over the resolved provider + model for this node. */
  readonly executeProvider?: (input: ExecutionInput) => Promise<ExecutionResult>
  /** Output contract for this node's lens version (if resolved). */
  readonly outputContract?: LensOutputContract | null
  /** Connector credential resolver. Returns decrypted token or null (browser context). */
  readonly resolveConnector?: (slug: string, scopes?: string[]) => Promise<string | null>
}

/**
 * Result returned by a node runner. Extends ExecutionResult with optional
 * variable mutations that the engine applies to the execution context.
 */
export interface NodeRunnerResult {
  /** Standard execution output — the engine wraps this in a NodeOutputEnvelope. */
  readonly output: ExecutionResult
  /** Optional: variables to merge into the workflow's resolvedParams scope. */
  readonly variableMutations?: Record<string, unknown>
}

/**
 * Polymorphic interface for all custom node runners.
 * Each concrete runner handles exactly one WorkflowNodeType.
 */
export interface INodeRunner {
  /** The node type this runner handles. Used by the registry for dispatch. */
  readonly nodeType: WorkflowNodeType
  /** Execute the node logic. Must be idempotent for retry safety. */
  execute(ctx: NodeRunnerContext): Promise<NodeRunnerResult>
}
