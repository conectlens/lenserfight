/**
 * Capability matrix parametrization helpers.
 *
 * Filters the matrix into typed slices shaped for `describe.each` /
 * `it.each` callsites. Tests should reach for these rather than calling
 * `buildCapabilityMatrix().filter(...)` inline — keeps the matrix's filter
 * conventions in one place.
 */

import {
  buildCapabilityMatrix,
  type CapabilityMatrixEntry,
  type ExecutionPath,
  type FundingSource,
  type ExpectedOutcome,
} from '../capability-matrix'
import type { AnyProvider } from '../model-registry'

/** Memoized matrix — built once per test process. Safe because the matrix is pure. */
let cached: CapabilityMatrixEntry[] | null = null
function matrix(): CapabilityMatrixEntry[] {
  if (cached === null) cached = buildCapabilityMatrix()
  return cached
}

/**
 * Rows that should successfully execute end-to-end against the mocked transport.
 * Optionally narrowed by provider — pass none for the global runnable set.
 */
export function runnableRowsFor(provider?: AnyProvider): CapabilityMatrixEntry[] {
  return matrix().filter(
    (e) => e.expected === 'runnable' && (provider == null || e.provider === provider),
  )
}

/**
 * Rows the system MUST reject (any non-runnable outcome). Filterable by
 * provider and by execution path.
 */
export function gatedRowsFor(opts: {
  provider?: AnyProvider
  executionPath?: ExecutionPath
  outcome?: ExpectedOutcome
} = {}): CapabilityMatrixEntry[] {
  return matrix().filter((e) => {
    if (e.expected === 'runnable') return false
    if (opts.provider && e.provider !== opts.provider) return false
    if (opts.executionPath && e.executionPath !== opts.executionPath) return false
    if (opts.outcome && e.expected !== opts.outcome) return false
    return true
  })
}

/**
 * Rows that run on a specific execution path (e.g. `lens.text_stream`).
 * Optionally narrowed by funding source.
 */
export function pathRowsFor(
  executionPath: ExecutionPath,
  fundingSource?: FundingSource,
): CapabilityMatrixEntry[] {
  return matrix().filter(
    (e) =>
      e.executionPath === executionPath &&
      (fundingSource == null || e.fundingSource === fundingSource),
  )
}

/**
 * Unique providers represented in the matrix (those that have at least one
 * runnable model and an execution pattern declared).
 */
export function providersInMatrix(): AnyProvider[] {
  return Array.from(new Set(matrix().map((e) => e.provider))).sort() as AnyProvider[]
}

/** Unique canonical model keys in the matrix. */
export function modelsInMatrix(): string[] {
  return Array.from(new Set(matrix().map((e) => e.model))).sort()
}

/**
 * Shape every row into a label for jest's `each` table. Keeps spec output
 * readable: `[openai/gpt-4o on lens.text_stream / user_byok_cloud]`.
 */
export function labelFor(e: CapabilityMatrixEntry): string {
  return `${e.provider}/${e.model} on ${e.executionPath} / ${e.fundingSource}`
}
