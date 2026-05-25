import { describe, expect, it } from 'vitest'
import type { LensVersionParam } from '@lenserfight/types'

import { normalizeTemplateParamTokens, renderTemplateWithSnapshot } from './render-with-snapshot'

const uuid = '11111111-2222-3333-4444-555555555555'

function vp(label: string, type: LensVersionParam['tool']['type'] = 'text'): LensVersionParam {
  return {
    id: uuid,
    versionId: 'v1',
    label,
    toolId: 't1',
    tool: {
      id: 't1',
      key: label,
      label,
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

describe('renderTemplateWithSnapshot', () => {
  it('substitutes [[label]] with coerced values', () => {
    const out = renderTemplateWithSnapshot(
      'Count: [[count]]',
      { count: 3 },
      [vp('count', 'integer')],
    )
    expect(out).toBe('Count: 3')
  })

  it('resolves [[:uuid]] refs via version params', () => {
    const out = renderTemplateWithSnapshot(
      `Hello [[:${uuid}]]`,
      { topic: 'AI' },
      [vp('topic')],
    )
    expect(out).toBe('Hello AI')
  })

  it('formats boolean for prompt', () => {
    const out = renderTemplateWithSnapshot(
      'Flag: [[enabled]]',
      { enabled: true },
      [vp('enabled', 'boolean')],
    )
    expect(out).toBe('Flag: true')
  })
})

describe('normalizeTemplateParamTokens', () => {
  it('normalizes mixed-case labels in content', () => {
    expect(normalizeTemplateParamTokens('[[Visual Tone]] and [[Mood!]]')).toBe(
      '[[visual tone]] and [[mood!]]',
    )
  })
})
