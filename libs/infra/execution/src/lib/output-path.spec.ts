import { describe, it, expect } from 'vitest'

import { resolveMappedOutputValue } from './output-path'

describe('resolveMappedOutputValue', () => {
  const base = {
    status: 'completed',
    outputData: {
      output: 'flat',
      data: { summary: 'nested summary', nested: { x: 1 } },
    },
    envelope: { output: 'env-fallback', data: { summary: 'from envelope' } } as never,
  }

  it('reads flat keys from outputData', () => {
    expect(resolveMappedOutputValue(base, 'output')).toBe('flat')
  })

  it('follows dotted paths in outputData', () => {
    expect(resolveMappedOutputValue(base, 'data.summary')).toBe('nested summary')
    expect(resolveMappedOutputValue(base, 'data.nested.x')).toBe(1)
  })

  it('falls back to envelope.output for simple keys', () => {
    expect(
      resolveMappedOutputValue({ status: 'completed', outputData: {}, envelope: { output: 'e' } as never }, 'missing'),
    ).toBe('e')
  })
})
