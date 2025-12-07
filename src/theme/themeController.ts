import { storage } from '../utils/storage';
import { getPreferencesRepository } from '../adapters/preferencesAdapter';

export type Theme = 'light' | 'dark';

const repo = getPreferencesRepository();

const THEME_CACHE_TTL_MS = 1000 * 60 * 60 * 24; // 24 hours
const themeCacheKey = (userId: string) => `theme_pref_cache_${userId}`;

interface ThemeCacheEntry {
  theme: Theme;
  fetchedAt: number;
  userId: string;
}

const isValidTheme = (t: any): t is Theme =>
  t === 'light' || t === 'dark';

const applyToDOM = (theme: Theme) => {
  const root = document.documentElement;
  root.classList.remove(theme === 'dark' ? 'light' : 'dark');
  root.classList.add(theme);
};

const getSystemTheme = (): Theme =>
  window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';

const readCache = (userId: string): ThemeCacheEntry | null => {
  try {
    const raw = storage.getItem(themeCacheKey(userId));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || parsed.userId !== userId || !isValidTheme(parsed.theme)) return null;
    return parsed;
  } catch {
    return null;
  }
};

const writeCache = (userId: string, theme: Theme) => {
  const entry: ThemeCacheEntry = {
    theme,
    fetchedAt: Date.now(),
    userId
  };
  storage.setItem(themeCacheKey(userId), JSON.stringify(entry));
};

export const themeController = {
  initTheme: async (userId?: string): Promise<Theme> => {
    // 1) Fast path: localStorage or system
    let resolved = getSystemTheme();

    const ls = storage.getItem('theme');
    if (isValidTheme(ls)) {
      resolved = ls;
    }

    applyToDOM(resolved);

    // 2) Authenticated case → use cached DB preference
    if (userId) {
      const cached = readCache(userId);
      
      if (cached) {
        const age = Date.now() - cached.fetchedAt;
        const isFresh = age < THEME_CACHE_TTL_MS;

        resolved = cached.theme;
        applyToDOM(resolved);
        storage.setItem('theme', resolved);

        if (isFresh) {
          return resolved;
        }

        // stale-while-revalidate → fetch in background
        repo.getPreferences(userId).then(prefs => {
          const dbTheme = prefs?.theme;
          if (isValidTheme(dbTheme)) {
            writeCache(userId, dbTheme);
            applyToDOM(dbTheme);
            storage.setItem('theme', dbTheme);
          }
        });

        return resolved;
      }

      // No cache → fetch from DB
      try {
        const prefs = await repo.getPreferences(userId);
        const dbTheme = prefs?.theme;

        if (isValidTheme(dbTheme)) {
          resolved = dbTheme;
          applyToDOM(resolved);
          storage.setItem('theme', resolved);
          writeCache(userId, resolved);
        } else {
          // Persist current resolved theme to DB (only once)
          repo.updateTheme(userId, resolved);
          writeCache(userId, resolved);
        }
      } catch {
        // fallback to resolved
      }

      return resolved;
    }

    // 3) Unauthenticated
    storage.setItem('theme', resolved);
    return resolved;
  },

  setTheme: (theme: Theme, userId?: string) => {
    if (!isValidTheme(theme)) return;

    applyToDOM(theme);
    storage.setItem('theme', theme);

    if (userId) {
      writeCache(userId, theme);
      repo.updateTheme(userId, theme).catch(() => {});
    }
  }
};
