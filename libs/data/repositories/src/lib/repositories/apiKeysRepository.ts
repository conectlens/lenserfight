import { supabase } from '@lenserfight/data/supabase'
import { UserApiKey, ByokProvider, CreateApiKeyDTO } from '@lenserfight/types'

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
      provider: row.provider as ByokProvider,
      label: (row.label as string) ?? null,
      keySuffix: row.key_suffix as string,
      isActive: row.is_active as boolean,
      createdAt: row.created_at as string,
      revokedAt: (row.revoked_at as string) ?? null,
    }
  }

  async getMyKeys(): Promise<UserApiKey[]> {
    const { data, error } = await supabase
      .schema('ai')
      .from('user_api_keys')
      .select('id, lenser_id, provider, label, key_suffix, is_active, created_at, revoked_at')
      .eq('is_active', true)
      .order('created_at', { ascending: false })

    if (error) throw error
    return (data ?? []).map((row) => this.mapRow(row as Record<string, unknown>))
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
