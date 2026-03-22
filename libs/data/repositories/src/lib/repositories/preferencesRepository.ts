import { LenserPreferences } from '@lenserfight/types'
import { supabase } from '@lenserfight/data/supabase'

export interface PreferencesRepositoryPort {
  getPreferences(): Promise<LenserPreferences | null>
  updatePreferences(patch: Partial<LenserPreferences>): Promise<void>
  updateTheme(theme: 'light' | 'dark' | 'system'): Promise<void>
}

export class SupabasePreferencesRepository implements PreferencesRepositoryPort {
  async getPreferences(): Promise<LenserPreferences | null> {
    const { data, error } = await supabase.rpc('fn_lensers_get_preferences')
    if (error) return null
    return data as LenserPreferences
  }

  async updatePreferences(patch: Partial<LenserPreferences>): Promise<void> {
    // Exclude read-only / identity fields before sending to RPC
    const { id: _id, lenser_id: _lid, created_at: _ca, updated_at: _ua, ...fields } = patch as Record<string, unknown>

    const { error } = await supabase.rpc('fn_lensers_update_preferences', { p_data: fields })

    if (error) {
      console.error('Failed to update preferences', error)
      throw error
    }
  }

  async updateTheme(theme: 'light' | 'dark' | 'system'): Promise<void> {
    await this.updatePreferences({ theme })
  }
}
