/**
 * i18n configuration for apps/arena.
 *
 * Uses modular namespace-based translation files instead of a single monolithic JSON.
 * Each namespace maps to a page, layout, or feature boundary.
 *
 * @see apps/arena/src/locales/README.md for namespace map and contribution guide.
 */
import { ENABLED_LOCALES, DEFAULT_LOCALE } from '@lenserfight/utils/locale'
import { LOCALE_STORAGE_KEY } from '@lenserfight/shared/i18n-routing'
import i18n from 'i18next'
import LanguageDetector from 'i18next-browser-languagedetector'
import { initReactI18next } from 'react-i18next'

// ── EN namespace imports ───────────────────────────────────────────────────
import enCommon from './locales/en/common.json'
import enNav from './locales/en/nav.json'
import enSeo from './locales/en/seo.json'
import enHome from './locales/en/home.json'
import enAbout from './locales/en/about.json'
import enProduct from './locales/en/product.json'
import enCli from './locales/en/cli.json'
import enDemo from './locales/en/demo.json'
import enFaq from './locales/en/faq.json'
import enGetStarted from './locales/en/getStarted.json'
import enFounderNote from './locales/en/founderNote.json'
import enBattleShowcase from './locales/en/battleShowcase.json'
import enMobile from './locales/en/mobile.json'
import enGamification from './locales/en/gamification.json'
import enForms from './locales/en/forms.json'

// ── TR namespace imports ───────────────────────────────────────────────────
import trCommon from './locales/tr/common.json'
import trNav from './locales/tr/nav.json'
import trSeo from './locales/tr/seo.json'
import trHome from './locales/tr/home.json'
import trAbout from './locales/tr/about.json'
import trProduct from './locales/tr/product.json'
import trCli from './locales/tr/cli.json'
import trDemo from './locales/tr/demo.json'
import trFaq from './locales/tr/faq.json'
import trGetStarted from './locales/tr/getStarted.json'
import trFounderNote from './locales/tr/founderNote.json'
import trBattleShowcase from './locales/tr/battleShowcase.json'
import trMobile from './locales/tr/mobile.json'
import trGamification from './locales/tr/gamification.json'
import trForms from './locales/tr/forms.json'

// ── Namespace registry ─────────────────────────────────────────────────────

export const ARENA_NAMESPACES = [
  'common',
  'nav',
  'seo',
  'home',
  'about',
  'product',
  'cli',
  'demo',
  'faq',
  'getStarted',
  'founderNote',
  'battleShowcase',
  'mobile',
  'gamification',
  'forms',
] as const

export type ArenaNamespace = (typeof ARENA_NAMESPACES)[number]

// ── Language helpers ───────────────────────────────────────────────────────

export const SUPPORTED_LANGUAGES = ENABLED_LOCALES.map((code) => ({
  code,
})) as ReadonlyArray<{ code: (typeof ENABLED_LOCALES)[number] }>

export type SupportedLanguage = (typeof ENABLED_LOCALES)[number]

// ── Init ───────────────────────────────────────────────────────────────────

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: {
        common: enCommon,
        nav: enNav,
        seo: enSeo,
        home: enHome,
        about: enAbout,
        product: enProduct,
        cli: enCli,
        demo: enDemo,
        faq: enFaq,
        getStarted: enGetStarted,
        founderNote: enFounderNote,
        battleShowcase: enBattleShowcase,
        mobile: enMobile,
        gamification: enGamification,
        forms: enForms,
      },
      tr: {
        common: trCommon,
        nav: trNav,
        seo: trSeo,
        home: trHome,
        about: trAbout,
        product: trProduct,
        cli: trCli,
        demo: trDemo,
        faq: trFaq,
        getStarted: trGetStarted,
        founderNote: trFounderNote,
        battleShowcase: trBattleShowcase,
        mobile: trMobile,
        gamification: trGamification,
        forms: trForms,
      },
    },
    ns: ARENA_NAMESPACES as unknown as string[],
    defaultNS: 'common',
    fallbackLng: DEFAULT_LOCALE,
    supportedLngs: ENABLED_LOCALES as unknown as string[],
    detection: {
      order: ['localStorage'],
      caches: ['localStorage'],
      lookupLocalStorage: LOCALE_STORAGE_KEY,
    },
    interpolation: {
      escapeValue: false, // React handles XSS
    },
    returnNull: false,
    // Dev-only: log missing keys to console
    saveMissing: import.meta.env.DEV,
    missingKeyHandler: import.meta.env.DEV
      ? (_lngs: readonly string[], ns: string, key: string) => {
          console.warn(`[i18n] Missing key: ${ns}:${key}`)
        }
      : undefined,
  })

export default i18n
