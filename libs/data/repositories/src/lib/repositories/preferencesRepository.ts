import { LenserPreferences } from '@lenserfight/types'
import { supabase } from '@lenserfight/data/supabase'

export interface PreferencesRepositoryPort {
  getPreferences(): Promise<LenserPreferences | null>
  updatePreferences(patch: Partial<LenserPreferences>): Promise<void>
  /**
   * Convenience helper that writes theme to lensers.preferences.
   * Also writes to lensers.profiles.preferences for backward compat until
   * profiles.preferences JSONB is deprecated.
   */
  updateTheme(theme: 'light' | 'dark' | 'system'): Promise<void>
}

export class SupabasePreferencesRepository implements PreferencesRepositoryPort {
  async getPreferences(): Promise<LenserPreferences | null> {
    const { data, error } = await supabase.rpc('fn_lensers_get_preferences')
    if (error) return null
    return data as LenserPreferences
  }

  async updatePreferences(patch: Partial<LenserPreferences>): Promise<void> {
    const { data: authData } = await supabase.auth.getUser()
    if (!authData.user) return

    const { data: profile } = await supabase
      .schema('lensers')
      .from('profiles')
      .select('id')
      .eq('user_id', authData.user.id)
      .maybeSingle()

    if (!profile) return

    // Exclude read-only / identity fields from the patch
    const { id: _id, lenser_id: _lid, created_at: _ca, updated_at: _ua, ...fields } = patch as Record<string, unknown>

    const { error } = await supabase
      .schema('lensers')
      .from('preferences')
      .update(fields)
      .eq('lenser_id', profile.id)

    if (error) {
      console.error('Failed to update preferences', error)
      throw error
    }
  }

  async updateTheme(theme: 'light' | 'dark' | 'system'): Promise<void> {
    // Write to new preferences table
    await this.updatePreferences({ theme })

    // Also keep the old profiles.preferences JSONB in sync for backward compat
    const { data: authData } = await supabase.auth.getUser()
    if (!authData.user) return

    const { data: profile } = await supabase
      .schema('lensers')
      .from('profiles')
      .select('id, preferences')
      .eq('user_id', authData.user.id)
      .maybeSingle()

    if (!profile) return

    const persistedTheme: 'light' | 'dark' =
      theme === 'system'
        ? window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
        : theme

    const newPrefs = { ...((profile.preferences as Record<string, unknown>) ?? {}), theme: persistedTheme }

    await supabase
      .schema('lensers')
      .from('profiles')
      .update({ preferences: newPrefs })
      .eq('id', profile.id)
  }
}
