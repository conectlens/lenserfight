import { callProvider } from '@lenserfight/providers'

import type { IExecutionProvider, ExecutionInput, ExecutionResult, MediaType } from '../execution.types'

/**
 * Ollama execution provider — delegates to the shared callProvider() adapter.
 * Ollama runs locally (no API key needed). If a custom base URL is required,
 * it can be passed via input.params.baseUrl.
 */
export class OllamaProvider implements IExecutionProvider {
  readonly id = 'ollama'
  readonly supportedMediaTypes: MediaType[] = ['text']

  async execute(modelId: string, input: ExecutionInput): Promise<ExecutionResult> {
    const start = Date.now()

    const response = await callProvider('ollama', '', modelId, [
      { role: 'user', content: input.prompt },
    ])

    const durationMs = Date.now() - start

    return {
      mediaType: 'text',
      text: response.content,
      durationMs,
      metadata: {
        modelId,
        inputTokens: response.usage?.input_tokens,
        outputTokens: response.usage?.output_tokens,
      },
    }
  }
}
