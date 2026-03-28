import { callProvider } from '@lenserfight/providers'

import type { IExecutionProvider, ExecutionInput, ExecutionResult, MediaType } from '../execution.types'

/**
 * Mistral execution provider — delegates to the shared callProvider() adapter.
 * API key is passed via input.params.apiKey (BYOK).
 */
export class MistralProvider implements IExecutionProvider {
  readonly id = 'mistral'
  readonly supportedMediaTypes: MediaType[] = ['text']

  async execute(modelId: string, input: ExecutionInput): Promise<ExecutionResult> {
    const start = Date.now()
    const apiKey = String(input.params?.apiKey ?? '')

    const response = await callProvider('mistral', apiKey, modelId, [
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
