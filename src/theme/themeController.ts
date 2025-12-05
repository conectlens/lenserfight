
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
  // Always remove the inverse class to ensure clean state
  root.classList.remove(theme === 'dark' ? 'light' : 'dark');
  root.classList.add(theme);
};

const getSystemTheme = (): Theme => {
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
};

export const themeController = {
  /**
   * Initializes the theme based on the defined precedence rules.
   * 1. Database (Authenticated user preference) - Wins to ensure sync
   * 2. LocalStorage (Session/Device preference)
   * 3. System Preference (Fallback)
   */
  initTheme: async (userId?: string): Promise<Theme> => {
    let resolvedTheme: Theme | null = null;

    // 1. Initial State: Check LocalStorage or System (Synchronous/Fast)
    // This prevents FOUC (Flash of Unstyled Content) before DB returns
    const localTheme = storage.getItem(THEME_KEY);
    
    if (isValidTheme(localTheme)) {
      resolvedTheme = localTheme;
    } else {
      resolvedTheme = getSystemTheme();
    }
    
    // Apply immediate best guess
    applyToDOM(resolvedTheme);

    // 2. Authenticated Sync: Check DB
    if (userId) {
      try {
        const prefs = await repo.getPreferences(userId);
        const dbTheme = prefs?.theme;
        
        if (isValidTheme(dbTheme)) {
          // If DB has a preference, it overrides local/system to ensure cross-device sync
          if (dbTheme !== resolvedTheme) {
            resolvedTheme = dbTheme;
            applyToDOM(resolvedTheme);
            storage.setItem(THEME_KEY, resolvedTheme);
          }
        } else {
          // DB has no preference, persist our current resolved theme to DB
          // Fire and forget DB update to sync this device's choice
          repo.updateTheme(userId, resolvedTheme);
        }
      } catch (e) {
        console.warn('Failed to fetch theme from DB', e);
      }
    } else {
      // Not authenticated, ensure local storage is set to current resolved
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
