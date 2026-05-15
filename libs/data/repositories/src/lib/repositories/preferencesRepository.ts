import { LenserPreferences } from '@lenserfight/types'
import { supabase } from '@lenserfight/data/supabase'

export interface PreferencesRepositoryPort {
  getPreferences(): Promise<LenserPreferences | null>
  updatePreferences(patch: Partial<LenserPreferences>): Promise<void>
  updateTheme(theme: 'light' | 'dark' | 'system'): Promise<void>
}

export class SupabasePreferencesRepository implements PreferencesRepositoryPort {
  async getPreferences(): Promise<LenserPreferences | null> {
    try {
      const { data, error } = await supabase.rpc('fn_lensers_get_preferences')
      if (error) return null
      return data as LenserPreferences
    } catch (err) {
      console.warn('Network error fetching preferences', err)
      return null
    }
  }

  async updatePreferences(patch: Partial<LenserPreferences>): Promise<void> {
    try {
      // Exclude read-only / identity fields before sending to RPC
      const { id: _id, lenser_id: _lid, created_at: _ca, updated_at: _ua, ...fields } = patch as Record<string, unknown>

      const { error } = await supabase.rpc('fn_lensers_update_preferences', { p_data: fields })

      if (error) throw error
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      if (msg.includes('NetworkError') || msg.includes('AbortError') || msg.includes('lock request is aborted')) {
        // Transient: network down or Supabase lock stolen during session init — not actionable
        return
      }
      throw err
    }
  }

  async updateTheme(theme: 'light' | 'dark' | 'system'): Promise<void> {
    await this.updatePreferences({ theme })
  }
}
