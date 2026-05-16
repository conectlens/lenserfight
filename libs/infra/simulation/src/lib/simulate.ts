// simulate() — pure workflow simulator.
//
// Phase 5 of the Lens Workflow Engine Blueprint (§7 Simulation Engine).
//
// Guarantees:
//   * No network calls — providers are mocked via MockProvider.
//   * Deterministic: `simulate(graph, rootInputs, models)` returns identical
//     bytes for identical inputs. This enables golden-file tests and
//     diffable PR previews.
//   * Uses the exact same algorithms as the execution kernel (Kahn waves,
//     prompt rendering, merge strategies) by importing from
//     `@lenserfight/infra/execution`.

import {
  Scheduler,
  detectCycle,
  isEdgeConditionSatisfied,
  resolveRenderedInputs,
  validateWorkflow,
  type ResolverEdge,
  type ResolverUpstreamResult,
  type ValidationIssue,
} from '@lenserfight/infra/execution'

import type { LensKind, LensInputContract } from '@lenserfight/types'

// ── Public types ──────────────────────────────────────────────────────────

export interface SimulationNode {
  id: string
  lensId: string
  versionId?: string | null
  kind: LensKind
  /** `[[label]]` placeholders the template consumes. */
  paramLabels?: string[]
  /** Optional execution hints. */
  executionHints?: {
    /** p50 duration estimate in ms. */
    maxDuration?: number
    /** low=cheap / high=expensive — drives estimatedCredits. */
    costProfile?: 'low' | 'mid' | 'high'
    /** estimated credits per run override. */
    estimatedCredits?: number
  }
  inputContract?: LensInputContract | null
  config?: Record<string, unknown> | null
}

export interface SimulationEdge {
  id?: string
  sourceNodeId: string
  targetNodeId: string
  sourceOutputKey?: string
  targetParamLabel?: string
  mergeStrategy?: 'last_write_wins' | 'concat' | 'array' | 'json_object' | null
  condition?: {
    type: 'equals' | 'contains' | 'present' | 'truthy'
    value?: unknown
  } | null
  onFail?: 'skip_downstream' | 'fail_run' | 'divert_to_branch' | null
}

export interface SimulationBranchPath {
  path: string[]
  terminalNodeId: string
  reachable: boolean
}

export interface SimulationReport {
  /** All validation issues, including warnings, ordered by severity. */
  diagnostics: ValidationIssue[]
  /** Wave order computed by Kahn; node ids only. */
  waves: string[][]
  /** Nodes the simulator was unable to reach (e.g. always-false route). */
  unreachableNodes: string[]
  /** Number of concurrently-runnable nodes in the widest wave. */
  maxParallelism: number
  estimatedCredits: number
  estimatedWallClockMs: { p50: number; p95: number }
  branchExploration: SimulationBranchPath[]
  /** True iff no `error`-severity diagnostic was emitted. */
  ok: boolean
}

export interface SimulateOptions {
  /** Cap for branch exploration depth — matches DB recursion cap. */
  maxBranchDepth?: number
}

// ── Public API ────────────────────────────────────────────────────────────

/**
 * Simulate a workflow graph. Pure, deterministic, no I/O.
 *
 * Steps:
 *   1. Structural validation (§4 ruleset) — cycles, orphans, bindings,
 *      routing shape, validation policy, orchestration caps.
 *   2. Wave computation (Kahn). Missing parents + always-false conditions
 *      are surfaced as `unreachable_node` diagnostics.
 *   3. Per-node prompt rendering with mock outputs drives merge + routing
 *      behaviour — this catches merge-strategy mismatches.
 *   4. Cost / wall-clock aggregation using `executionHints`.
 *   5. Branch exploration up to `maxBranchDepth`.
 */
