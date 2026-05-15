import type { IExecutionProvider, ExecutionInput, ExecutionResult, MediaType } from '../execution.types'
import { GEMINI_API_KEY } from '@lenserfight/utils/env'

/**
 * Google Gemini provider — text and multimodal generation via @google/genai SDK.
 * @google/genai is already in the monorepo's package.json.
 *
 * modelId examples:
 *   'gemini-2.0-flash'
 *   'gemini-1.5-pro'
 *
 * Multimodal input: pass params.imageUrl to include an inline image part.
 */
export class GeminiProvider implements IExecutionProvider {
  /**
   * Canonical provider id is `google` to match `@lenserfight/providers`. The
   * legacy `gemini` alias is still registered in execution.registry.ts.
   */
  readonly id = 'google'
  readonly supportedMediaTypes: MediaType[] = ['text']

  async execute(modelId: string, input: ExecutionInput): Promise<ExecutionResult> {
    const start = Date.now()

    const { GoogleGenAI } = await import('@google/genai')
    const apiKey =
      String(input.params?.apiKey ?? '') ||
      (typeof process !== 'undefined' ? GEMINI_API_KEY() : '')
    const genAI = new GoogleGenAI({ apiKey })

    const parts: unknown[] = [{ text: input.prompt }]

    if (input.params?.imageUrl && typeof input.params.imageUrl === 'string') {
      parts.push({
        inlineData: {
          mimeType: 'image/jpeg',
          data: input.params.imageUrl, // caller should pass base64 or URL
        },
      })
    }

    const response = await genAI.models.generateContent({
      model: modelId,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      contents: [{ role: 'user', parts }] as any,
    })

    const text = response.text ?? ''
    const durationMs = Date.now() - start

    return {
      mediaType: 'text',
      text,
      durationMs,
      metadata: {
        modelId,
        promptTokenCount: response.usageMetadata?.promptTokenCount,
        candidatesTokenCount: response.usageMetadata?.candidatesTokenCount,
      },
    }
  }
}
