import { useMemo } from 'react'

/** Docs locales that have full content. Must stay in sync with VitePress `locales` config. */
const DOCS_LOCALES = ['en', 'tr', 'es', 'fr', 'de', 'zh', 'ja', 'ko', 'ru', 'pt', 'it'] as const
type DocsLocale = (typeof DOCS_LOCALES)[number]

const STORAGE_KEY = 'lf-language'
const DEFAULT_LOCALE: DocsLocale = 'en'

function resolveDocsLocale(): DocsLocale {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      const base = stored.split('-')[0].toLowerCase()
      if ((DOCS_LOCALES as readonly string[]).includes(base)) return base as DocsLocale
    }
  } catch {
    // localStorage unavailable (SSR, sandboxed iframe, etc.)
  }
  return DEFAULT_LOCALE
}

/**
 * Returns the docs locale prefix (e.g. "en", "tr") that matches the user's
 * stored language preference. Reads localStorage once per render cycle.
 * Information Expert: owns the lf-language → docs locale mapping.
 */
export function useDocsLocale(): DocsLocale {
  return useMemo(resolveDocsLocale, [])
}
