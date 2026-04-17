import { AnthropicProvider } from './providers/anthropic.provider'
import { FalAIProvider } from './providers/fal-ai.provider'
import { GeminiProvider } from './providers/gemini.provider'
import { MistralProvider } from './providers/mistral.provider'
import { OllamaProvider } from './providers/ollama.provider'
import { OpenAIProvider } from './providers/openai.provider'
import { PdfExportProvider } from './providers/pdf-export.provider'
import { ResearchProvider } from './providers/research.provider'

import type { IExecutionProvider } from './execution.types'

const PROVIDERS: Record<string, () => IExecutionProvider> = {
  'fal-ai': () => new FalAIProvider(),
  // Canonical key matches @lenserfight/providers. `gemini` retained as a legacy alias.
  google: () => new GeminiProvider(),
  gemini: () => new GeminiProvider(),
  openai: () => new OpenAIProvider(),
  anthropic: () => new AnthropicProvider(),
  mistral: () => new MistralProvider(),
  ollama: () => new OllamaProvider(),
  // Kind-specific orchestrators. See docs/explanation/workflows/open-source-workflows.md.
  research: () => new ResearchProvider(),
  'pdf-export': () => new PdfExportProvider(),
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
