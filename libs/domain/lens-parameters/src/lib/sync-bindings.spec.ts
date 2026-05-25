import { describe, expect, it } from 'vitest'

import { syncBindingsFromContent } from './sync-bindings'

describe('syncBindingsFromContent', () => {
  const textTool = 'tool-text-uuid'

  it('creates bindings for new tokens with default tool', () => {
    const result = syncBindingsFromContent('Hello [[Topic]]', [], textTool)
    expect(result).toEqual([{ label: 'topic', toolId: textTool }])
  })

  it('preserves toolId for existing labels', () => {
    const existing = [{ label: 'topic', toolId: 'number-tool' }]
    const result = syncBindingsFromContent('[[Topic]]', existing, textTool)
    expect(result[0].toolId).toBe('number-tool')
  })

  it('marks optional from [[label!]] syntax', () => {
    const result = syncBindingsFromContent('[[Notes!]]', [], textTool)
    expect(result[0]).toEqual({ label: 'notes', toolId: textTool, optional: true })
  })
})
