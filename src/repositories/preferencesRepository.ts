import { LenserPreferences } from '../types/lenser.types'
import { storage } from '../utils/storage'
import { supabase } from '../utils/supabase'

export interface PreferencesRepositoryPort {
  updateTheme(userId: string, theme: 'light' | 'dark'): Promise<void>
  getPreferences(userId: string): Promise<LenserPreferences | null>
}

export class MockPreferencesRepository implements PreferencesRepositoryPort {
  private STORAGE_KEY_PREFIX = 'mock_lenser_'

  async updateTheme(theme: 'light' | 'dark'): Promise<void> {
    // Simulate latency
    await new Promise((resolve) => setTimeout(resolve, 300))

    const key = this.STORAGE_KEY_PREFIX + 'key'
    const stored = storage.getItem(key)

    if (stored) {
      const lenser = JSON.parse(stored)
      // Safe merge logic
      lenser.preferences = {
        ...(lenser.preferences || {}),
        theme: theme,
      }
      storage.setItem(key, JSON.stringify(lenser))
    }
  }

  async getPreferences(userId: string): Promise<LenserPreferences | null> {
    await new Promise((resolve) => setTimeout(resolve, 200))
    const stored = storage.getItem(this.STORAGE_KEY_PREFIX + userId)
    if (stored) {
      const lenser = JSON.parse(stored)
      return lenser.preferences || {}
    }
    return null
  }
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
