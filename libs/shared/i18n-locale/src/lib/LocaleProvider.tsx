import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import i18next from 'i18next'
import {
  getLocale,
  isLocaleCode,
  isLocaleEnabled,
  type LocaleCode,
} from '@lenserfight/utils/locale'
import { LOCALE_STORAGE_KEY } from './constants'
import { readLocaleCookie, writeLocaleCookie } from './cookie'
import { LocaleContext, type LocaleContextValue } from './LocaleContext'
import { resolveInitialLocale } from './resolver'

export type LocaleChangeSource = 'init' | 'auth' | 'user'

export interface LocaleProviderProps {
  children: ReactNode
  /** Authenticated user's saved locale; null/undefined when anonymous or unknown. */
  authLocale?: string | null
  /** Fires whenever the active locale changes, including init. */
  onLocaleChange?: (next: LocaleCode, previous: LocaleCode, source: LocaleChangeSource) => void
}

function readStorage(): string | null {
  if (typeof window === 'undefined') return null
  try {
    return window.localStorage.getItem(LOCALE_STORAGE_KEY)
  } catch {
    return null
  }
}

function writeStorage(code: LocaleCode): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(LOCALE_STORAGE_KEY, code)
  } catch {
    // Storage unavailable (private mode etc.) — best effort only.
  }
}

function applyDomLocale(code: LocaleCode): void {
  if (typeof document === 'undefined') return
  const def = getLocale(code)
  document.documentElement.lang = code
  document.documentElement.dir = def.direction
}

export function LocaleProvider({ children, authLocale, onLocaleChange }: LocaleProviderProps) {
  const initialLocale = useMemo<LocaleCode>(
    () =>
      resolveInitialLocale({
        profileLocale: authLocale ?? null,
        cookieValue: readLocaleCookie(),
        storageValue: readStorage(),
        navigatorLanguage:
          typeof navigator !== 'undefined' ? navigator.language : null,
      }),
    // Resolve once at mount; subsequent auth changes are handled below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  )
  const [locale, setLocaleState] = useState<LocaleCode>(initialLocale)
  const [isHydrated, setIsHydrated] = useState(false)
  const previousAuthLocale = useRef<string | null | undefined>(authLocale)

  const commitLocale = useCallback(
    (next: LocaleCode, source: LocaleChangeSource) => {
      setLocaleState((previous) => {
        if (next === previous && source !== 'init') return previous
        // Defer side effects so they run after React commits this update,
        // preventing setState-in-render warnings from i18next subscribers.
        queueMicrotask(() => {
          writeLocaleCookie(next)
          writeStorage(next)
          applyDomLocale(next)
          if (i18next.language !== next) {
            void i18next.changeLanguage(next)
          }
          onLocaleChange?.(next, previous, source)
        })
        return next
      })
    },
    [onLocaleChange],
  )

  useEffect(() => {
    commitLocale(initialLocale, 'init')
    setIsHydrated(true)
  }, [commitLocale, initialLocale])

  useEffect(() => {
    if (!isHydrated) return
    if (previousAuthLocale.current === authLocale) return
    previousAuthLocale.current = authLocale
    if (!authLocale) return
    if (!isLocaleCode(authLocale) || !isLocaleEnabled(authLocale)) return
    commitLocale(authLocale, 'auth')
  }, [authLocale, isHydrated, commitLocale])

  const setLocale = useCallback(
    (next: LocaleCode) => {
      if (!isLocaleCode(next) || !isLocaleEnabled(next)) return
      commitLocale(next, 'user')
    },
    [commitLocale],
  )

  const value = useMemo<LocaleContextValue>(
    () => ({ locale, setLocale, isHydrated }),
    [locale, setLocale, isHydrated],
  )

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>
}
