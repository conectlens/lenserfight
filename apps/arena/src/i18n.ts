import { ENABLED_LOCALES, DEFAULT_LOCALE } from '@lenserfight/utils/locale'
import { LOCALE_STORAGE_KEY } from '@lenserfight/shared/i18n-routing'
import i18n from 'i18next'
import LanguageDetector from 'i18next-browser-languagedetector'
import { initReactI18next } from 'react-i18next'

import en from './locales/en.json'
import tr from './locales/tr.json'

export const SUPPORTED_LANGUAGES = ENABLED_LOCALES.map((code) => ({ code })) as ReadonlyArray<{
  code: (typeof ENABLED_LOCALES)[number]
}>

export type SupportedLanguage = (typeof ENABLED_LOCALES)[number]

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      tr: { translation: tr },
    },
    fallbackLng: DEFAULT_LOCALE,
    supportedLngs: ENABLED_LOCALES as unknown as string[],
    showSupportNotice: false,
    detection: {
      // The router is authoritative for active locale (see LocaleGuard);
      // the detector only runs for the brief pre-mount paint. Read from
      // localStorage so the FOUC-prevention script in index.html can seed
      // a value from the URL before the bundle parses.
      order: ['localStorage'],
      caches: ['localStorage'],
      lookupLocalStorage: LOCALE_STORAGE_KEY,
    },
    interpolation: {
      escapeValue: false,
    },
  })

export default i18n
