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

  it('uses type hint tool when creating new bindings', () => {
    const tools = [
      { id: textTool, key: 'text', type: 'text' },
      { id: 'file-tool', key: 'file', type: 'file' },
    ] as Parameters<typeof syncBindingsFromContent>[3]
    const result = syncBindingsFromContent('Attach [[Input PDF:file]]', [], textTool, tools)
    expect(result[0]).toEqual({ label: 'input pdf', toolId: 'file-tool' })
  })

  it('does not override toolId for existing labels', () => {
    const tools = [{ id: 'file-tool', key: 'file', type: 'file' }] as Parameters<
      typeof syncBindingsFromContent
    >[3]
    const existing = [{ label: 'input pdf', toolId: textTool }]
    const result = syncBindingsFromContent('[[Input PDF:file]]', existing, textTool, tools)
    expect(result[0].toolId).toBe(textTool)
  })
})
