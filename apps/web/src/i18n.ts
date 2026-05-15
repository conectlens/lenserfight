import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'

import { DEFAULT_LOCALE, ENABLED_LOCALES } from '@lenserfight/utils/locale'
import {
  LOCALE_STORAGE_KEY,
  readLocaleCookie,
  resolveInitialLocale,
} from '@lenserfight/shared/i18n-locale'

import en from './locales/en.json'
import tr from './locales/tr.json'

export const SUPPORTED_LANGUAGES = ENABLED_LOCALES.map((code) => ({ code })) as readonly { code: string }[]
export type SupportedLanguage = (typeof ENABLED_LOCALES)[number]

function readStorage(): string | null {
  if (typeof window === 'undefined') return null
  try {
    return window.localStorage.getItem(LOCALE_STORAGE_KEY)
  } catch {
    return null
  }
}

// Resolve once at module load so the very first render paints in the right
// locale. The LocaleProvider runs the same resolver at mount and (when
// authenticated) overrides this from the user's saved preference.
const initialLocale = resolveInitialLocale({
  cookieValue: readLocaleCookie(),
  storageValue: readStorage(),
  navigatorLanguage:
    typeof navigator !== 'undefined' ? navigator.language : null,
})

i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    tr: { translation: tr },
  },
  fallbackLng: DEFAULT_LOCALE,
  supportedLngs: [...ENABLED_LOCALES],
  lng: initialLocale,
  interpolation: {
    escapeValue: false,
  },
})

export default i18n
