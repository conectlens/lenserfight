import { describe, it, expect } from 'vitest'

import { createPinnedOutputStore } from './pinned-output'

import type { ExecutionResult } from './execution.types'
import type { PinnedOutput } from './pinned-output'

function makePinned(nodeId: string, text = 'pinned text'): PinnedOutput {
  const output: ExecutionResult = {
    mediaType: 'text',
    text,
    durationMs: 0,
  }
  return { nodeId, output, pinnedAt: new Date().toISOString(), label: 'Test pin' }
}

describe('PinnedOutputStore', () => {
  it('returns undefined for non-pinned nodes', () => {
    const store = createPinnedOutputStore()
    expect(store.get('nonexistent')).toBeUndefined()
  })

  it('stores and retrieves a pinned output', () => {
    const store = createPinnedOutputStore()
    const pin = makePinned('node_1', 'Hello world')

    store.set('node_1', pin)

    const retrieved = store.get('node_1')
    expect(retrieved).toBeDefined()
    expect(retrieved!.output.text).toBe('Hello world')
    expect(retrieved!.label).toBe('Test pin')
  })

  it('replaces an existing pin', () => {
    const store = createPinnedOutputStore()
    store.set('node_1', makePinned('node_1', 'first'))
    store.set('node_1', makePinned('node_1', 'second'))

    expect(store.get('node_1')!.output.text).toBe('second')
  })

  it('clears a single pin', () => {
    const store = createPinnedOutputStore()
    store.set('node_1', makePinned('node_1'))
    store.set('node_2', makePinned('node_2'))

    store.clear('node_1')

    expect(store.get('node_1')).toBeUndefined()
    expect(store.get('node_2')).toBeDefined()
  })

  it('clears all pins', () => {
    const store = createPinnedOutputStore()
    store.set('node_1', makePinned('node_1'))
    store.set('node_2', makePinned('node_2'))
    store.set('node_3', makePinned('node_3'))

    store.clearAll()

    expect(store.get('node_1')).toBeUndefined()
    expect(store.get('node_2')).toBeUndefined()
    expect(store.get('node_3')).toBeUndefined()
    expect(store.pinnedNodeIds()).toHaveLength(0)
  })

  it('lists all pinned node IDs', () => {
    const store = createPinnedOutputStore()
    store.set('a', makePinned('a'))
    store.set('b', makePinned('b'))
    store.set('c', makePinned('c'))

    const ids = store.pinnedNodeIds()
    expect(ids).toHaveLength(3)
    expect(ids).toContain('a')
    expect(ids).toContain('b')
    expect(ids).toContain('c')
  })

  it('handles media pinned output', () => {
    const store = createPinnedOutputStore()
    const mediaPin: PinnedOutput = {
      nodeId: 'img_node',
      output: {
        mediaType: 'image',
        url: 'https://example.com/image.png',
        mimeType: 'image/png',
        bytes: 102400,
        durationMs: 3000,
      },
      pinnedAt: new Date().toISOString(),
    }

    store.set('img_node', mediaPin)

    const retrieved = store.get('img_node')
    expect(retrieved!.output.mediaType).toBe('image')
    expect(retrieved!.output.url).toBe('https://example.com/image.png')
  })
})
