import { supabase } from '@lenserfight/data/supabase'
import { TriggerExecutionDTO, TriggerExecutionResponse } from '@lenserfight/types'
import { apiFetch } from '../apiFetch'
import { VITE_API_BASE_URL } from '@lenserfight/utils/env'

const API_BASE = VITE_API_BASE_URL

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

    // Routes to the internal execution worker (/v1/executions), not the gateway /execute/wallet.
    // apiFetch throws on non-2xx, so no manual ok-check is needed here.
    const res = await apiFetch(`${API_BASE}/v1/executions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...authHeader,
      },
      body: JSON.stringify(dto),
    })

    return res.json() as Promise<TriggerExecutionResponse>
  }
}
