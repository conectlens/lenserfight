/**
 * SummarizerRunner — summarize input text via the configured provider.
 *
 * Config schema (nodeConfig):
 *   text?: string — static text to summarize (fallback when no upstream)
 *   maxWords?: number — word cap for the summary (default: 200)
 *   style?: 'bullet' | 'paragraph' — output format (default: 'paragraph')
 *
 * Input resolution order: upstream 'text' key → upstream 'data' key → nodeConfig.text
 * Text is capped at 20,000 chars before being sent to the provider.
 */

import type { WorkflowNodeType } from '../execution.types'
import type { INodeRunner, NodeRunnerContext, NodeRunnerResult } from './node-runner.interface'

const MAX_INPUT_CHARS = 20_000

export class SummarizerRunner implements INodeRunner {
  readonly nodeType: WorkflowNodeType = 'summarizer'

  async execute(ctx: NodeRunnerContext): Promise<NodeRunnerResult> {
    const start = performance.now()

    const maxWords = Math.max(1, Number(ctx.nodeConfig['maxWords'] ?? 200))
    const style = (ctx.nodeConfig['style'] as string) === 'bullet' ? 'bullet' : 'paragraph'

    const text = resolveText(ctx)
    if (!text) {
      throw new Error('SummarizerRunner: no text found in upstream outputs or nodeConfig')
    }

    const cappedText = text.length > MAX_INPUT_CHARS ? text.slice(0, MAX_INPUT_CHARS) : text

    const systemPrompt = `Summarize the following text in at most ${maxWords} words as a ${style}. Return ONLY the summary.`

    if (!ctx.executeProvider) {
      throw new Error('SummarizerRunner: executeProvider not available in context')
    }

    const result = await ctx.executeProvider({
      prompt: `${systemPrompt}\n\n${cappedText}`,
      params: { ...ctx.resolvedParams },
    })

    const summary = result.text ?? ''
    const wordCount = summary.trim() === '' ? 0 : summary.trim().split(/\s+/).length
    const durationMs = Math.round(performance.now() - start)

    return {
      output: {
        mediaType: 'text',
        text: summary,
        data: { summary, wordCount },
        durationMs,
      },
    }
  }
}

function resolveText(ctx: NodeRunnerContext): string | undefined {
  const firstUpstream = ctx.upstreamOutputs.values().next().value
  if (firstUpstream) {
    if (typeof firstUpstream.text === 'string' && firstUpstream.text) return firstUpstream.text
    if (firstUpstream.data && typeof firstUpstream.data['text'] === 'string') return firstUpstream.data['text'] as string
    if (firstUpstream.data && typeof firstUpstream.data['data'] === 'string') return firstUpstream.data['data'] as string
  }
  const paramText = ctx.resolvedParams['text'] ?? ctx.resolvedParams['data']
  if (typeof paramText === 'string' && paramText) return paramText
  const configText = ctx.nodeConfig['text']
  if (typeof configText === 'string' && configText) return configText
  return undefined
}
