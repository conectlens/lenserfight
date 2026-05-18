/**
 * ChainRunner — sequential LLM calls sharing a message history.
 *
 * GRASP Information Expert: knows how to accumulate upstream outputs into
 * a conversation thread (messages array) and emit the combined context
 * for a downstream Lens node to continue the chain.
 *
 * Config schema (nodeConfig):
 *   systemPrompt?: string — system message prepended to the chain
 *   maxTurns?: number — max conversation turns to include (default: 20)
 *   includeUpstream?: boolean — include upstream outputs as assistant messages (default: true)
 *
 * Output: structured messages array for downstream Lens consumption.
 *
 * Security: no code execution, no provider call.
 */

import type { WorkflowNodeType } from '../execution.types'
import type { INodeRunner, NodeRunnerContext, NodeRunnerResult } from './node-runner.interface'

const DEFAULT_MAX_TURNS = 20
const MAX_TURNS_CAP = 50

interface ChainMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export class ChainRunner implements INodeRunner {
  readonly nodeType: WorkflowNodeType = 'chain'

  async execute(ctx: NodeRunnerContext): Promise<NodeRunnerResult> {
    const systemPrompt = ctx.nodeConfig['systemPrompt'] as string | undefined
    const maxTurns = Math.max(1, Math.min(Number(ctx.nodeConfig['maxTurns'] ?? DEFAULT_MAX_TURNS), MAX_TURNS_CAP))
    const includeUpstream = ctx.nodeConfig['includeUpstream'] !== false

    // Build message history
    const messages: ChainMessage[] = []

    // System prompt
    if (systemPrompt) {
      messages.push({ role: 'system', content: systemPrompt })
    }

    // Existing chain history from resolvedParams (accumulated from previous chain nodes)
    const existingHistory = ctx.resolvedParams['__chain_messages'] as ChainMessage[] | undefined
    if (Array.isArray(existingHistory)) {
      for (const msg of existingHistory) {
        if (msg && typeof msg === 'object' && 'role' in msg && 'content' in msg) {
          messages.push(msg)
        }
      }
    }

    // Add upstream outputs as assistant messages
    if (includeUpstream) {
      for (const [nodeId, upstream] of ctx.upstreamOutputs) {
        const content = upstream.text ?? JSON.stringify(upstream.data ?? '')
        if (content) {
          messages.push({ role: 'assistant', content })
        }
      }
    }

    // Trim to maxTurns (keep system prompt + last N messages)
    const systemMessages = messages.filter((m) => m.role === 'system')
    const nonSystemMessages = messages.filter((m) => m.role !== 'system')
    const trimmedNonSystem = nonSystemMessages.slice(-maxTurns)
    const finalMessages = [...systemMessages, ...trimmedNonSystem]

    // Build combined prompt text for downstream lens consumption
    const promptText = finalMessages
      .map((m) => `[${m.role}] ${m.content}`)
      .join('\n\n')

    return {
      output: {
        mediaType: 'text',
        text: promptText,
        data: {
          __chain_context: true,
          messages: finalMessages,
          messageCount: finalMessages.length,
          maxTurns,
        },
        durationMs: 0,
      },
      variableMutations: {
        __chain_messages: finalMessages,
        __chain_turn_count: finalMessages.length,
      },
    }
  }
}
