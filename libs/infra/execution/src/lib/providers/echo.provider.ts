import type { IExecutionProvider, ExecutionInput, ExecutionResult, MediaType } from '../execution.types'

// ─── Echo Provider (AS) — local development / testing only ───────────────────
// Mirrors the input prompt as text output. No API calls.
// Registered when USE_ECHO_PROVIDER=true.

export class EchoProvider implements IExecutionProvider {
  readonly id = 'echo'
  readonly supportedMediaTypes: MediaType[] = ['text', 'image', 'video', 'audio', 'pdf']

  async execute(_modelId: string, input: ExecutionInput): Promise<ExecutionResult> {
    const start = Date.now()
    return {
      mediaType: 'text',
      text: input.prompt,
      mimeType: 'text/plain',
      durationMs: Date.now() - start,
      metadata: { echo: true },
    }
  }
}

export const echoProvider = new EchoProvider()
