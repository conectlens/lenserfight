import { describe, expect, it } from 'vitest'

import { LAYOUT_COLUMN_WIDTH, layoutWorkflowNodes } from './canvas-layout'

const nodes = (...keys: string[]) => keys.map((key) => ({ key }))

describe('layoutWorkflowNodes', () => {
  it('returns nothing for an empty graph', () => {
    expect(layoutWorkflowNodes([], []).size).toBe(0)
  })

  it('places a linear chain in successive columns', () => {
    const positions = layoutWorkflowNodes(nodes('a', 'b', 'c'), [
      { sourceKey: 'a', targetKey: 'b' },
      { sourceKey: 'b', targetKey: 'c' },
    ])
    expect(positions.get('a')?.x).toBe(0)
    expect(positions.get('b')?.x).toBe(LAYOUT_COLUMN_WIDTH)
    expect(positions.get('c')?.x).toBe(LAYOUT_COLUMN_WIDTH * 2)
  })

  it('puts independent roots in the same column without overlapping', () => {
    const positions = layoutWorkflowNodes(nodes('a', 'b'), [])
    expect(positions.get('a')?.x).toBe(positions.get('b')?.x)
    expect(positions.get('a')?.y).not.toBe(positions.get('b')?.y)
  })

  it('places a node after its deepest dependency, not its first', () => {
    // a -> b -> d and a -> d: d must sit past b, not beside it.
    const positions = layoutWorkflowNodes(nodes('a', 'b', 'd'), [
      { sourceKey: 'a', targetKey: 'b' },
      { sourceKey: 'b', targetKey: 'd' },
      { sourceKey: 'a', targetKey: 'd' },
    ])
    expect(positions.get('d')?.x).toBe(LAYOUT_COLUMN_WIDTH * 2)
  })

  it('gives every node a distinct position', () => {
    const positions = layoutWorkflowNodes(nodes('a', 'b', 'c', 'd'), [
      { sourceKey: 'a', targetKey: 'b' },
      { sourceKey: 'a', targetKey: 'c' },
      { sourceKey: 'a', targetKey: 'd' },
    ])
    const seen = new Set([...positions.values()].map((p) => `${p.x}:${p.y}`))
    expect(seen.size).toBe(4)
  })

  it('is deterministic across runs', () => {
    const run = () =>
      [...layoutWorkflowNodes(nodes('a', 'b', 'c'), [{ sourceKey: 'a', targetKey: 'b' }])]
    expect(run()).toEqual(run())
  })

  it('still positions every node when a cycle is present', () => {
    const positions = layoutWorkflowNodes(nodes('a', 'b'), [
      { sourceKey: 'a', targetKey: 'b' },
      { sourceKey: 'b', targetKey: 'a' },
    ])
    expect(positions.size).toBe(2)
  })

  it('ignores edges pointing at unknown nodes', () => {
    const positions = layoutWorkflowNodes(nodes('a'), [
      { sourceKey: 'a', targetKey: 'ghost' },
    ])
    expect(positions.size).toBe(1)
    expect(positions.get('a')?.x).toBe(0)
  })

  it('ignores self edges', () => {
    const positions = layoutWorkflowNodes(nodes('a'), [{ sourceKey: 'a', targetKey: 'a' }])
    expect(positions.get('a')?.x).toBe(0)
  })
})
