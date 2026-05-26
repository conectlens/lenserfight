import { DEFAULT_LOCALE, ENABLED_LOCALES } from '@lenserfight/utils/locale'
import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'


import en from './locales/en.json'
import tr from './locales/tr.json'

const deviceLocale =
  typeof Intl !== 'undefined'
    ? Intl.DateTimeFormat().resolvedOptions().locale?.split('-')[0]
    : undefined

const initialLocale = ENABLED_LOCALES.includes(deviceLocale as never)
  ? deviceLocale
  : DEFAULT_LOCALE

if (!i18n.isInitialized) {
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
}

export default i18n
