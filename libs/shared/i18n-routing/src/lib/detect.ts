import {
  DEFAULT_LOCALE,
  isLocaleCode,
  isLocaleEnabled,
  type LocaleCode,
} from '@lenserfight/utils/locale'
import { LOCALE_STORAGE_KEY } from './constants'

export function detectLocale(): LocaleCode {
  if (typeof window === 'undefined') return DEFAULT_LOCALE

  try {
    const stored = window.localStorage.getItem(LOCALE_STORAGE_KEY)
    if (stored && isLocaleCode(stored) && isLocaleEnabled(stored)) {
      return stored
    }
  } catch {
    // localStorage may be unavailable — ignore.
  }

  const navLang = window.navigator?.language
  if (navLang) {
    const short = navLang.split('-')[0]
    if (isLocaleCode(short) && isLocaleEnabled(short)) {
      return short
    }
  }

  return DEFAULT_LOCALE
}
