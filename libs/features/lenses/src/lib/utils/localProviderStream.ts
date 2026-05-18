/**
 * localProviderStream.ts
 *
 * Streams directly from an AI provider (OpenAI, Anthropic, Google, Mistral, Ollama)
 * using a locally decrypted API key — the key is NEVER forwarded to the LenserFight backend.
 *
 * Uses the shared `streamProvider` from @lenserfight/providers, which:
 * - Handles per-provider request construction and auth headers.
 * - Returns a raw ReadableStream<Uint8Array>.
 *
 * This module pumps that stream, parses chunks via the provider's adapter,
 * and dispatches to the walletApiClient-compatible StreamCallbacks interface.
 *
 * Stream formats:
 *   - Ollama: NDJSON (one JSON object per newline)
 *   - All others: SSE (data: ... frames separated by \n\n)
 *
 * Credits are always 0 for local execution — the platform does not bill for BYOK-local runs.
 */
import { streamProvider, getStreamAdapter, OLLAMA_DEFAULT_BASE_URL } from '@lenserfight/providers'
import { generateUUID } from '@lenserfight/utils/text'
import type { ProviderMessage } from '@lenserfight/providers'
import type { StreamCallbacks } from '@lenserfight/types'

export interface LocalStreamRequest {
  provider: string
  model: string
  messages: ProviderMessage[]
  decryptedKey: string
  signal: AbortSignal
  callbacks: StreamCallbacks
}

/** Providers that use NDJSON instead of SSE */
const NDJSON_PROVIDERS = new Set(['ollama'])

function buildCorsFriendlyError(provider: string, status: number, body: string): string {
  if ((status === 401 || status === 403) && provider === 'ollama')
    return `Ollama authentication failed. Cloud models require an API key. Visit ollama.com to sign in and get your key, then add it in Local BYOK settings.`
  if (status === 401 || status === 403)
    return `Authentication failed for ${provider}. Check your API key.`
  if (status === 429)
    return `Rate limit reached for ${provider}. Wait a moment and try again.`
  if (status >= 500)
    return `${provider} server error (${status}). Try again shortly.`
  return `${provider} error (${status}): ${body.slice(0, 200)}`
}

export async function streamLocalProvider(req: LocalStreamRequest): Promise<void> {
  const { provider, model, messages, decryptedKey, signal, callbacks } = req

  let rawStream: ReadableStream<Uint8Array>
  try {
    rawStream = await streamProvider(
      provider as Parameters<typeof streamProvider>[0],
      decryptedKey,
      model,
      messages,
      undefined,
      signal,
    )
  } catch (err: unknown) {
    const msg = (err as Error).message ?? String(err)
    if (msg.includes('Failed to fetch') || msg.includes('NetworkError') || msg.toLowerCase().includes('cors')) {
      callbacks.onError(
        provider === 'ollama'
          ? `Could not connect to Ollama at ${OLLAMA_DEFAULT_BASE_URL}. Is it running? (Make sure CORS is enabled with OLLAMA_ORIGINS="*")`
          : `Network error calling ${provider}. This may be a CORS restriction — some providers block direct browser requests. Error: ${msg}`,
        'local_network_error',
      )
    } else {
      callbacks.onError(msg, 'local_stream_error')
    }
    return
  }

  // Synthetic run ID — local executions are not tracked in the platform DB
  const syntheticRunId = generateUUID()
  callbacks.onStart(syntheticRunId)

  const adapter = getStreamAdapter(provider as Parameters<typeof getStreamAdapter>[0])
  const decoder = new TextDecoder()
  const reader = rawStream.getReader()
  const isNdjson = NDJSON_PROVIDERS.has(provider)

  let buffer = ''
  let totalInputTokens = 0
  let totalOutputTokens = 0
  let lastEventType = ''

  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done || signal.aborted) break
      buffer += decoder.decode(value, { stream: true }).replace(/\r\n/g, '\n')

      if (isNdjson) {
        // NDJSON: split on newlines; each complete line is a full JSON object
        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''
        for (const line of lines) {
          if (!line.trim()) continue
          const chunk = adapter.parseStreamChunk(line)
          if (!chunk) continue
          if (chunk.content) callbacks.onToken(chunk.content)
          if (chunk.usage) {
            totalInputTokens = chunk.usage.input_tokens
            totalOutputTokens = chunk.usage.output_tokens
          }
        }
      } else {
        // SSE: frames separated by \n\n
        const frames = buffer.split('\n\n')
        buffer = frames.pop() ?? ''
        for (const frame of frames) {
          for (const line of frame.split('\n')) {
            if (line.startsWith('event:')) {
              lastEventType = line.slice('event:'.length).trim()
              continue
            }
            if (!line.startsWith('data:')) continue
            const dataStr = line.slice('data:'.length).trim()
            if (dataStr === '[DONE]') continue
            const chunk = adapter.parseStreamChunk(dataStr, lastEventType || undefined)
            if (!chunk) continue
            if (chunk.content) callbacks.onToken(chunk.content)
            if (chunk.usage) {
              totalInputTokens = chunk.usage.input_tokens
              totalOutputTokens = chunk.usage.output_tokens
            }
          }
          lastEventType = ''
        }
      }
    }

    if (!signal.aborted) {
      callbacks.onEnd(
        { input_tokens: totalInputTokens, output_tokens: totalOutputTokens },
        0, // credits = 0 for local execution
      )
    }
  } catch (err: unknown) {
    if ((err as Error).name === 'AbortError') {
      // Caller aborted — do not call onError; caller handles state reset
      return
    }
    callbacks.onError((err as Error).message ?? 'Local stream read error', 'local_stream_read_error')
  } finally {
    reader.releaseLock()
  }
}