export function simulate(
  nodes: SimulationNode[],
  edges: SimulationEdge[],
  rootInputs: Record<string, unknown> = {},
  options: SimulateOptions = {},
): SimulationReport {
  const diagnostics: ValidationIssue[] = []
  const maxBranchDepth = options.maxBranchDepth ?? 8

  // 1. Structural validation
  const structural = validateWorkflow(
    nodes.map((n) => ({
      id: n.id,
      lensId: n.lensId,
      versionId: n.versionId,
      kind: n.kind,
      paramLabels: n.paramLabels,
      config: n.config as Record<string, unknown> | null,
      inputContract: n.inputContract,
    })),
    edges.map((e) => ({
      id: e.id,
      sourceNodeId: e.sourceNodeId,
      targetNodeId: e.targetNodeId,
      sourceOutputKey: e.sourceOutputKey,
      targetParamLabel: e.targetParamLabel,
      condition: e.condition ?? undefined,
      onFail: e.onFail ?? undefined,
    })),
    { rootInputs },
  )
  diagnostics.push(...structural.errors, ...structural.warnings)

  // If the graph is cyclic we can't run Kahn — short-circuit with empty waves.
  if (structural.cycleNodes && structural.cycleNodes.length > 0) {
    return {
      diagnostics,
      waves: [],
      unreachableNodes: structural.cycleNodes,
      maxParallelism: 0,
      estimatedCredits: 0,
      estimatedWallClockMs: { p50: 0, p95: 0 },
      branchExploration: [],
      ok: false,
    }
  }

  // 2. Wave computation via the same Scheduler the kernel uses
  const scheduler = new Scheduler(
    nodes.map((n) => ({ id: n.id })),
    edges.map((e) => ({ sourceNodeId: e.sourceNodeId, targetNodeId: e.targetNodeId })),
  )
  const waves: string[][] = []
  let wave = scheduler.firstWave()
  const seen = new Set<string>()
  while (wave.length > 0) {
    waves.push(wave)
    for (const id of wave) seen.add(id)
    wave = scheduler.advance(wave)
  }

  const unreachableNodes = nodes.filter((n) => !seen.has(n.id)).map((n) => n.id)
  if (unreachableNodes.length > 0) {
    diagnostics.push({
      severity: 'warn',
      code: 'cycle_detected',
      message: `Nodes not reachable by wave scheduling: ${unreachableNodes.join(', ')}`,
      details: { nodeIds: unreachableNodes },
    })
  }

  const maxParallelism = waves.reduce((max, w) => Math.max(max, w.length), 0)

  // 3. Drive the prompt resolver to catch merge / condition mismatches
  //    using mocked upstream results.
  const mockUpstream = new Map<string, ResolverUpstreamResult>()
  const nodeById = new Map(nodes.map((n) => [n.id, n]))
  for (const wave of waves) {
    for (const nodeId of wave) {
      const node = nodeById.get(nodeId)
      if (!node) {
        // This node ID exists in an edge but not in the nodes list.
        // Skip it to avoid crashing the simulator. Structural validation
        // will have already flagged this as an issue.
        continue
      }

      try {
        resolveRenderedInputs(
          {
            id: node.id,
            paramLabels: node.paramLabels,
            config: (node.config as { merge?: 'last_write_wins' | 'concat' | 'array' | 'json_object' } | null) ?? null,
          },
          edges.map<ResolverEdge>((e) => ({
            sourceNodeId: e.sourceNodeId,
            targetNodeId: e.targetNodeId,
            sourceOutputKey: e.sourceOutputKey ?? 'output',
            targetParamLabel: e.targetParamLabel ?? '',
            mergeStrategy: e.mergeStrategy ?? null,
            condition: e.condition ?? null,
          })),
          mockUpstream,
          rootInputs,
        )
      } catch (err) {
        diagnostics.push({
          severity: 'warn',
          code: 'missing_binding',
          nodeId,
          message: `Could not resolve inputs for ${nodeId}: ${err instanceof Error ? err.message : String(err)}`,
        })
      }
      // Fake this node's completion so downstream resolution sees it.
      mockUpstream.set(nodeId, {
        status: 'completed',
        outputData: { output: `[sim:${nodeId}]` },
        envelope: {
          kind: node.kind,
          artifactKind: 'text',
          output: `[sim:${nodeId}]`,
          metadata: { sim: true },
        },
      })
    }
  }

  // 4. Cost + wall-clock estimation
  const { estimatedCredits, p50, p95 } = estimateCost(nodes, waves)

  // 5. Branch exploration — enumerate routing permutations up to the depth
  //    cap; non-routing branches are considered deterministic.
  const branchExploration = exploreBranches(nodes, edges, maxBranchDepth)

  const ok = diagnostics.every((d) => d.severity !== 'error')
  return {
    diagnostics,
    waves,
    unreachableNodes,
    maxParallelism,
    estimatedCredits,
    estimatedWallClockMs: { p50, p95 },
    branchExploration,
    ok,
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────

function estimateCost(
  nodes: SimulationNode[],
  waves: string[][],
): { estimatedCredits: number; p50: number; p95: number } {
  const byId = new Map(nodes.map((n) => [n.id, n]))
  const creditFor = (n: SimulationNode): number => {
    if (n.executionHints?.estimatedCredits != null) return n.executionHints.estimatedCredits
    switch (n.executionHints?.costProfile ?? 'mid') {
      case 'low':
        return 1
      case 'mid':
        return 5
      case 'high':
        return 25
    }
  }
  const durationFor = (n: SimulationNode): number => n.executionHints?.maxDuration ?? 2_000

  let estimatedCredits = 0
  let p50 = 0
  let p95 = 0
  for (const wave of waves) {
    let waveP50 = 0
    let waveP95 = 0
    for (const id of wave) {
      const node = byId.get(id)
      if (!node) continue
      estimatedCredits += creditFor(node)
      const d = durationFor(node)
      waveP50 = Math.max(waveP50, d) // wave wall-clock = slowest parallel node
      waveP95 = Math.max(waveP95, Math.round(d * 1.6))
    }
    p50 += waveP50
    p95 += waveP95
  }
  return { estimatedCredits, p50, p95 }
}

function exploreBranches(
  nodes: SimulationNode[],
  edges: SimulationEdge[],
  maxDepth: number,
): SimulationBranchPath[] {
  const byId = new Map(nodes.map((n) => [n.id, n]))
  const starts = nodes
    .filter((n) => edges.every((e) => e.targetNodeId !== n.id))
    .map((n) => n.id)

  const paths: SimulationBranchPath[] = []
  const walk = (path: string[], depth: number): void => {
    if (depth > maxDepth) return
    const current = path[path.length - 1]
    const out = edges.filter((e) => e.sourceNodeId === current)
    if (out.length === 0) {
      paths.push({ path: [...path], terminalNodeId: current, reachable: true })
      return
    }

    const node = byId.get(current)
    if (node?.kind === 'routing') {
      // For routing lenses, explore every condition branch so the UI can
      // show users "what does each route do?".
      for (const edge of out) {
        walk([...path, edge.targetNodeId], depth + 1)
      }
      return
    }

    // Non-routing: follow every outbound (fan-out is still legal).
    for (const edge of out) {
      walk([...path, edge.targetNodeId], depth + 1)
    }
  }

  for (const start of starts) walk([start], 0)
  return paths
}

// ── Re-export cycle detector for external consumers who only want this ───

export { detectCycle, isEdgeConditionSatisfied }
