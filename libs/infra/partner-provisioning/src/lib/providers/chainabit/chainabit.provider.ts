import type {
  IPartnerProvider,
  PartnerBalance,
  PartnerProvision,
  PartnerTokenRefreshResult,
} from '../../partner-provider.interface'
import { CHAINABIT_API_URL, CHAINABIT_PARTNER_API_KEY } from '@lenserfight/utils/env'

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
}
