import { describe, expect, it } from 'vitest'
import type { LensVersionParam } from '@lenserfight/types'

import { coerceParamValue, formatParamForPrompt } from './coerce-param-value'

function param(type: LensVersionParam['tool']['type']): LensVersionParam {
  return {
    id: 'p1',
    versionId: 'v1',
    label: 'count',
    toolId: 't1',
    tool: {
      id: 't1',
      key: 'count',
      label: 'count',
      description: null,
      category: 'input',
      type,
      required: true,
      minLength: 0,
      maxLength: 0,
      placeholder: null,
      helpText: null,
      validationSchema: null,
      options: null,
      sortOrder: 0,
      isSystem: false,
      icon: null,
      color: null,
    },
  }
}

describe('coerceParamValue', () => {
  it('coerces boolean', () => {
    expect(coerceParamValue('true', param('boolean'))).toBe(true)
    expect(coerceParamValue(0, param('boolean'))).toBe(false)
  })

  it('coerces integer', () => {
    expect(coerceParamValue('42', param('integer'))).toBe(42)
  })

  it('coerces multiselect to array', () => {
    expect(coerceParamValue(['a', 'b'], param('multiselect'))).toEqual(['a', 'b'])
  })
})

describe('formatParamForPrompt', () => {
  it('formats boolean as true/false strings', () => {
    expect(formatParamForPrompt(true, param('boolean'))).toBe('true')
    expect(formatParamForPrompt(false, param('boolean'))).toBe('false')
  })

  it('joins multiselect values', () => {
    expect(formatParamForPrompt(['a', 'b'], param('multiselect'))).toBe('a, b')
  })
})
