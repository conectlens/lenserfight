import { LenserPreferences } from '../types/lenser.types'
import { supabase } from '../utils/supabase'

export interface PreferencesRepositoryPort {
  updateTheme(userId: string, theme: 'light' | 'dark'): Promise<void>
  getPreferences(userId: string): Promise<LenserPreferences | null>
}

export class SupabasePreferencesRepository implements PreferencesRepositoryPort {
  async updateTheme(theme: 'light' | 'dark'): Promise<void> {
    const { error } = await supabase.rpc('fn_lensers_update_theme', {
      p_theme: theme,
    })

    if (error) {
      console.error('Failed to secure update theme via RPC', error)
    }
  }

  async getPreferences(): Promise<LenserPreferences | null> {
    const { data, error } = await supabase.rpc('fn_lensers_get_preferences')

    if (error) return null
    return data as LenserPreferences
  }
}
