/**
 * RagRetrievalRunner — query memory FTS or vector store for context chunks.
 *
 * Prepares a retrieval request envelope. In production, the engine would
 * call fn_search_lenser_memory RPC. This runner structures the request
 * and emits the results as document attachments for downstream nodes.
 *
 * Config schema (nodeConfig):
 *   query?: string — search query (defaults to upstream text)
 *   topK?: number — max results (default: 5, max: 20)
 *   lenserId?: string — scope to specific lenser's memory
 *   minScore?: number — minimum relevance threshold (0-1, default: 0.0)
 *
 * Security: no code execution.
 */

import type { WorkflowNodeType } from '../execution.types'
import type { INodeRunner, NodeRunnerContext, NodeRunnerResult } from './node-runner.interface'

const DEFAULT_TOP_K = 5
const MAX_TOP_K = 20

export class RagRetrievalRunner implements INodeRunner {
  readonly nodeType: WorkflowNodeType = 'rag_retrieval'

  async execute(ctx: NodeRunnerContext): Promise<NodeRunnerResult> {
    const configQuery = ctx.nodeConfig['query'] as string | undefined
    const topK = Math.max(1, Math.min(Number(ctx.nodeConfig['topK'] ?? DEFAULT_TOP_K), MAX_TOP_K))
    const lenserId = ctx.nodeConfig['lenserId'] as string | undefined
    const minScore = Math.max(0, Math.min(Number(ctx.nodeConfig['minScore'] ?? 0), 1))

    // Determine query
    let query = configQuery
    if (!query) {
      const firstUpstream = ctx.upstreamOutputs.values().next().value
      query = firstUpstream?.text ?? ''
    }

    if (!query) {
      return {
        output: {
          mediaType: 'text',
          text: '',
          data: { error: 'No query for retrieval' },
          durationMs: 0,
        },
      }
    }

    // Emit retrieval request envelope — the engine or a downstream node
    // will call fn_search_lenser_memory with these parameters
    return {
      output: {
        mediaType: 'text',
        text: `[RAG Retrieval: "${query.slice(0, 100)}${query.length > 100 ? '...' : ''}" top-${topK}]`,
        data: {
          __rag_retrieval_request: true,
          query,
          topK,
          lenserId: lenserId ?? null,
          minScore,
        },
        durationMs: 0,
      },
      variableMutations: {
        __rag_query: query,
        __rag_top_k: topK,
      },
    }
  }
}
