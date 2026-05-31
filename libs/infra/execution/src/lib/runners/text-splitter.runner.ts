/**
 * TextSplitterRunner — split a text string into chunks (pure function, no I/O).
 *
 * Config schema (nodeConfig):
 *   splitBy?: 'separator' | 'characters' — split strategy (default: 'separator')
 *   separator?: string — delimiter for separator mode (default: '\n\n')
 *   chunkSize?: number — max chars per chunk in characters mode (default: 1000)
 *   overlap?: number — char overlap between adjacent chunks (default: 0)
 *
 * Limits: input capped at 10,000 chars, max 500 chunks emitted.
 * No provider call — pure synchronous logic.
 */

import type { WorkflowNodeType } from '../execution.types'
import type { INodeRunner, NodeRunnerContext, NodeRunnerResult } from './node-runner.interface'

const MAX_INPUT_CHARS = 10_000
const MAX_CHUNKS = 500

export class TextSplitterRunner implements INodeRunner {
  readonly nodeType: WorkflowNodeType = 'text_splitter'

  async execute(ctx: NodeRunnerContext): Promise<NodeRunnerResult> {
    const splitBy = (ctx.nodeConfig['splitBy'] as string) === 'characters' ? 'characters' : 'separator'
    const separator = typeof ctx.nodeConfig['separator'] === 'string' ? ctx.nodeConfig['separator'] as string : '\n\n'
    const chunkSize = Math.max(1, Number(ctx.nodeConfig['chunkSize'] ?? 1000))
    const overlap = Math.max(0, Math.min(Number(ctx.nodeConfig['overlap'] ?? 0), chunkSize - 1))

    const rawText = ctx.resolvedParams['text'] ?? ctx.upstreamOutputs.values().next().value?.text
    if (typeof rawText !== 'string') {
      throw new Error('TextSplitterRunner: upstream text input must be a string')
    }

    const text = rawText.length > MAX_INPUT_CHARS ? rawText.slice(0, MAX_INPUT_CHARS) : rawText

    let chunks: string[]
    if (splitBy === 'separator') {
      chunks = text.split(separator).map((s) => s.trim()).filter(Boolean)
    } else {
      chunks = []
      const step = chunkSize - overlap
      for (let i = 0; i < text.length; i += step) {
        chunks.push(text.slice(i, i + chunkSize))
        if (chunks.length >= MAX_CHUNKS) break
      }
    }

    if (chunks.length > MAX_CHUNKS) {
      chunks = chunks.slice(0, MAX_CHUNKS)
    }

    return {
      output: {
        mediaType: 'text',
        text: String(chunks.length),
        data: { chunks, count: chunks.length },
        durationMs: 0,
      },
    }
  }
}
