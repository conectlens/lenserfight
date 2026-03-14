// Safe storage wrapper to handle SecurityError when localStorage is restricted
const memoryStore = new Map<string, string>()

export const storage = {
  getItem: (key: string): string | null => {
    try {
      return localStorage.getItem(key)
    } catch (e) {
      // Intentionally ignore error and fallback to memory
      return memoryStore.get(key) || null
    }
  },

  setItem: (key: string, value: string): void => {
    try {
      localStorage.setItem(key, value)
    } catch (e) {
      memoryStore.set(key, value)
    }
  },

  removeItem: (key: string): void => {
    try {
      localStorage.removeItem(key)
    } catch (e) {
      memoryStore.delete(key)
    }
  },
}
