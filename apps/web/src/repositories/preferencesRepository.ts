import { LenserPreferences } from '../types/lenser.types'
import { supabase } from '../core/supabase/client'

export interface PreferencesRepositoryPort {
  updateTheme(userId: string, theme: 'light' | 'dark'): Promise<void>
  getPreferences(userId: string): Promise<LenserPreferences | null>
}

export class SupabasePreferencesRepository implements PreferencesRepositoryPort {
  async updateTheme(_userId: string, theme: 'light' | 'dark'): Promise<void> {
    const { data: authData } = await supabase.auth.getUser()
    if (!authData.user) return

    const { data: profile } = await supabase.schema('lensers').from('profiles').select('id, preferences').eq('user_id', authData.user.id).maybeSingle()
    if (!profile) return

    const newPrefs = { ...(profile.preferences as any || {}), theme }

    const { error } = await supabase.schema('lensers').from('profiles').update({ preferences: newPrefs }).eq('id', profile.id)

    if (error) {
      console.error('Failed to secure update theme via RPC', error)
    }
  }

  async getPreferences(_userId: string): Promise<LenserPreferences | null> {
    const { data, error } = await supabase.rpc('fn_lensers_get_preferences')

    if (error) return null
    return data as LenserPreferences
  }
}
