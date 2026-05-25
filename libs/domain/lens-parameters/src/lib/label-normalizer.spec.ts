import { describe, expect, it } from 'vitest'

import { normalizeParamLabel, paramTokenBracket } from './label-normalizer'

describe('normalizeParamLabel', () => {
  it('lowercases and preserves spaces', () => {
    expect(normalizeParamLabel('Visual Tone')).toBe('visual tone')
  })

  it('strips optional marker', () => {
    expect(normalizeParamLabel('Mood!')).toBe('mood')
  })

  it('preserves hyphens', () => {
    expect(normalizeParamLabel('color-palette')).toBe('color-palette')
  })
})

describe('paramTokenBracket', () => {
  it('builds optional token', () => {
    expect(paramTokenBracket('mood', true)).toBe('[[mood!]]')
  })

  it('builds typed token with optional', () => {
    expect(paramTokenBracket('input pdf', false, 'file')).toBe('[[input pdf:file]]')
    expect(paramTokenBracket('notes', true, 'textarea')).toBe('[[notes:textarea!]]')
  })
})
