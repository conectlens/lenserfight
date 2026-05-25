import { describe, expect, it } from 'vitest'

import {
  extractNamedParamTokens,
  parseParamTokenInner,
} from './parse-param-token'

describe('parseParamTokenInner', () => {
  it('parses plain labels', () => {
    expect(parseParamTokenInner('Topic')).toEqual({ label: 'topic', optional: false })
  })

  it('parses optional marker', () => {
    expect(parseParamTokenInner('Tone!')).toEqual({ label: 'tone', optional: true })
  })

  it('parses type hint', () => {
    expect(parseParamTokenInner('Input PDF:file')).toEqual({
      label: 'input pdf',
      optional: false,
      typeHint: 'file',
    })
  })

  it('parses type hint with optional', () => {
    expect(parseParamTokenInner('Notes:textarea!')).toEqual({
      label: 'notes',
      optional: true,
      typeHint: 'textarea',
    })
  })

  it('treats unknown suffix after colon as part of label', () => {
    expect(parseParamTokenInner('ratio:16')).toEqual({ label: 'ratio:16', optional: false })
  })

  it('rejects uuid ref inner', () => {
    expect(
      parseParamTokenInner(':11111111-2222-3333-4444-555555555555'),
    ).toBeNull()
  })
})

describe('extractNamedParamTokens', () => {
  it('deduplicates and skips uuid refs', () => {
    const uuid = '11111111-2222-3333-4444-555555555555'
    const tokens = extractNamedParamTokens(`[[Topic]] [[:${uuid}]] [[Attachment:file]]`)
    expect(tokens.map((t) => t.label)).toEqual(['topic', 'attachment'])
    expect(tokens.find((t) => t.label === 'attachment')?.typeHint).toBe('file')
  })
})
