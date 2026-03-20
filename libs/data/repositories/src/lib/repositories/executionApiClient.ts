import { supabase } from '@lenserfight/data/supabase'
import { TriggerExecutionDTO, TriggerExecutionResponse } from '@lenserfight/types'

if (!import.meta.env.VITE_API_URL) {
  console.warn('[executionApiClient] VITE_API_URL is not set — triggerExecution calls will fail.')
}

const API_BASE = import.meta.env.VITE_API_URL as string

// --- Port ---

export interface ExecutionApiClientPort {
  triggerExecution(dto: TriggerExecutionDTO): Promise<TriggerExecutionResponse>
}

// --- HTTP Implementation ---

export class HttpExecutionApiClient implements ExecutionApiClientPort {
  private async getAuthHeader(): Promise<Record<string, string>> {
    const { data } = await supabase.auth.getSession()
    if (!data.session?.access_token) {
      throw new Error('Unauthenticated: cannot trigger execution without a valid session.')
    }
    return { Authorization: `Bearer ${data.session.access_token}` }
  }

  async triggerExecution(dto: TriggerExecutionDTO): Promise<TriggerExecutionResponse> {
    const authHeader = await this.getAuthHeader()

    const res = await fetch(`${API_BASE}/v1/executions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...authHeader,
      },
      body: JSON.stringify(dto),
    })

    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      const message = (body as { message?: string })?.message ?? `HTTP ${res.status}`
      throw new Error(`[executionApiClient] ${message}`)
    }

    return res.json() as Promise<TriggerExecutionResponse>
  }
}
