import { supabase } from '@lenserfight/data/supabase'
import { UserApiKey, CreateApiKeyDTO } from '@lenserfight/types'

// --- Port (Interface) ---

export interface ApiKeysRepositoryPort {
  getMyKeys(): Promise<UserApiKey[]>
  storeKey(dto: CreateApiKeyDTO): Promise<string>
  revokeKey(keyId: string): Promise<void>
}

// --- Supabase Implementation ---

export class SupabaseApiKeysRepository implements ApiKeysRepositoryPort {
  private mapRow(row: Record<string, unknown>): UserApiKey {
    return {
      id: row.id as string,
      lenserId: row.lenser_id as string,
      providerId: row.provider_id as string,
      providerKey: row.provider_key as string,
      providerDisplayName: row.provider_name as string,
      label: (row.label as string) ?? null,
      keySuffix: row.key_suffix as string,
      isActive: row.is_active as boolean,
      createdAt: row.created_at as string,
      revokedAt: (row.revoked_at as string) ?? null,
    }
  }

  async getMyKeys(): Promise<UserApiKey[]> {
    const { data, error } = await supabase.rpc('fn_get_my_api_keys')

    if (error) throw error
    return (data ?? []).map((row: Record<string, unknown>) => this.mapRow(row))
  }

  async storeKey(dto: CreateApiKeyDTO): Promise<string> {
    const { data, error } = await supabase.rpc('fn_store_api_key', {
      p_provider: dto.provider,
      p_label: dto.label ?? null,
      p_raw_key: dto.rawKey,
    })

    if (error) throw error
    return data as string
  }

  async revokeKey(keyId: string): Promise<void> {
    const { error } = await supabase.rpc('fn_revoke_api_key', {
      p_key_id: keyId,
    })

    if (error) throw error
  }
}
