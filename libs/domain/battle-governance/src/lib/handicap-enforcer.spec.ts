// HandicapEnforcer tests.
//
// Covers: null passthrough, max_context_tokens clamp, allowed_model_tier
// violation, enforced params unchanged when within cap.

import { describe, it, expect } from 'vitest'
import { enforceHandicap } from './handicap-enforcer'
import type { HandicapParams, HandicapConfig } from './handicap-enforcer'

const BASE_PARAMS: HandicapParams = {
  max_tokens:  2000,
  temperature: 0.7,
  model_tier:  'paid',
}

describe('enforceHandicap', () => {
  describe('null handicap passthrough', () => {
    it('returns original params unchanged when handicap is null', () => {
      const result = enforceHandicap(BASE_PARAMS, null)

      expect(result).toEqual({ max_tokens: 2000, temperature: 0.7 })
    })
  })

  describe('max_context_tokens cap', () => {
    it('clamps max_tokens to max_context_tokens when params exceed cap', () => {
      const handicap: HandicapConfig = { max_context_tokens: 500 }

      const result = enforceHandicap(BASE_PARAMS, handicap)

      expect(result.max_tokens).toBe(500)
    })

    it('leaves max_tokens unchanged when within cap', () => {
      const handicap: HandicapConfig = { max_context_tokens: 4000 }

      const result = enforceHandicap(BASE_PARAMS, handicap)

      expect(result.max_tokens).toBe(2000)
    })

    it('ignores max_context_tokens when it is null', () => {
      const handicap: HandicapConfig = { max_context_tokens: null }

      const result = enforceHandicap(BASE_PARAMS, handicap)

      expect(result.max_tokens).toBe(2000)
    })
  })

  describe('allowed_model_tier cap', () => {
    it('throws handicap_violation when model tier exceeds cap', () => {
      const handicap: HandicapConfig = { allowed_model_tier: 'free' }
      const params: HandicapParams   = { ...BASE_PARAMS, model_tier: 'paid' }

      expect(() => enforceHandicap(params, handicap)).toThrow('handicap_violation')
    })

    it('throws when enterprise model is used with paid cap', () => {
      const handicap: HandicapConfig = { allowed_model_tier: 'paid' }
      const params: HandicapParams   = { ...BASE_PARAMS, model_tier: 'enterprise' }

      expect(() => enforceHandicap(params, handicap)).toThrow('exceeds allowed cap')
    })

    it('does not throw when model tier is within cap', () => {
      const handicap: HandicapConfig = { allowed_model_tier: 'enterprise' }
      const params: HandicapParams   = { ...BASE_PARAMS, model_tier: 'paid' }

      expect(() => enforceHandicap(params, handicap)).not.toThrow()
    })

    it('does not throw when model tier equals cap exactly', () => {
      const handicap: HandicapConfig = { allowed_model_tier: 'paid' }
      const params: HandicapParams   = { ...BASE_PARAMS, model_tier: 'paid' }

      expect(() => enforceHandicap(params, handicap)).not.toThrow()
    })

    it('skips tier check when model_tier is null in params', () => {
      const handicap: HandicapConfig = { allowed_model_tier: 'free' }
      const params: HandicapParams   = { ...BASE_PARAMS, model_tier: null }

      expect(() => enforceHandicap(params, handicap)).not.toThrow()
    })

    it('skips tier check when allowed_model_tier is null in handicap', () => {
      const handicap: HandicapConfig = { allowed_model_tier: null }

      expect(() => enforceHandicap(BASE_PARAMS, handicap)).not.toThrow()
    })
  })

  describe('combined constraints', () => {
    it('applies both clamp and passes tier check in one call', () => {
      const handicap: HandicapConfig = { max_context_tokens: 100, allowed_model_tier: 'paid' }
      const params: HandicapParams   = { max_tokens: 500, temperature: 0.5, model_tier: 'free' }

      const result = enforceHandicap(params, handicap)

      expect(result.max_tokens).toBe(100)
      expect(result.temperature).toBe(0.5)
    })
  })
})
