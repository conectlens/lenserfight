import { useCallback } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import {
  DEFAULT_LOCALE,
  getLocaleFromPath,
  isLocaleCode,
  isLocaleEnabled,
  stripLocale,
  withLocale,
  type LocaleCode,
} from '@lenserfight/utils/locale'
import { LOCALE_STORAGE_KEY } from './constants'

export interface UseLocaleResult {
  locale: LocaleCode
  setLocale: (next: LocaleCode) => void
  isSupported: (code: string) => code is LocaleCode
  isEnabled: (code: LocaleCode) => boolean
}

export function useLocale(): UseLocaleResult {
  const params = useParams<{ lang?: string }>()
  const navigate = useNavigate()
  const location = useLocation()

  const fromParam = params.lang
  const fromPath = getLocaleFromPath(location.pathname)
  const locale: LocaleCode = isLocaleCode(fromParam)
    ? fromParam
    : fromPath ?? DEFAULT_LOCALE

  const setLocale = useCallback(
    (next: LocaleCode) => {
      if (!isLocaleCode(next)) return
      try {
        if (typeof window !== 'undefined') {
          window.localStorage.setItem(LOCALE_STORAGE_KEY, next)
        }
      } catch {
        // localStorage may be unavailable (private mode, SSR) — ignore.
      }
      const target =
        withLocale(stripLocale(location.pathname), next) +
        (location.search ?? '') +
        (location.hash ?? '')
      navigate(target, { replace: false })
    },
    [navigate, location.pathname, location.search, location.hash],
  )

  return {
    locale,
    setLocale,
    isSupported: isLocaleCode,
    isEnabled: isLocaleEnabled,
  }
}
