/**
 * Custom Supabase storage adapter implementing "Remember Me" behavior.
 *
 * When rememberMe = true  → tokens stored in localStorage  (survives browser restart)
 * When rememberMe = false → tokens stored in sessionStorage (cleared on tab close)
 *
 * The preference is stored in localStorage under PREF_KEY so it survives page reloads
 * within the session but the auth token itself follows the rememberMe setting.
 *
 * Usage:
 *   rememberMeStorage.setRememberMe(true)  // call before signIn
 *   createClient(url, key, { auth: { storage: rememberMeStorage } })
 */

const PREF_KEY = 'lf_remember_me'

const getRememberMe = (): boolean => {
  try {
    return localStorage.getItem(PREF_KEY) !== 'false'
  } catch {
    return true // default: remember
  }
}

export const rememberMeStorage = {
  setRememberMe(value: boolean): void {
    try {
      localStorage.setItem(PREF_KEY, String(value))
    } catch {
      // storage unavailable — no-op
    }
  },

  getItem(key: string): string | null {
    try {
      if (getRememberMe()) {
        return localStorage.getItem(key)
      }
      // Session-only: check sessionStorage; if missing, check localStorage as fallback
      // (handles the first load before the preference was applied)
      return sessionStorage.getItem(key) ?? localStorage.getItem(key)
    } catch {
      return null
    }
  },

  setItem(key: string, value: string): void {
    try {
      if (getRememberMe()) {
        localStorage.setItem(key, value)
        sessionStorage.removeItem(key) // clear any previous session-only copy
      } else {
        sessionStorage.setItem(key, value)
        localStorage.removeItem(key) // ensure localStorage is cleared
      }
    } catch {
      // storage unavailable — no-op
    }
  },

  removeItem(key: string): void {
    try {
      localStorage.removeItem(key)
      sessionStorage.removeItem(key)
    } catch {
      // storage unavailable — no-op
    }
  },
}
