import type { IExecutionProvider, ExecutionInput, ExecutionResult } from './execution.types'

export interface WorkflowNode {
  id: string
  lensId: string
  versionId?: string | null
  /** [[label]] param names present in the lens template — resolved from incoming edges */
  paramLabels?: string[]
}

export interface WorkflowEdge {
  sourceNodeId: string
  targetNodeId: string
  sourceOutputKey: string
  targetParamLabel: string
}

export type NodeStatus = 'pending' | 'running' | 'completed' | 'failed'

export interface NodeResult {
  nodeId: string
  status: NodeStatus
  outputData?: Record<string, unknown>
  error?: string
}

export interface WorkflowRunResult {
  runId: string
  status: 'completed' | 'failed'
  nodeResults: NodeResult[]
}

export interface WorkflowExecutionContext {
  runId: string
  /** Root-level inputs for nodes with no incoming edges */
  rootInputs: Record<string, unknown>
  /** Resolves a lens version's template body by lensId + versionId */
  resolveLensTemplate(lensId: string, versionId?: string | null): Promise<string>
  /** Called when a node changes status — used by the CF Worker to write workflow_node_results */
  onNodeStatusChange(nodeId: string, result: NodeResult): Promise<void>
}

/**
 * Pure workflow execution service — no Supabase calls.
 * The caller (CF Worker) provides the context object that handles all I/O.
 *
 * Algorithm:
 * 1. Kahn's topological sort builds execution waves.
 * 2. Nodes in each wave are executed concurrently (Promise.all).
 * 3. Edge data mapping: source.outputData[sourceOutputKey] → target prompt [[label]] replacement.
 */
export class WorkflowExecutionService {
  /**
   * Detects cycles in a workflow DAG using Kahn's algorithm.
   * Returns the IDs of nodes involved in a cycle, or null if acyclic.
   */
  static detectCycle(
    nodes: { id: string }[],
    edges: { sourceNodeId: string; targetNodeId: string }[]
  ): string[] | null {
    const inDegree = new Map<string, number>(nodes.map((n) => [n.id, 0]))
    const adjList = new Map<string, string[]>(nodes.map((n) => [n.id, []]))

    for (const edge of edges) {
      inDegree.set(edge.targetNodeId, (inDegree.get(edge.targetNodeId) ?? 0) + 1)
      adjList.get(edge.sourceNodeId)?.push(edge.targetNodeId)
    }

    const queue: string[] = []
    for (const [id, deg] of inDegree) {
      if (deg === 0) queue.push(id)
    }

    let processed = 0
    let qi = 0
    while (qi < queue.length) {
      const current = queue[qi++]
      processed++
      for (const neighbor of adjList.get(current) ?? []) {
        const newDeg = (inDegree.get(neighbor) ?? 0) - 1
        inDegree.set(neighbor, newDeg)
        if (newDeg === 0) queue.push(neighbor)
      }
    }

    if (processed === nodes.length) return null // acyclic

    // Return nodes that weren't processed (they're in cycles)
    return nodes.filter((n) => !queue.includes(n.id)).map((n) => n.id)
  }
  constructor(private readonly provider: IExecutionProvider) {}

  async executeWorkflow(
    nodes: WorkflowNode[],
    edges: WorkflowEdge[],
    ctx: WorkflowExecutionContext
  ): Promise<WorkflowRunResult> {
    const nodeMap = new Map(nodes.map((n) => [n.id, n]))
    const results = new Map<string, NodeResult>()

    // Build adjacency and in-degree maps
    const inDegree = new Map<string, number>(nodes.map((n) => [n.id, 0]))
    const dependents = new Map<string, string[]>(nodes.map((n) => [n.id, []]))

    for (const edge of edges) {
      inDegree.set(edge.targetNodeId, (inDegree.get(edge.targetNodeId) ?? 0) + 1)
      dependents.get(edge.sourceNodeId)?.push(edge.targetNodeId)
    }

    // Kahn's algorithm — collect initial wave (no dependencies)
    let wave = nodes.filter((n) => (inDegree.get(n.id) ?? 0) === 0).map((n) => n.id)

    while (wave.length > 0) {
      // Execute current wave concurrently
      await Promise.all(
        wave.map(async (nodeId) => {
          const node = nodeMap.get(nodeId)!
          await ctx.onNodeStatusChange(nodeId, { nodeId, status: 'running' })

          try {
            // Resolve template with edge-mapped inputs
            const template = await ctx.resolveLensTemplate(node.lensId, node.versionId)
            const resolvedPrompt = this.resolvePrompt(template, nodeId, edges, results, ctx.rootInputs)

            const execInput: ExecutionInput = { prompt: resolvedPrompt }
            const execResult: ExecutionResult = await this.provider.execute(node.lensId, execInput)

            const outputData: Record<string, unknown> = {
              mediaType: execResult.mediaType,
              ...(execResult.text !== undefined ? { output: execResult.text, text: execResult.text } : {}),
              ...(execResult.url !== undefined ? { output: execResult.url, url: execResult.url } : {}),
              mimeType: execResult.mimeType,
              durationMs: execResult.durationMs,
              ...execResult.metadata,
            }

            const nodeResult: NodeResult = { nodeId, status: 'completed', outputData }
            results.set(nodeId, nodeResult)
            await ctx.onNodeStatusChange(nodeId, nodeResult)
          } catch (err) {
            const nodeResult: NodeResult = {
              nodeId,
              status: 'failed',
              error: err instanceof Error ? err.message : String(err),
            }
            results.set(nodeId, nodeResult)
            await ctx.onNodeStatusChange(nodeId, nodeResult)
          }
        })
      )

      // Build next wave: nodes whose dependencies are all resolved
      const nextWave: string[] = []
      for (const nodeId of wave) {
        for (const dep of dependents.get(nodeId) ?? []) {
          const newDegree = (inDegree.get(dep) ?? 0) - 1
          inDegree.set(dep, newDegree)
          if (newDegree === 0) nextWave.push(dep)
        }
      }
      wave = nextWave
    }

    const allResults = Array.from(results.values())
    const failed = allResults.some((r) => r.status === 'failed')

    return {
      runId: ctx.runId,
      status: failed ? 'failed' : 'completed',
      nodeResults: allResults,
    }
  }

  private resolvePrompt(
    template: string,
    nodeId: string,
    edges: WorkflowEdge[],
    results: Map<string, NodeResult>,
    rootInputs: Record<string, unknown>
  ): string {
    let prompt = template

    // Replace [[label]] from incoming edge outputs
    const incomingEdges = edges.filter((e) => e.targetNodeId === nodeId)
    for (const edge of incomingEdges) {
      const sourceResult = results.get(edge.sourceNodeId)
      const value = sourceResult?.outputData?.[edge.sourceOutputKey] ?? ''
      prompt = prompt.replaceAll(`[[${edge.targetParamLabel}]]`, String(value))
    }

    // Replace any remaining [[label]] from rootInputs
    for (const [key, value] of Object.entries(rootInputs)) {
      prompt = prompt.replaceAll(`[[${key}]]`, String(value))
    }

    return prompt
  }
}
