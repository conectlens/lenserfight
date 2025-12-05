
import { supabase } from '../utils/supabase';
import { storage } from '../utils/storage';
import { LenserPreferences } from '../types/lenser.types';

export interface PreferencesRepositoryPort {
  updateTheme(userId: string, theme: 'light' | 'dark'): Promise<void>;
  getPreferences(userId: string): Promise<LenserPreferences | null>;
}

export class MockPreferencesRepository implements PreferencesRepositoryPort {
  private STORAGE_KEY_PREFIX = 'mock_lenser_';

  async updateTheme(userId: string, theme: 'light' | 'dark'): Promise<void> {
    // Simulate latency
    await new Promise(resolve => setTimeout(resolve, 300));
    
    const key = this.STORAGE_KEY_PREFIX + userId;
    const stored = storage.getItem(key);
    
    if (stored) {
      const lenser = JSON.parse(stored);
      // Safe merge logic
      lenser.preferences = {
        ...(lenser.preferences || {}),
        theme: theme
      };
      storage.setItem(key, JSON.stringify(lenser));
    }
  }

  async getPreferences(userId: string): Promise<LenserPreferences | null> {
    await new Promise(resolve => setTimeout(resolve, 200));
    const stored = storage.getItem(this.STORAGE_KEY_PREFIX + userId);
    if (stored) {
      const lenser = JSON.parse(stored);
      return lenser.preferences || {};
    }
    return null;
  }
}

export class SupabasePreferencesRepository implements PreferencesRepositoryPort {
  async updateTheme(userId: string, theme: 'light' | 'dark'): Promise<void> {
    // Secure RPC call to perform jsonb_set on the server side.
    // This strictly limits the update to the 'theme' key within the preferences column.
    const { error } = await supabase.rpc('update_lenser_theme', {
      p_user_id: userId,
      p_theme: theme
    });

    if (error) {
        console.error('Failed to secure update theme via RPC', error);
    }
  }

  async getPreferences(userId: string): Promise<LenserPreferences | null> {
    const { data, error } = await supabase
      .from('lensers')
      .select('preferences')
      .eq('user_id', userId)
      .single();

    if (error) return null;
    return data?.preferences as LenserPreferences;
  }
}