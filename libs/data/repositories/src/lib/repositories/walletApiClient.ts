import { supabase } from '@lenserfight/data/supabase'
import { apiFetch } from '../apiFetch'
import {
  WalletBalance,
  WalletCheckoutRequest,
  WalletCheckoutResponse,
  WalletExecuteRequest,
  WalletExecuteResponse,
  WalletProduct,
} from '@lenserfight/types'

if (!import.meta.env.VITE_API_URL) {
  console.warn('[walletApiClient] VITE_API_URL is not set — wallet calls will fail.')
}

const API_BASE = import.meta.env.VITE_API_URL as string

async function getAuthHeader(): Promise<Record<string, string>> {
  const { data } = await supabase.auth.getSession()
  if (!data.session?.access_token) {
    throw new Error('Unauthenticated: cannot call wallet API without a valid session.')
  }
  return { Authorization: `Bearer ${data.session.access_token}` }
}

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    const message = (body as { message?: string })?.message ?? `HTTP ${res.status}`
    throw new Error(`[walletApiClient] ${message}`)
  }
  return res.json() as Promise<T>
}

export const walletApiClient = {
  async getBalance(): Promise<WalletBalance> {
    const authHeader = await getAuthHeader()
    const res = await apiFetch(`${API_BASE}/wallet/balance`, {
      headers: { ...authHeader },
    })
    return handleResponse<WalletBalance>(res)
  },

  async getProducts(): Promise<{ products: WalletProduct[] }> {
    const res = await apiFetch(`${API_BASE}/wallet/products`)
    return handleResponse<{ products: WalletProduct[] }>(res)
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
    return handleResponse<WalletCheckoutResponse>(res)
  },

  async executeWithWallet(req: WalletExecuteRequest): Promise<WalletExecuteResponse> {
    const authHeader = await getAuthHeader()
    const res = await apiFetch(`${API_BASE}/execute/wallet`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...authHeader,
      },
      body: JSON.stringify(req),
    })
    return handleResponse<WalletExecuteResponse>(res)
  },
}
