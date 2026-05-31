/**
 * ClassifierRunner — classify input text into one of the configured labels.
 *
 * Config schema (nodeConfig):
 *   labels: string[] — classification labels (required, must be non-empty)
 *   text?: string — static text fallback when no upstream provides text
 *   multi?: boolean — allow multi-label output (default: false, reserved for future use)
 *
 * Input resolution order: upstream text → upstream data.text → resolvedParams → nodeConfig.text
 * On JSON parse failure the runner falls back to { category: labels[0], confidence: 0 }.
 */

import type { WorkflowNodeType } from '../execution.types'
import type { INodeRunner, NodeRunnerContext, NodeRunnerResult } from './node-runner.interface'

const MAX_INPUT_CHARS = 20_000

export class ClassifierRunner implements INodeRunner {
  readonly nodeType: WorkflowNodeType = 'classifier'

  async execute(ctx: NodeRunnerContext): Promise<NodeRunnerResult> {
    const start = performance.now()

    const labels = ctx.nodeConfig['labels'] as string[] | undefined
    if (!labels || !Array.isArray(labels) || labels.length === 0) {
      throw new Error('ClassifierRunner: nodeConfig.labels must be a non-empty array')
    }

    const text = resolveText(ctx)
    if (!text) {
      throw new Error('ClassifierRunner: no text found in upstream outputs or nodeConfig')
    }

    const cappedText = text.length > MAX_INPUT_CHARS ? text.slice(0, MAX_INPUT_CHARS) : text

    const systemPrompt = `Classify the following text. Labels: ${labels.join(', ')}. Return ONLY valid JSON: {"category":"<label>","confidence":<0-1>}`

    if (!ctx.executeProvider) {
      throw new Error('ClassifierRunner: executeProvider not available in context')
    }

    const result = await ctx.executeProvider({
      prompt: `${systemPrompt}\n\n${cappedText}`,
      params: { ...ctx.resolvedParams },
    })

    const parsed = tryParseClassification(result.text ?? '', labels)
    const durationMs = Math.round(performance.now() - start)

    return {
      output: {
        mediaType: 'text',
        text: parsed.category,
        data: { category: parsed.category, confidence: parsed.confidence, labels },
        durationMs,
      },
    }
  }
}

interface ClassificationResult {
  category: string
  confidence: number
}

function tryParseClassification(text: string, labels: string[]): ClassificationResult {
  const trimmed = text.trim()
  try {
    const fenceMatch = trimmed.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/)
    const jsonStr = fenceMatch?.[1] ?? trimmed
    const parsed = JSON.parse(jsonStr) as Record<string, unknown>
    const category = typeof parsed['category'] === 'string' ? parsed['category'] : labels[0]
    const confidence = typeof parsed['confidence'] === 'number' ? Math.min(1, Math.max(0, parsed['confidence'])) : 0
    return { category, confidence }
  } catch {
    return { category: labels[0], confidence: 0 }
  }
}

function resolveText(ctx: NodeRunnerContext): string | undefined {
  const firstUpstream = ctx.upstreamOutputs.values().next().value
  if (firstUpstream) {
    if (typeof firstUpstream.text === 'string' && firstUpstream.text) return firstUpstream.text
    if (firstUpstream.data && typeof firstUpstream.data['text'] === 'string') return firstUpstream.data['text'] as string
  }
  const paramText = ctx.resolvedParams['text'] ?? ctx.resolvedParams['data']
  if (typeof paramText === 'string' && paramText) return paramText
  const configText = ctx.nodeConfig['text']
  if (typeof configText === 'string' && configText) return configText
  return undefined
}
