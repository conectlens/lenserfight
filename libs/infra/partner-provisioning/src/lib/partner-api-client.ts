import { supabase } from '@lenserfight/data/supabase'
import { apiFetch, unwrapEnvelope } from '@lenserfight/data/repositories'
import type { PartnerBalance, PartnerProvision, PartnerTokenRefreshResult } from './partner-provider.interface'

if (!import.meta.env.VITE_API_URL) {
  console.warn('[partnerApiClient] VITE_API_URL is not set — partner calls will fail.')
}

const API_BASE = import.meta.env.VITE_API_URL as string

async function getAuthHeader(): Promise<Record<string, string>> {
  const { data } = await supabase.auth.getSession()
  if (!data.session?.access_token) throw new Error('401: Unauthenticated')
  return { Authorization: `Bearer ${data.session.access_token}` }
}

export interface PartnerProvisionRecord {
  partnerName: string
  displayName: string
  accountId: string | null
  tokenScopes: string[]
  starterCredits: number
}

export const partnerApiClient = {
  async provision(partnerName: string): Promise<PartnerProvisionRecord> {
    const authHeader = await getAuthHeader()
    const res = await apiFetch(`${API_BASE}/v1/partners/${partnerName}/provision`, {
      method: 'POST',
      headers: { ...authHeader },
    })
    return unwrapEnvelope<PartnerProvisionRecord>(res)
  },

  async getBalance(partnerName: string): Promise<PartnerBalance> {
    const authHeader = await getAuthHeader()
    const res = await apiFetch(`${API_BASE}/v1/partners/${partnerName}/balance`, {
      headers: { ...authHeader },
    })
    return unwrapEnvelope<PartnerBalance>(res)
  },

  async refreshToken(partnerName: string): Promise<PartnerTokenRefreshResult> {
    const authHeader = await getAuthHeader()
    const res = await apiFetch(`${API_BASE}/v1/partners/${partnerName}/refresh-token`, {
      method: 'POST',
      headers: { ...authHeader },
    })
    return unwrapEnvelope<PartnerTokenRefreshResult>(res)
  },

  async sendClaimEmail(partnerName: string): Promise<void> {
    const authHeader = await getAuthHeader()
    await apiFetch(`${API_BASE}/v1/partners/${partnerName}/send-claim`, {
      method: 'POST',
      headers: { ...authHeader },
    })
  },
}
