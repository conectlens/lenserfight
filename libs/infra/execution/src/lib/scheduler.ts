// Scheduler — pure wave-computation over a workflow DAG.
//
// This seam (Phase 3) isolates Kahn-style wave scheduling from the rest of
// the execution kernel so:
//   * the simulation engine (Phase 5) can reuse wave computation without
//     instantiating any providers;
//   * future replacements (priority queues, budget-aware scheduling) can be
//     swapped in behind this single interface;
//   * the controller (`WorkflowExecutionService`) keeps its Controller-role
//     GRASP contract: it orchestrates but does not compute.
//
// The scheduler is intentionally stateless w.r.t. I/O. All persistence is
// done by the controller calling `advance()` / `firstWave()` between waves.

export interface SchedulerEdge {
  sourceNodeId: string
  targetNodeId: string
}

export interface SchedulerNode {
  id: string
}

/**
 * Live adjacency state for wave scheduling. A Scheduler is INSTANCE state:
 * the caller mutates in-degree as nodes become terminal. That keeps the
 * scheduler oblivious to edge conditions (conditions live on the edge
 * evaluator in `prompt-resolver.ts`).
 */
export class Scheduler {
  private readonly inDegree: Map<string, number>
  private readonly dependents: Map<string, string[]>
  private waveIdx = 0

  constructor(nodes: SchedulerNode[], edges: SchedulerEdge[]) {
    this.inDegree = new Map<string, number>(nodes.map((n) => [n.id, 0]))
    this.dependents = new Map<string, string[]>(nodes.map((n) => [n.id, []]))

    for (const edge of edges) {
      const currentInDegree = this.inDegree.get(edge.targetNodeId)
      if (currentInDegree !== undefined) {
        this.inDegree.set(edge.targetNodeId, currentInDegree + 1)
      }
      this.dependents.get(edge.sourceNodeId)?.push(edge.targetNodeId)
    }
  }

  /** Wave index last returned by `firstWave`/`advance`. */
  get currentWave(): number {
    return this.waveIdx
  }

  /** Nodes whose in-degree is already zero. */
  firstWave(): string[] {
    const wave: string[] = []
    for (const [id, deg] of this.inDegree) {
      if (deg === 0) wave.push(id)
    }
    return wave
  }

  /**
   * Given a completed (or terminalised) wave, compute the next wave by
   * decrementing in-degrees of dependents. Returns the node ids whose
   * in-degree became zero.
   */
  advance(terminalWave: string[]): string[] {
    this.waveIdx += 1
    const next: string[] = []
    for (const nodeId of terminalWave) {
      for (const dep of this.dependents.get(nodeId) ?? []) {
        const newDegree = (this.inDegree.get(dep) ?? 0) - 1
        this.inDegree.set(dep, newDegree)
        if (newDegree === 0) next.push(dep)
      }
    }
    return next
  }

  /** Parents of a node (read-only introspection for the runtime). */
  parentsOf(nodeId: string, edges: SchedulerEdge[]): string[] {
    return edges.filter((e) => e.targetNodeId === nodeId).map((e) => e.sourceNodeId)
  }
}
