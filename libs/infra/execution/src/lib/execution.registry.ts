import type { IExecutionProvider } from './execution.types'
import { FalAIProvider } from './providers/fal-ai.provider'
import { GeminiProvider } from './providers/gemini.provider'

const PROVIDERS: Record<string, () => IExecutionProvider> = {
  'fal-ai': () => new FalAIProvider(),
  gemini: () => new GeminiProvider(),
}

export function getExecutionProvider(id: string): IExecutionProvider {
  const factory = PROVIDERS[id]
  if (!factory) {
    throw new Error(`No execution provider registered for id: "${id}". Available: ${Object.keys(PROVIDERS).join(', ')}`)
  }
  return factory()
}

export function registerExecutionProvider(id: string, factory: () => IExecutionProvider): void {
  PROVIDERS[id] = factory
}
