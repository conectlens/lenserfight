/**
 * TranslatorRunner — translate input text to a target language via the configured provider.
 *
 * Config schema (nodeConfig):
 *   targetLanguage: string — destination language (required, e.g. 'French', 'es')
 *   sourceLanguage?: string — source language hint (default: 'auto')
 *
 * Input resolution order: upstream text → upstream data.text → resolvedParams → nodeConfig.text
 */

import type { WorkflowNodeType } from '../execution.types'
import type { INodeRunner, NodeRunnerContext, NodeRunnerResult } from './node-runner.interface'

const MAX_INPUT_CHARS = 20_000

export class TranslatorRunner implements INodeRunner {
  readonly nodeType: WorkflowNodeType = 'translator'

  async execute(ctx: NodeRunnerContext): Promise<NodeRunnerResult> {
    const start = performance.now()

    const targetLanguage = ctx.nodeConfig['targetLanguage'] as string | undefined
    if (!targetLanguage || typeof targetLanguage !== 'string') {
      throw new Error('TranslatorRunner: nodeConfig.targetLanguage is required')
    }

    const sourceLanguage = (ctx.nodeConfig['sourceLanguage'] as string | undefined) ?? 'auto'

    const text = resolveText(ctx)
    if (!text) {
      throw new Error('TranslatorRunner: no text found in upstream outputs or nodeConfig')
    }

    const cappedText = text.length > MAX_INPUT_CHARS ? text.slice(0, MAX_INPUT_CHARS) : text

    const systemPrompt = `Translate the following text to ${targetLanguage}. Return ONLY the translated text.`

    if (!ctx.executeProvider) {
      throw new Error('TranslatorRunner: executeProvider not available in context')
    }

    const result = await ctx.executeProvider({
      prompt: `${systemPrompt}\n\n${cappedText}`,
      params: { ...ctx.resolvedParams },
    })

    const translated = result.text ?? ''
    const durationMs = Math.round(performance.now() - start)

    return {
      output: {
        mediaType: 'text',
        text: translated,
        data: { translatedText: translated, sourceLanguage, targetLanguage },
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
  }
  const paramText = ctx.resolvedParams['text'] ?? ctx.resolvedParams['data']
  if (typeof paramText === 'string' && paramText) return paramText
  const configText = ctx.nodeConfig['text']
  if (typeof configText === 'string' && configText) return configText
  return undefined
}
