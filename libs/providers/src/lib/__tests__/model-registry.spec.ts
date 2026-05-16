import { detectProvider, lookupModel, resolveWireModel } from '../model-registry'

describe('model-registry', () => {
  describe('lookupModel', () => {
    it('finds entries by LenserFight canonical key', () => {
      expect(lookupModel('dall-e-4')?.provider).toBe('openai')
      expect(lookupModel('dall-e-4')?.kind).toBe('image')
    })

    it('finds entries by wire model name', () => {
      expect(lookupModel('gpt-image-1')?.provider).toBe('openai')
      expect(lookupModel('claude-sonnet-4-5-20250929')?.provider).toBe('anthropic')
    })

    it('returns null for unknown models', () => {
      expect(lookupModel('unicorn-9001')).toBeNull()
    })
  })

  describe('resolveWireModel', () => {
    it('aliases dall-e-4 → gpt-image-1', () => {
      expect(resolveWireModel('dall-e-4')).toBe('gpt-image-1')
    })

    it('aliases sora-2.0 → sora-2', () => {
      expect(resolveWireModel('sora-2.0')).toBe('sora-2')
    })

    it('aliases imagen-4 → imagen-3.0-generate-002', () => {
      expect(resolveWireModel('imagen-4')).toBe('imagen-3.0-generate-002')
    })

    it('aliases gpt-5.4-pro to a currently-shipping gpt-4o', () => {
      expect(resolveWireModel('gpt-5.4-pro')).toBe('gpt-4o')
    })

    it('passes unknown keys through unchanged', () => {
      expect(resolveWireModel('unicorn-9001')).toBe('unicorn-9001')
    })
  })

  describe('detectProvider', () => {
    it('routes Claude → anthropic', () => {
      expect(detectProvider('claude-opus-4-6')).toBe('anthropic')
    })
    it('routes Gemini → google', () => {
      expect(detectProvider('gemini-2.5-pro')).toBe('google')
    })
    it('routes Sora → openai', () => {
      expect(detectProvider('sora-2.0')).toBe('openai')
    })
    it('returns null for unregistered keys (instead of guessing)', () => {
      expect(detectProvider('mystery-llm')).toBeNull()
    })
  })
})
