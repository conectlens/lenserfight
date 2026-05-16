/**
 * EmbeddingRunner — generate vector embeddings from upstream text.
 *
 * This runner prepares the embedding request envelope. The actual vector
 * generation is delegated to the execution provider (via the engine's
 * standard provider pipeline on a downstream node, or via a future
 * embedding-specific provider).
 *
 * Config schema (nodeConfig):
 *   inputField?: string — dot-path to text in upstream data (default: use upstream.text)
 *   dimensions?: number — requested embedding dimensions (provider-dependent)
 *
 * Output: text summary + data.textToEmbed for downstream provider consumption.
 *
 * Security: no code execution, no provider call.
 */

import type { WorkflowNodeType } from '../execution.types'
import type { INodeRunner, NodeRunnerContext, NodeRunnerResult } from './node-runner.interface'

const MAX_INPUT_LENGTH = 100_000

export class EmbeddingRunner implements INodeRunner {
  readonly nodeType: WorkflowNodeType = 'embedding'

  async execute(ctx: NodeRunnerContext): Promise<NodeRunnerResult> {
    const inputField = ctx.nodeConfig['inputField'] as string | undefined
    const dimensions = ctx.nodeConfig['dimensions'] as number | undefined

    // Get text to embed from upstream
    const firstUpstream = ctx.upstreamOutputs.values().next().value
    let textToEmbed: string

    if (inputField && firstUpstream?.data) {
      const resolved = resolveDotPath(firstUpstream.data, inputField)
      textToEmbed = typeof resolved === 'string' ? resolved : JSON.stringify(resolved ?? '')
    } else {
      textToEmbed = firstUpstream?.text ?? ''
    }

    if (!textToEmbed) {
      return {
        output: {
          mediaType: 'text',
          text: '',
          data: { error: 'No text to embed' },
          durationMs: 0,
        },
      }
    }

    if (textToEmbed.length > MAX_INPUT_LENGTH) {
      textToEmbed = textToEmbed.slice(0, MAX_INPUT_LENGTH)
    }

    return {
      output: {
        mediaType: 'text',
        text: `[Embedding request: ${textToEmbed.length} chars]`,
        data: {
          __embedding_request: true,
          textToEmbed,
          textLength: textToEmbed.length,
          dimensions: dimensions ?? null,
        },
        durationMs: 0,
      },
      variableMutations: {
        __embedding_text: textToEmbed,
      },
    }
  }
}

function resolveDotPath(obj: unknown, path: string): unknown {
  if (!path) return obj
  const segments = path.replace(/\[(\d+)]/g, '.$1').split('.').filter(Boolean)
  let current: unknown = obj
  for (const seg of segments) {
    if (current === null || current === undefined || typeof current !== 'object') return undefined
    current = (current as Record<string, unknown>)[seg]
  }
  return current
}
