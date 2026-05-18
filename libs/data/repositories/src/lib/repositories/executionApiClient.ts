import { supabase } from '@lenserfight/data/supabase'
import { TriggerExecutionDTO, TriggerExecutionResponse } from '@lenserfight/types'

const SUPABASE_URL = (import.meta.env['SUPABASE_URL'] as string | undefined) ?? 'http://localhost:54321'
const EDGE_BASE = `${SUPABASE_URL}/functions/v1`

// --- Port ---

export interface ExecutionApiClientPort {
  triggerExecution(dto: TriggerExecutionDTO): Promise<TriggerExecutionResponse>
}

// --- Supabase Edge Function Implementation ---

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

    const res = await fetch(`${EDGE_BASE}/trigger-execution`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...authHeader,
      },
      body: JSON.stringify(dto),
    })

    if (!res.ok) {
      const body = await res.text()
      throw new Error(`trigger-execution failed (${res.status}): ${body.slice(0, 300)}`)
    }

    return res.json() as Promise<TriggerExecutionResponse>
  }
}
