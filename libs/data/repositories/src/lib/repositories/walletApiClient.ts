import { supabase } from '@lenserfight/data/supabase'
import {
  ExecuteByokRequest,
  ExecuteBYOKResponse,
  ExecuteImageRequest,
  ExecuteImageResponse,
  ExecuteRequest,
  ExecuteResponse,
  StreamCallbacks,
  WalletBalance,
  WalletPricingModel,
  WalletTransaction,
} from '@lenserfight/types'
import type { ApiResponseEnvelope } from '@lenserfight/api/contracts'
import { apiFetch, unwrapEnvelope } from '../apiFetch'
import { API_BASE_URL } from '@lenserfight/utils/env'

const API_BASE = API_BASE_URL
const SUPABASE_URL = (import.meta.env['SUPABASE_URL'] as string | undefined) ?? 'http://localhost:54321'
const EDGE_BASE = `${SUPABASE_URL}/functions/v1`

async function getAuthHeader(): Promise<Record<string, string>> {
  const { data } = await supabase.auth.getSession()
  if (!data.session?.access_token) {
    throw new Error('401: Unauthenticated')
  }
  return { Authorization: `Bearer ${data.session.access_token}` }
}

export const walletApiClient = {
  async getBalance(): Promise<WalletBalance> {
    const authHeader = await getAuthHeader()
    const res = await apiFetch(`${EDGE_BASE}/partner-balance`, {
      headers: { ...authHeader },
    })
    return unwrapEnvelope<WalletBalance>(res)
  },

  async getTransactions(
    page = 1,
    limit = 20,
  ): Promise<{ transactions: WalletTransaction[]; total: number; hasNextPage: boolean }> {
    const authHeader = await getAuthHeader()
    const res = await apiFetch(
      `${API_BASE}/wallet/transactions?page=${page}&limit=${limit}`,
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
    const res = await apiFetch(`${API_BASE}/wallet/pricing`, {
      headers: { ...authHeader },
    })
    return unwrapEnvelope<{ models: WalletPricingModel[] }>(res)
  },

  async execute(req: ExecuteRequest): Promise<ExecuteResponse> {
    const authHeader = await getAuthHeader()
    const res = await apiFetch(`${API_BASE}/execute`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...authHeader,
      },
      body: JSON.stringify(req),
    })
    return unwrapEnvelope<ExecuteResponse>(res)
  },

  async executeByok(req: ExecuteByokRequest): Promise<ExecuteBYOKResponse> {
    const authHeader = await getAuthHeader()
    const res = await apiFetch(`${API_BASE}/execute/byok`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...authHeader,
      },
      body: JSON.stringify(req),
    })
    return unwrapEnvelope<ExecuteBYOKResponse>(res)
  },

  async executeImage(req: ExecuteImageRequest): Promise<ExecuteImageResponse> {
    const authHeader = await getAuthHeader()
    const res = await apiFetch(`${API_BASE}/execute/image`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...authHeader,
      },
      body: JSON.stringify(req),
    })
    return unwrapEnvelope<ExecuteImageResponse>(res)
  },

  async streamWithWallet(
    req: ExecuteRequest,
    signal: AbortSignal,
    callbacks: StreamCallbacks,
  ): Promise<void> {
    const authHeader = await getAuthHeader()
    let response: Response
    try {
      response = await apiFetch(`${API_BASE}/execute/stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'text/event-stream',
          ...authHeader,
        },
        body: JSON.stringify(req),
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
          const eventType = evt['event'] as string | undefined ?? lastEventType
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
  },

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
    callbacks.onStart(`byok-${Date.now()}`)
    try {
      const response = await apiFetch(`${API_BASE}/execute/byok`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...authHeader,
        },
        body: JSON.stringify(req),
        signal,
      })
      const payload = await unwrapEnvelope<ExecuteBYOKResponse>(response)
      if (signal.aborted) return
      callbacks.onToken(payload.content ?? '')
      callbacks.onEnd(payload.usage, 0)
    } catch (err: unknown) {
      if ((err as Error).name === 'AbortError') return
      const envelope = err as { error?: { code?: string; message?: string }; code?: string; message?: string }
      const message = envelope?.error?.message ?? envelope?.message ?? 'An unexpected error occurred.'
      const code = envelope?.error?.code ?? envelope?.code ?? 'internal_error'
      callbacks.onError(message, code)
    }
  },
}
