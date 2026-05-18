import { supabase } from '@lenserfight/data/supabase'
import {
  ExecuteByokRequest,
  ExecuteRequest,
  StreamCallbacks,
  WalletBalance,
  WalletPricingModel,
  WalletTransaction,
} from '@lenserfight/types'
import type { ApiResponseEnvelope } from '@lenserfight/api/contracts'
import { apiFetch, unwrapEnvelope } from '../apiFetch'

const SUPABASE_URL = (import.meta.env['SUPABASE_URL'] as string | undefined) ?? 'http://localhost:54321'
const EDGE_BASE = `${SUPABASE_URL}/functions/v1`

async function getAuthHeader(): Promise<Record<string, string>> {
  const { data } = await supabase.auth.getSession()
  if (!data.session?.access_token) {
    throw new Error('401: Unauthenticated')
  }
  return { Authorization: `Bearer ${data.session.access_token}` }
}

// Parses the SSE stream from execute-stream edge function and dispatches to callbacks.
// Expected frames: event: start|token|end|error  +  data: {...}
async function consumeExecuteStream(
  response: Response,
  signal: AbortSignal,
  callbacks: StreamCallbacks,
): Promise<void> {
  const reader = response.body!.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  let lastEventType = ''

  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done || signal.aborted) break
      buffer += decoder.decode(value, { stream: true }).replace(/\r\n/g, '\n')
      const frames = buffer.split('\n\n')
      buffer = frames.pop() ?? ''

      for (const frame of frames) {
        let dataStr = ''
        for (const line of frame.split('\n')) {
          if (line.startsWith('event:')) {
            lastEventType = line.slice('event:'.length).trim()
          } else if (line.startsWith('data:')) {
            dataStr = line.slice('data:'.length).trim()
          }
        }
        if (!dataStr || dataStr === '[DONE]') continue
        let evt: { event?: string; [key: string]: unknown }
        try {
          evt = JSON.parse(dataStr) as { event?: string; [key: string]: unknown }
        } catch {
          continue
        }
        const eventType = (evt['event'] as string | undefined) ?? lastEventType
        if (eventType === 'start') callbacks.onStart(evt['run_id'] as string)
        if (eventType === 'token') callbacks.onToken(evt['content'] as string)
        if (eventType === 'end') {
          callbacks.onEnd(
            evt['usage'] as { input_tokens: number; output_tokens: number },
            evt['credits_charged'] as number,
          )
        }
        if (eventType === 'error') {
          callbacks.onError(evt['message'] as string, evt['code'] as string)
          return
        }
        lastEventType = ''
      }
    }
  } catch (err: unknown) {
    if ((err as Error).name !== 'AbortError') {
      callbacks.onError((err as Error).message ?? 'Stream read error', 'internal_error')
    }
  } finally {
    reader.releaseLock()
  }
}

