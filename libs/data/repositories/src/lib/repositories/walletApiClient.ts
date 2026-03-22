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
  WalletCheckoutRequest,
  WalletCheckoutResponse,
  WalletPricingModel,
  WalletProduct,
  WalletTransaction,
} from '@lenserfight/types'
import type { ApiResponseEnvelope } from 'contracts'
import { apiFetch, unwrapEnvelope } from '../apiFetch'

if (!import.meta.env.VITE_API_URL) {
  console.warn('[walletApiClient] VITE_API_URL is not set — wallet calls will fail.')
}

const API_BASE = import.meta.env.VITE_API_URL as string

type WalletProductApi = Omit<WalletProduct, 'id'> & {
  productId: string
}

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
    const res = await apiFetch(`${API_BASE}/wallet/balance`, {
      headers: { ...authHeader },
    })
    return unwrapEnvelope<WalletBalance>(res)
  },

  async getProducts(): Promise<{ products: WalletProduct[] }> {
    const res = await apiFetch(`${API_BASE}/wallet/products`)
    const data = await unwrapEnvelope<{ products: WalletProductApi[] }>(res)
    return {
      products: data.products.map(({ productId, ...product }) => ({
        id: productId,
        ...product,
      })),
    }
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

  async checkout(req: WalletCheckoutRequest): Promise<WalletCheckoutResponse> {
    const authHeader = await getAuthHeader()
    const res = await apiFetch(`${API_BASE}/wallet/checkout`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...authHeader,
      },
      body: JSON.stringify({
        variant_id: req.variantId,
        ...(req.email ? { email: req.email } : {}),
      }),
    })
    const raw = await unwrapEnvelope<{ checkout_url: string; checkout_id: string }>(res)
    return {
      checkoutUrl: raw.checkout_url,
      checkoutId: raw.checkout_id,
    }
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
      const envelope = err as { code?: string; message?: string }
      const message = envelope?.message ?? 'An unexpected error occurred.'
      const code = envelope?.code ?? 'internal_error'
      callbacks.onError(message, code)
      return
    }

    const reader = response.body!.getReader()
    const decoder = new TextDecoder()
    let buffer = ''

    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })
      const events = buffer.split('\n\n')
      buffer = events.pop() ?? ''
      for (const raw of events) {
        const line = raw.replace(/^data: /, '').trim()
        if (!line) continue
        const evt = JSON.parse(line) as { event: string; [key: string]: unknown }
        if (evt.event === 'start') callbacks.onStart(evt['run_id'] as string)
        if (evt.event === 'token') callbacks.onToken(evt['content'] as string)
        if (evt.event === 'end') {
          callbacks.onEnd(
            evt['usage'] as { input_tokens: number; output_tokens: number },
            evt['credits_charged'] as number,
          )
        }
        if (evt.event === 'error') {
          callbacks.onError(evt['message'] as string, evt['code'] as string)
          return
        }
      }
    }
  },
}
