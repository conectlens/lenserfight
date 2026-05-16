import { callProvider } from '@lenserfight/providers'

import type { ContentPart, ProviderMessage } from '@lenserfight/providers'
import type { IExecutionProvider, ExecutionInput, ExecutionResult, MediaType } from '../execution.types'

function buildUserMessage(input: ExecutionInput): ProviderMessage {
  const att = input.attachments ?? []
  if (att.length === 0) {
    return { role: 'user', content: input.prompt }
  }
  const contentParts: ContentPart[] = [{ type: 'text', text: input.prompt }]
  for (const a of att) {
    if (a.kind === 'image') {
      contentParts.push({ type: 'image', url: a.url, mimeType: a.mimeType })
    } else if (a.kind === 'document') {
      contentParts.push({
        type: 'document',
        url: a.url,
        mimeType: a.mimeType ?? 'application/octet-stream',
      })
    } else if (a.kind === 'audio') {
      contentParts.push({ type: 'audio', url: a.url, mimeType: a.mimeType ?? 'audio/mpeg' })
    }
  }
  return { role: 'user', content: contentParts }
}

/**
 * OpenAI execution provider — delegates to the shared callProvider() adapter.
 * API key is passed via input.params.apiKey (BYOK).
 */
export class OpenAIProvider implements IExecutionProvider {
  readonly id = 'openai'
  readonly supportedMediaTypes: MediaType[] = ['text']

  async execute(modelId: string, input: ExecutionInput, signal?: AbortSignal): Promise<ExecutionResult> {
    const start = Date.now()
    const apiKey = String(input.params?.apiKey ?? '')

    const response = await callProvider(
      'openai',
      apiKey,
      modelId,
      [buildUserMessage(input)],
      undefined,
      signal,
    )

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
