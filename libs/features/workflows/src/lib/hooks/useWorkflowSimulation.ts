// useWorkflowSimulation — builder-time diagnostics backed by the pure
// simulate() engine. Returns a `SimulationReport` memoised against the
// provided graph so the canvas can render badges without re-running the
// simulator on every state change.

import { simulate, type SimulationEdge, type SimulationNode, type SimulationReport } from '@lenserfight/infra/simulation'
import { useMemo } from 'react'

export interface UseWorkflowSimulationInput {
  nodes: SimulationNode[]
  edges: SimulationEdge[]
  rootInputs?: Record<string, unknown>
  /**
   * Disable simulation entirely (e.g. while the canvas is still hydrating).
   * When false, the hook returns a noop `ok:true, diagnostics:[]` report.
   */
  enabled?: boolean
}

/**
 * Runs the pure simulator against the current builder graph. The simulator
 * is deterministic and cheap (no provider calls), so memoising on the graph
 * identity is sufficient — consumers passing stable arrays get free re-uses.
 */
export function useWorkflowSimulation(input: UseWorkflowSimulationInput): SimulationReport {
  const { nodes, edges, rootInputs, enabled = true } = input

  return useMemo<SimulationReport>(() => {
    if (!enabled) {
      return {
        diagnostics: [],
        waves: [],
        unreachableNodes: [],
        maxParallelism: 0,
        estimatedCredits: 0,
        estimatedWallClockMs: { p50: 0, p95: 0 },
        branchExploration: [],
        ok: true,
      }
    }
    return simulate(nodes, edges, rootInputs ?? {})
    // Intentionally depend on the raw arrays — callers either stabilise them
    // with their own `useMemo` or accept the recompute, which is O(V+E).
  }, [nodes, edges, rootInputs, enabled])
}
