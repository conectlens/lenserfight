import type { SupabaseClient, User } from '@supabase/supabase-js'
import type { ChainabitAiModel, IPartnerProvider, PartnerBalance } from '@lenserfight/infra/partner-provisioning'
import type { PartnerProvisionRecord } from '@lenserfight/types'

interface ProvisionRow {
  external_id: string
  account_id: string | null
  token: string | null
  token_scopes: string[]
  starter_credits: number
}

export class PartnerProvisioningService {
  constructor(private readonly serviceClient: SupabaseClient) {}

  async provision(provider: IPartnerProvider, user: User): Promise<PartnerProvisionRecord> {
    const { data: existing } = await this.serviceClient
      .from('partner_provisions')
      .select('external_id, account_id, token_scopes, starter_credits')
      .eq('user_id', user.id)
      .eq('partner_name', provider.name)
      .maybeSingle<ProvisionRow>()

    if (existing) {
      return this.toRecord(provider, existing)
    }

    const result = await provider.provision({
      id: user.id,
      email: user.email ?? '',
      displayName: user.user_metadata?.['display_name'] as string ?? user.email ?? '',
    })

    await this.serviceClient.from('partner_provisions').upsert({
      user_id: user.id,
      partner_name: provider.name,
      external_id: result.externalId,
      account_id: result.accountId,
      token: result.token,
      token_scopes: result.tokenScopes,
      starter_credits: result.starterCredits,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id,partner_name' })

    return {
      partnerName: provider.name,
      displayName: provider.displayName,
      accountId: result.accountId,
      tokenScopes: result.tokenScopes,
      starterCredits: result.starterCredits,
    }
  }

  async getBalance(provider: IPartnerProvider, userId: string): Promise<PartnerBalance> {
    const { data } = await this.serviceClient
      .from('partner_provisions')
      .select('external_id, token')
      .eq('user_id', userId)
      .eq('partner_name', provider.name)
      .maybeSingle<{ external_id: string; token: string | null }>()

    if (!data?.external_id) throw new Error(`No provision found for partner ${provider.name}`)

    if (provider.getBalanceWithToken && data.token) {
      return provider.getBalanceWithToken(data.token)
    }
    return provider.getBalance(data.external_id)
  }

  async getAiModels(provider: IPartnerProvider, userId: string): Promise<ChainabitAiModel[]> {
    const { data } = await this.serviceClient
      .from('partner_provisions')
      .select('token')
      .eq('user_id', userId)
      .eq('partner_name', provider.name)
      .maybeSingle<{ token: string | null }>()

    if (!data?.token) throw new Error(`No developer token for partner ${provider.name}`)
    if (!provider.getAiModels) throw new Error(`Partner ${provider.name} does not support AI models`)

    return provider.getAiModels(data.token)
  }

  async revokeToken(provider: IPartnerProvider, userId: string): Promise<void> {
    const { data } = await this.serviceClient
      .from('partner_provisions')
      .select('token')
      .eq('user_id', userId)
      .eq('partner_name', provider.name)
      .maybeSingle<{ token: string | null }>()

    if (!data?.token || !provider.revokeToken) return

    await provider.revokeToken(data.token)
    await this.serviceClient
      .from('partner_provisions')
      .update({ token: null, updated_at: new Date().toISOString() })
      .eq('user_id', userId)
      .eq('partner_name', provider.name)
  }

  async refreshToken(provider: IPartnerProvider, userId: string): Promise<{ refreshedAt: string }> {
    const externalId = await this.requireExternalId(provider.name, userId)
    const result = await provider.refreshToken(externalId)
    const refreshedAt = new Date().toISOString()
    await this.serviceClient
      .from('partner_provisions')
      .update({ token: result.token, updated_at: refreshedAt })
      .eq('user_id', userId)
      .eq('partner_name', provider.name)
    return { refreshedAt }
  }

  async sendClaimEmail(provider: IPartnerProvider, userId: string): Promise<void> {
    const externalId = await this.requireExternalId(provider.name, userId)
    await provider.sendClaimEmail(externalId)
  }

  private async requireExternalId(partnerName: string, userId: string): Promise<string> {
    const { data } = await this.serviceClient
      .from('partner_provisions')
      .select('external_id')
      .eq('user_id', userId)
      .eq('partner_name', partnerName)
      .maybeSingle<{ external_id: string }>()

    if (!data?.external_id) {
      throw new Error(`No provision found for partner ${partnerName}`)
    }
    return data.external_id
  }

  private toRecord(provider: IPartnerProvider, row: ProvisionRow): PartnerProvisionRecord {
    return {
      partnerName: provider.name,
      displayName: provider.displayName,
      accountId: row.account_id,
      tokenScopes: row.token_scopes,
      starterCredits: row.starter_credits,
    }
  }
}
