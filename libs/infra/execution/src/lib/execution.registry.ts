import { AnthropicProvider } from './providers/anthropic.provider'
import { FalAIProvider } from './providers/fal-ai.provider'
import { GeminiProvider } from './providers/gemini.provider'
import { MistralProvider } from './providers/mistral.provider'
import { OllamaProvider } from './providers/ollama.provider'
import { OpenAIProvider } from './providers/openai.provider'

import type { IExecutionProvider } from './execution.types'

const PROVIDERS: Record<string, () => IExecutionProvider> = {
  'fal-ai': () => new FalAIProvider(),
  gemini: () => new GeminiProvider(),
  openai: () => new OpenAIProvider(),
  anthropic: () => new AnthropicProvider(),
  mistral: () => new MistralProvider(),
  ollama: () => new OllamaProvider(),
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
