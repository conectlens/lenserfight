import type {
  ChainabitAiModel,
  IPartnerProvider,
  PartnerBalance,
  PartnerProvision,
  PartnerTokenRefreshResult,
} from '../../partner-provider.interface'
import { CHAINABIT_API_URL, CHAINABIT_PARTNER_API_KEY, chainabitUrl } from '@lenserfight/utils/env'

export class ChainbitPartnerProvider implements IPartnerProvider {
  readonly name = 'chainabit'
  readonly displayName = 'Chainabit'

  private readonly apiUrl: string
  private readonly apiKey: string

  constructor() {
    this.apiUrl = CHAINABIT_API_URL()
    this.apiKey = CHAINABIT_PARTNER_API_KEY()
  }

  private authHeader(): Record<string, string> {
    return { Authorization: `ApiKey ${this.apiKey}` }
  }

  private async request<T>(path: string, init: RequestInit = {}): Promise<T> {
    const res = await fetch(`${this.apiUrl}${path}`, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        ...this.authHeader(),
        ...(init.headers as Record<string, string> | undefined),
      },
    })
    if (!res.ok) {
      const body = await res.text()
      throw new Error(`Chainabit API error ${res.status}: ${body}`)
    }
    return res.json() as Promise<T>
  }

  async provision(user: {
    id: string
    email: string
    displayName: string
  }): Promise<PartnerProvision> {
    const data = await this.request<{
      provision_id: string
      account_id: string
      developer_token: string | null
      token_scopes: string[]
      starter_credits_granted: number
      is_new: boolean
    }>('/partner/provisions', {
      method: 'POST',
      body: JSON.stringify({
        email: user.email,
        display_name: user.displayName,
        source_user_id: user.id,
        starter_credits: 100,
        token_scopes: ['execution:run', 'wallet:read'],
      }),
    })

    return {
      externalId: data.provision_id,
      accountId: data.account_id,
      token: data.developer_token,
      tokenScopes: data.token_scopes,
      starterCredits: data.starter_credits_granted,
      isNew: data.is_new,
    }
  }

  async getBalance(externalId: string): Promise<PartnerBalance> {
    const data = await this.request<{
      credits: number
      account_id: string
      currency: string
    }>(`/partner/provisions/${externalId}/balance`)

    return {
      credits: data.credits,
      accountId: data.account_id,
      currency: data.currency,
    }
  }

  async refreshToken(externalId: string): Promise<PartnerTokenRefreshResult> {
    const data = await this.request<{ developer_token: string }>(
      `/partner/provisions/${externalId}/refresh-token`,
      { method: 'POST' },
    )
    return { token: data.developer_token }
  }

  async sendClaimEmail(externalId: string): Promise<void> {
    await this.request(`/partner/provisions/${externalId}/send-claim`, { method: 'POST' })
  }

  async getBalanceWithToken(developerToken: string): Promise<PartnerBalance> {
    const res = await fetch(chainabitUrl('wallet/me'), {
      headers: { Authorization: `Bearer ${developerToken}` },
    })
    if (!res.ok) {
      const body = await res.text()
      throw new Error(`Chainabit wallet/me error ${res.status}: ${body}`)
    }
    const body = await res.json() as { data: { balance: { total: number } } }
    return { credits: body.data.balance.total, accountId: '', currency: 'cr' }
  }

  async getAiModels(developerToken: string): Promise<ChainabitAiModel[]> {
    const res = await fetch(chainabitUrl('ai/models?isActive=true'), {
      headers: { Authorization: `Bearer ${developerToken}` },
    })
    if (!res.ok) {
      const body = await res.text()
      throw new Error(`Chainabit ai/models error ${res.status}: ${body}`)
    }
    const body = await res.json() as { data: ChainabitAiModel[] }
    return body.data
  }

  async revokeToken(developerToken: string): Promise<void> {
    const res = await fetch(`${this.apiUrl}/oauth/revoke`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${developerToken}`,
      },
      body: JSON.stringify({ token: developerToken }),
    })
    if (!res.ok) {
      const body = await res.text()
      throw new Error(`Chainabit oauth/revoke error ${res.status}: ${body}`)
    }
  }
}
