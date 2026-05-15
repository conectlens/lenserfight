import { useEffect } from 'react'
import { Navigate, Outlet, useLocation, useParams } from 'react-router-dom'
import i18next from 'i18next'
import {
  getLocale,
  isLocaleCode,
  isLocaleEnabled,
} from '@lenserfight/utils/locale'
import { detectLocale } from './detect'

export function LocaleGuard() {
  const { lang } = useParams<{ lang: string }>()
  const location = useLocation()

  const isValid = isLocaleCode(lang) && isLocaleEnabled(lang)

  useEffect(() => {
    if (!isValid || !lang) return
    if (i18next.isInitialized && i18next.language !== lang) {
      void i18next.changeLanguage(lang)
    }
    if (typeof document !== 'undefined') {
      document.documentElement.lang = lang
      document.documentElement.dir = getLocale(lang).direction
    }
  }, [isValid, lang])

  if (!isValid) {
    // The :lang param is not an enabled locale — either an unknown first
    // segment (user typed `/about`) or a stub/unsupported code. Prepend the
    // detected locale to the FULL pathname (don't strip), mirroring the
    // apps/docs `redirectUnprefixedPath` strategy.
    const target =
      `/${detectLocale()}${location.pathname}` +
      (location.search ?? '') +
      (location.hash ?? '')
    return <Navigate to={target} replace />
  }

  return <Outlet />
}