export const walletApiClient = {
  async getBalance(): Promise<WalletBalance> {
    const authHeader = await getAuthHeader()
    try {
      const res = await apiFetch(`${EDGE_BASE}/partner-balance`, {
        headers: { ...authHeader },
      })
      return unwrapEnvelope<WalletBalance>(res)
    } catch (err: unknown) {
      if (err instanceof TypeError || (err instanceof DOMException && err.name === 'AbortError')) {
        console.warn('[wallet] partner-balance unreachable — returning zero balance')
        return { balance: 0 }
      }
      throw err
    }
  },

  async getTransactions(
    page = 1,
    limit = 20,
  ): Promise<{ transactions: WalletTransaction[]; total: number; hasNextPage: boolean }> {
    const authHeader = await getAuthHeader()
    const res = await apiFetch(
      `${EDGE_BASE}/partner-balance/transactions?page=${page}&limit=${limit}`,
      { headers: { ...authHeader } },
    )
    const envelope = (await res.json()) as ApiResponseEnvelope<WalletTransaction[]>
    if (envelope.error) throw envelope.error
    return {
      transactions: envelope.data ?? [],
      total: envelope.meta?.total ?? 0,
      hasNextPage: envelope.meta?.hasNextPage ?? false,
    }
  },

  async getPricing(): Promise<{ models: WalletPricingModel[] }> {
    const authHeader = await getAuthHeader()
    const res = await apiFetch(`${EDGE_BASE}/partner-balance/pricing`, {
      headers: { ...authHeader },
    })
    return unwrapEnvelope<{ models: WalletPricingModel[] }>(res)
  },

  // ── Streaming — platform credit (uses LenserFight managed keys) ─────────────
  async streamWithWallet(
    req: ExecuteRequest,
    signal: AbortSignal,
    callbacks: StreamCallbacks,
  ): Promise<void> {
    const authHeader = await getAuthHeader()
    let response: Response
    try {
      response = await apiFetch(`${EDGE_BASE}/execute-stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'text/event-stream',
          ...authHeader,
        },
        body: JSON.stringify({
          provider: req.provider,
          model: req.model,
          messages: req.messages,
          funding_source: 'platform_credit',
          ...(req.max_tokens ? { max_tokens: req.max_tokens } : {}),
          ...(req.temperature !== undefined ? { temperature: req.temperature } : {}),
        }),
        signal,
      })
    } catch (err: unknown) {
      if ((err as Error).name === 'AbortError') return
      const envelope = err as { error?: { code?: string; message?: string }; code?: string; message?: string }
      const message = envelope?.error?.message ?? envelope?.message ?? 'An unexpected error occurred.'
      const code = envelope?.error?.code ?? envelope?.code ?? 'internal_error'
      callbacks.onError(message, code)
      return
    }

    await consumeExecuteStream(response, signal, callbacks)
  },

  // ── Streaming — cloud BYOK (key stored in Supabase Vault, resolved server-side) ──
  async streamWithByok(
    req: ExecuteByokRequest,
    signal: AbortSignal,
    callbacks: StreamCallbacks,
  ): Promise<void> {
    if (!req.key_ref_id) {
      callbacks.onError('Cloud BYOK requires a selected key.', 'byok_key_required')
      return
    }
    const authHeader = await getAuthHeader()
    let response: Response
    try {
      response = await apiFetch(`${EDGE_BASE}/execute-stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'text/event-stream',
          ...authHeader,
        },
        body: JSON.stringify({
          provider: req.provider,
          model: req.model,
          messages: req.messages,
          funding_source: 'user_byok_cloud',
          key_ref_id: req.key_ref_id,
          ...(req.max_tokens ? { max_tokens: req.max_tokens } : {}),
          ...(req.temperature !== undefined ? { temperature: req.temperature } : {}),
        }),
        signal,
      })
    } catch (err: unknown) {
      if ((err as Error).name === 'AbortError') return
      const envelope = err as { error?: { code?: string; message?: string }; code?: string; message?: string }
      const message = envelope?.error?.message ?? envelope?.message ?? 'An unexpected error occurred.'
      const code = envelope?.error?.code ?? envelope?.code ?? 'internal_error'
      callbacks.onError(message, code)
      return
    }

    await consumeExecuteStream(response, signal, callbacks)
  },

  // ── Local dev BYOK bypass ────────────────────────────────────────────────────
  // Resolves a cloud vault key to plaintext by calling fn_get_my_key_secret via
  // the authenticated Supabase client. Only valid in local development — every
  // call site MUST be wrapped in `if (import.meta.env.DEV)`.
  async resolveByokKeyForLocalDev(keyRefId: string): Promise<string> {
    if (!import.meta.env.DEV) {
      throw new Error('resolveByokKeyForLocalDev is only available in local development.')
    }
    const { data, error } = await supabase.rpc('fn_get_my_key_secret', { p_key_id: keyRefId })
    if (error) throw new Error(error.message)
    if (!data) throw new Error('Key not found or vault decryption failed.')
    return data as string
  },
}
