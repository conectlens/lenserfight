import type { Locale, LenserQuote, QuoteContext } from './types'
import { en } from './quotes/en'
import { tr } from './quotes/tr'
import { es } from './quotes/es'
import { fr } from './quotes/fr'
import { de } from './quotes/de'
import { zh } from './quotes/zh'

export type { Locale, LenserQuote, LenserPersona, QuoteContext } from './types'

const registry: Record<Locale, LenserQuote[]> = { en, tr, es, fr, de, zh }

/**
 * Detect the user's preferred locale from environment.
 * Falls back to 'en' if unsupported.
 */
export function detectLocale(): Locale {
  const raw =
    process.env['LF_LOCALE'] ||
    process.env['LANG'] ||
    process.env['LC_ALL'] ||
    'en'
  const code = raw.split(/[._-]/)[0].toLowerCase()
  if (code in registry) return code as Locale
  return 'en'
}

/**
 * Get a quote for a given context and locale.
 * Returns the first matching quote; if no match for the locale, falls back to English.
 * Returns undefined if no quotes exist for the context.
 */
export function getQuote(context: QuoteContext, locale?: Locale): LenserQuote | undefined {
  const lang = locale ?? detectLocale()
  const pool = registry[lang] ?? registry.en
  const match = pool.find((q) => q.context === context)
  if (match) return match
  // Fallback to English if locale has no match
  if (lang !== 'en') return registry.en.find((q) => q.context === context)
  return undefined
}

/**
 * Format a quote for terminal display.
 * Example: `Developer Lenser: "A working local loop beats a perfect diagram."`
 *
 * Returns empty string in CI/JSON/quiet modes.
 */
export function formatQuote(quote: LenserQuote | undefined): string {
  if (!quote) return ''
  if (process.env['CI'] || process.env['LF_QUIET'] === '1') return ''
  const icon = quote.icon ? `${quote.icon} ` : ''
  const persona = quote.persona.charAt(0).toUpperCase() + quote.persona.slice(1)
  return `${icon}${persona} Lenser: "${quote.text}"`
}

/**
 * Get all supported locales.
 */
export function getSupportedLocales(): Locale[] {
  return Object.keys(registry) as Locale[]
}
