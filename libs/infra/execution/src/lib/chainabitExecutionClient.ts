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
    const result = await chainabitFetch<{ sessionId: string }>('/v1/sessions', {
      method: 'POST',
      body: JSON.stringify({
        type: 'lens',
        id: payload.jobId,
        prompt: payload.prompt,
        input: {
          battle_id: payload.battleId,
          slot: payload.slot,
          system_prompt: payload.systemPrompt ?? null,
          provider_key: payload.providerKey,
          model_key: payload.modelKey,
          api_key: payload.apiKey,
          max_tokens: payload.maxTokens,
          temperature: payload.temperature,
        },
        stream: false,
      }),
    })
    return result.sessionId
  },

  async pollJob(sessionId: string): Promise<ChainbitJobStatus> {
    const result = await chainabitFetch<{
      sessionId: string
      status: 'pending' | 'running' | 'awaiting_approval' | 'completed' | 'failed'
      result?: { outputText?: string }
      error?: string
    }>(`/v1/sessions/${encodeURIComponent(sessionId)}/result`)

    return {
      externalJobId: result.sessionId,
      status: result.status === 'awaiting_approval' ? 'running' :
              result.status === 'completed' ? 'completed' :
              result.status === 'failed' ? 'failed' : result.status,
      outputText: result.result?.outputText,
      errorMessage: result.error,
    }
  },
}
