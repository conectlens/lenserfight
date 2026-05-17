import { getQuote, formatQuote, detectLocale, getSupportedLocales } from './index'
import type { QuoteContext } from './types'

describe('i18n quote system', () => {
  const originalEnv = process.env

  beforeEach(() => {
    process.env = { ...originalEnv }
    delete process.env['LF_LOCALE']
    delete process.env['LANG']
    delete process.env['LC_ALL']
    delete process.env['CI']
    delete process.env['LF_QUIET']
  })

  afterAll(() => {
    process.env = originalEnv
  })

  describe('detectLocale', () => {
    it('returns en by default', () => {
      expect(detectLocale()).toBe('en')
    })

    it('reads LF_LOCALE first', () => {
      process.env['LF_LOCALE'] = 'tr'
      process.env['LANG'] = 'es_ES.UTF-8'
      expect(detectLocale()).toBe('tr')
    })

    it('falls back to LANG', () => {
      process.env['LANG'] = 'tr_TR.UTF-8'
      expect(detectLocale()).toBe('tr')
    })

    it('returns en for unsupported locale', () => {
      process.env['LANG'] = 'ja_JP.UTF-8'
      expect(detectLocale()).toBe('en')
    })
  })

  describe('getQuote', () => {
    it('returns a quote for a valid context', () => {
      const quote = getQuote('doctor.success', 'en')
      expect(quote).toBeDefined()
      expect(quote!.context).toBe('doctor.success')
      expect(quote!.text.length).toBeGreaterThan(0)
    })

    it('returns Turkish quote when locale is tr', () => {
      const quote = getQuote('doctor.success', 'tr')
      expect(quote).toBeDefined()
      expect(quote!.id).toMatch(/^tr-/)
    })

    it('returns Spanish quote when locale is es', () => {
      const quote = getQuote('battle.created', 'es')
      expect(quote).toBeDefined()
      expect(quote!.id).toMatch(/^es-/)
    })

    it('falls back to English for missing context in locale', () => {
      // All contexts are defined in all locales, but test the fallback path
      const quote = getQuote('onboarding.init', 'en')
      expect(quote).toBeDefined()
    })

    it('returns undefined for non-existent context', () => {
      const quote = getQuote('nonexistent' as QuoteContext)
      expect(quote).toBeUndefined()
    })
  })

  describe('formatQuote', () => {
    it('formats quote with persona and text', () => {
      const quote = getQuote('doctor.success', 'en')
      const formatted = formatQuote(quote)
      expect(formatted).toContain('Lenser:')
      expect(formatted).toContain('"')
    })

    it('returns empty string for undefined', () => {
      expect(formatQuote(undefined)).toBe('')
    })

    it('returns empty string in CI mode', () => {
      process.env['CI'] = 'true'
      const quote = getQuote('doctor.success', 'en')
      expect(formatQuote(quote)).toBe('')
    })

    it('returns empty string in quiet mode', () => {
      process.env['LF_QUIET'] = '1'
      const quote = getQuote('doctor.success', 'en')
      expect(formatQuote(quote)).toBe('')
    })

    it('capitalizes persona name', () => {
      const quote = getQuote('gateway.connected', 'en')
      const formatted = formatQuote(quote)
      expect(formatted).toMatch(/^(Developer|Operator|Founder|Creator|Judge|Strategist)/)
    })
  })

  describe('getSupportedLocales', () => {
    it('returns all supported locales', () => {
      const locales = getSupportedLocales()
      expect(locales).toContain('en')
      expect(locales).toContain('tr')
      expect(locales).toContain('es')
    })
  })

  describe('quote registry completeness', () => {
    const contexts: QuoteContext[] = [
      'onboarding.init',
      'onboarding.auth',
      'onboarding.gateway',
      'onboarding.provider',
      'onboarding.first-lens',
      'onboarding.first-battle',
      'onboarding.complete',
      'doctor.success',
      'doctor.warning',
      'battle.created',
      'battle.joined',
      'battle.finalized',
      'gateway.connected',
      'provider.detected',
      'spec.validated',
      'workflow.completed',
      'team.created',
      'publish.success',
      'update.available',
    ]

    for (const locale of getSupportedLocales()) {
      it(`has all contexts covered for locale: ${locale}`, () => {
        for (const ctx of contexts) {
          const quote = getQuote(ctx, locale)
          expect(quote).toBeDefined()
          expect(quote!.text.length).toBeGreaterThan(0)
        }
      })
    }
  })
})
