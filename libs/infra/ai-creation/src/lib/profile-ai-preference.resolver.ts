import type { SupabaseClient } from '@supabase/supabase-js'
import type { ProfileAIPreference } from './creation.types'

// ─── Fallback ─────────────────────────────────────────────────────────────────
// Used when the profile has no preference set yet, the RPC returns null,
// or the call fails (network error, auth lapse).

export const PREFERENCE_FALLBACK: ProfileAIPreference = {
  fundingSource: 'platform_credit',
  modelId: 'gpt-4o-mini',
  providerId: 'openai',
  selectedKeyRefId: null,
  localKeyId: null,
}

// ─── Resolver ─────────────────────────────────────────────────────────────────

/**
 * Loads the active profile's AI generation preference from the DB and maps it
 * to the {@link ProfileAIPreference} shape used by {@link AICreationService}.
 *
 * Never throws — returns {@link PREFERENCE_FALLBACK} on any error so callers
 * can always proceed with a safe default.
 */
export class ProfileAIPreferenceResolver {
  constructor(private readonly supabase: SupabaseClient) {}

  async resolve(profileId: string): Promise<ProfileAIPreference> {
    try {
      const { data, error } = await this.supabase.rpc('fn_get_profile_ai_preference', {
        p_lenser_id: profileId,
      })

      if (error || !data || typeof data !== 'object') {
        return { ...PREFERENCE_FALLBACK }
      }

      const row = data as {
        default_ai_funding_source?: string | null
        ai_provider_key?: string | null
        ai_model_key?: string | null
        selected_api_key_id?: string | null
        default_ai_local_key_id?: string | null
      }

      const rawFunding = row.default_ai_funding_source
      const fundingSource: ProfileAIPreference['fundingSource'] =
        rawFunding === 'user_byok_cloud' || rawFunding === 'user_byok_local' || rawFunding === 'platform_credit'
          ? rawFunding
          : PREFERENCE_FALLBACK.fundingSource

      return {
        fundingSource,
        modelId: row.ai_model_key?.trim() || PREFERENCE_FALLBACK.modelId,
        providerId: row.ai_provider_key?.trim() || PREFERENCE_FALLBACK.providerId,
        selectedKeyRefId: row.selected_api_key_id ?? null,
        localKeyId: row.default_ai_local_key_id ?? null,
      }
    } catch {
      return { ...PREFERENCE_FALLBACK }
    }
  }
}
