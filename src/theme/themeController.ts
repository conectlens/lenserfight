
import { storage } from '../utils/storage';
import { getPreferencesRepository } from '../adapters/preferencesAdapter';

export type Theme = 'light' | 'dark';

const THEME_KEY = 'theme';
const repo = getPreferencesRepository();

// Helper: Validate user input/storage against allowed values
const isValidTheme = (value: string | null): value is Theme => {
  return value === 'light' || value === 'dark';
};

// Helper: Apply to DOM
const applyToDOM = (theme: Theme) => {
  const root = document.documentElement;
  if (theme === 'dark') {
    root.classList.add('dark');
  } else {
    root.classList.remove('dark');
  }
};

const getSystemTheme = (): Theme => {
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
};

export const themeController = {
  /**
   * Initializes the theme based on the defined precedence rules.
   * 1. LocalStorage (Highest Priority - Session/Device preference)
   * 2. Database (Authenticated user preference)
   * 3. System Preference (Fallback)
   */
  initTheme: async (userId?: string): Promise<Theme> => {
    // 1. Check LocalStorage (Synchronous/Fast)
    const localTheme = storage.getItem(THEME_KEY);
    
    if (isValidTheme(localTheme)) {
      applyToDOM(localTheme);
      return localTheme;
    }

    // 2. Fallback to System initially to prevent FOUC while fetching DB
    let resolvedTheme = getSystemTheme();
    applyToDOM(resolvedTheme);

    // 3. If Authenticated, check DB
    if (userId) {
      try {
        const prefs = await repo.getPreferences(userId);
        const dbTheme = prefs?.theme;
        
        if (isValidTheme(dbTheme)) {
          resolvedTheme = dbTheme;
          applyToDOM(resolvedTheme); // Apply DB preference
          storage.setItem(THEME_KEY, resolvedTheme); // Cache it
          return resolvedTheme;
        } else {
          // DB has no preference, persist the system one we chose
          storage.setItem(THEME_KEY, resolvedTheme);
          // Fire and forget DB update
          repo.updateTheme(userId, resolvedTheme);
        }
      } catch (e) {
        console.warn('Failed to fetch theme from DB', e);
      }
    } else {
      // Not authenticated, persist system choice to local
      storage.setItem(THEME_KEY, resolvedTheme);
    }

    return resolvedTheme;
  },

  /**
   * Updates the theme globally.
   * Updates DOM, LocalStorage, and asynchronously updates DB if authenticated.
   */
  setTheme: (theme: Theme, userId?: string) => {
    if (!isValidTheme(theme)) return;

    // 1. DOM
    applyToDOM(theme);

    // 2. LocalStorage
    storage.setItem(THEME_KEY, theme);

    // 3. Database (Secure Update)
    if (userId) {
      // Fire and forget - don't block UI
      repo.updateTheme(userId, theme).catch(err => {
        console.error('Failed to persist theme preference', err);
      });
    }
  }
};