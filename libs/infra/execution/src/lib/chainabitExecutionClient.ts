import { CHAINABIT_API_URL as getChainabitApiUrl, CHAINABIT_PARTNER_API_KEY as getChainabitPartnerApiKey } from '@lenserfight/utils/env'

export interface ChainbitSubmitPayload {
  jobId: string
  battleId: string
  slot: 'A' | 'B'
  prompt: string
  systemPrompt?: string
  providerKey: string
  modelKey: string
  apiKey: string
  maxTokens: number
  temperature: number
}

export interface ChainbitJobStatus {
  externalJobId: string
  status: 'pending' | 'running' | 'completed' | 'failed'
  outputText?: string
  errorMessage?: string
}

async function chainabitFetch<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const apiUrl = getChainabitApiUrl()
  const partnerKey = getChainabitPartnerApiKey()

  const url = `${apiUrl.replace(/\/$/, '')}${path}`
  const res = await fetch(url, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      'X-Partner-Key': partnerKey,
      ...(init.headers ?? {}),
    },
  })

  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`Chainabit API error ${res.status}: ${body}`)
  }

  return res.json() as Promise<T>
}

export const chainabitExecutionClient = {
  async submitJob(payload: ChainbitSubmitPayload): Promise<string> {
    const result = await chainabitFetch<{ external_job_id: string }>('/v1/battle-jobs', {
      method: 'POST',
      body: JSON.stringify({
        partner_job_id: payload.jobId,
        battle_id: payload.battleId,
        slot: payload.slot,
        prompt: payload.prompt,
        system_prompt: payload.systemPrompt ?? null,
        provider_key: payload.providerKey,
        model_key: payload.modelKey,
        api_key: payload.apiKey,
        max_tokens: payload.maxTokens,
        temperature: payload.temperature,
      }),
    })
    return result.external_job_id
  },

  async pollJob(externalJobId: string): Promise<ChainbitJobStatus> {
    return chainabitFetch<ChainbitJobStatus>(`/v1/battle-jobs/${encodeURIComponent(externalJobId)}`)
  },
}
