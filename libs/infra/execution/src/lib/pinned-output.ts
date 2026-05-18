/**
 * PinnedOutputStore — development-time data pinning for workflow dry-run.
 *
 * Allows users to "pin" a node's output during development so downstream
 * nodes can be configured and tested without repeatedly calling external
 * services, AI providers, or connector APIs.
 *
 * Production execution MUST ignore pinned data — only used when
 * `ctx.isDevExecution === true`.
 */

import type { ExecutionResult } from './execution.types'

export interface PinnedOutput {
  /** Node ID this pin belongs to. */
  nodeId: string
  /** The pinned execution result. */
  output: ExecutionResult
  /** ISO timestamp when the output was pinned. */
  pinnedAt: string
  /** Optional user-facing label for the pin (e.g. "Happy path response"). */
  label?: string
}

export interface PinnedOutputStore {
  /** Get a pinned output for a node, or undefined if not pinned. */
  get(nodeId: string): PinnedOutput | undefined
  /** Pin an output for a node (replaces any existing pin). */
  set(nodeId: string, output: PinnedOutput): void
  /** Clear the pin for a specific node. */
  clear(nodeId: string): void
  /** Clear all pins. */
  clearAll(): void
  /** Returns all currently pinned node IDs. */
  pinnedNodeIds(): string[]
}

/**
 * Creates an in-memory pinned output store.
 * Suitable for browser-side dry-run usage within a single session.
 */
export function createPinnedOutputStore(): PinnedOutputStore {
  const pins = new Map<string, PinnedOutput>()

  return {
    get(nodeId) {
      return pins.get(nodeId)
    },
    set(nodeId, output) {
      pins.set(nodeId, output)
    },
    clear(nodeId) {
      pins.delete(nodeId)
    },
    clearAll() {
      pins.clear()
    },
    pinnedNodeIds() {
      return [...pins.keys()]
    },
  }
}
