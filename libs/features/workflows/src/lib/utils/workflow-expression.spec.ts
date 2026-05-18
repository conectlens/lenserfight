import { describe, expect, it } from 'vitest'

import { hasWorkflowExpression, parseWorkflowExpression, resolveWorkflowExpression } from './workflow-expression'
import type { UpstreamResultSnapshot } from './workflow-expression'

// ── parseWorkflowExpression ──────────────────────────────────────────────────

describe('parseWorkflowExpression', () => {
  it('returns empty array for empty string', () => {
    expect(parseWorkflowExpression('')).toEqual([])
  })

  it('returns empty array when value has no refs', () => {
    expect(parseWorkflowExpression('hello world')).toEqual([])
  })

  it('returns empty array for plain [[label]] with no dot', () => {
    // Plain [[label]] is an edge-binding, not an upstream ref
    expect(parseWorkflowExpression('[[context]]')).toEqual([])
  })

  it('parses a single [[nodeId.field]] ref', () => {
    const refs = parseWorkflowExpression('[[node1.text]]')
    expect(refs).toHaveLength(1)
    expect(refs[0]).toEqual({ raw: '[[node1.text]]', nodeId: 'node1', fieldPath: 'text' })
  })

  it('parses [[nodeId.nested.path]] ref', () => {
    const refs = parseWorkflowExpression('prefix [[abc123.data.summary]] suffix')
    expect(refs).toHaveLength(1)
    expect(refs[0]).toEqual({
      raw: '[[abc123.data.summary]]',
      nodeId: 'abc123',
      fieldPath: 'data.summary',
    })
  })

  it('parses multiple refs from one string', () => {
    const refs = parseWorkflowExpression('Name: [[nodeA.name]], Score: [[nodeB.data.score]]')
    expect(refs).toHaveLength(2)
    expect(refs[0].nodeId).toBe('nodeA')
    expect(refs[0].fieldPath).toBe('name')
    expect(refs[1].nodeId).toBe('nodeB')
    expect(refs[1].fieldPath).toBe('data.score')
  })

  it('parses refs with hyphen in nodeId', () => {
    const refs = parseWorkflowExpression('[[node-abc.output]]')
    expect(refs).toHaveLength(1)
    expect(refs[0].nodeId).toBe('node-abc')
    expect(refs[0].fieldPath).toBe('output')
  })

  it('is idempotent — calling twice returns same result', () => {
    const val = '[[n1.text]] and [[n2.data.x]]'
    expect(parseWorkflowExpression(val)).toEqual(parseWorkflowExpression(val))
  })
})

// ── hasWorkflowExpression ────────────────────────────────────────────────────

describe('hasWorkflowExpression', () => {
  it('returns false for empty string', () => {
    expect(hasWorkflowExpression('')).toBe(false)
  })

  it('returns false for plain label [[context]]', () => {
    expect(hasWorkflowExpression('[[context]]')).toBe(false)
  })

  it('returns true for [[nodeId.field]]', () => {
    expect(hasWorkflowExpression('[[nodeA.text]]')).toBe(true)
  })

  it('returns true when ref is embedded in a longer string', () => {
    expect(hasWorkflowExpression('Count is [[nodeB.data.count]] items')).toBe(true)
  })
})

// ── resolveWorkflowExpression ────────────────────────────────────────────────

function makeUpstream(entries: Record<string, UpstreamResultSnapshot>): Map<string, UpstreamResultSnapshot> {
  return new Map(Object.entries(entries))
}

describe('resolveWorkflowExpression', () => {
  it('returns value unchanged when no refs present', () => {
    const upstream = makeUpstream({})
    expect(resolveWorkflowExpression('hello', upstream)).toBe('hello')
  })

  it('returns value unchanged for plain [[label]] (no dot)', () => {
    const upstream = makeUpstream({})
    expect(resolveWorkflowExpression('[[context]]', upstream)).toBe('[[context]]')
  })

  it('resolves a simple output field', () => {
    const upstream = makeUpstream({
      node1: { outputData: { text: 'hello world' } },
    })
    expect(resolveWorkflowExpression('[[node1.text]]', upstream)).toBe('hello world')
  })

  it('resolves a dotted path into outputData', () => {
    const upstream = makeUpstream({
      nodeA: { outputData: { data: { summary: 'key insight' } } },
    })
    expect(resolveWorkflowExpression('[[nodeA.data.summary]]', upstream)).toBe('key insight')
  })

  it('resolves from envelope.output when outputData has no match', () => {
    const upstream = makeUpstream({
      nodeA: {
        outputData: {},
        envelope: { kind: 'text', artifactKind: 'text', output: 'fallback output' },
      },
    })
    expect(resolveWorkflowExpression('[[nodeA.output]]', upstream)).toBe('fallback output')
  })

  it('returns empty string for missing nodeId (deleted upstream)', () => {
    const upstream = makeUpstream({})
    expect(resolveWorkflowExpression('[[missingNode.text]]', upstream)).toBe('')
  })

  it('returns empty string when field not found', () => {
    const upstream = makeUpstream({
      nodeA: { outputData: { text: 'hello' } },
    })
    expect(resolveWorkflowExpression('[[nodeA.nonExistentField]]', upstream)).toBe('')
  })

  it('resolves multiple refs in one string', () => {
    const upstream = makeUpstream({
      n1: { outputData: { text: 'Alice' } },
      n2: { outputData: { score: 42 } },
    })
    const result = resolveWorkflowExpression('[[n1.text]] scored [[n2.score]]', upstream)
    expect(result).toBe('Alice scored 42')
  })

  it('stringifies non-string values', () => {
    const upstream = makeUpstream({
      nodeA: { outputData: { count: 5 } },
    })
    expect(resolveWorkflowExpression('count: [[nodeA.count]]', upstream)).toBe('count: 5')
  })

  it('stringifies object values as JSON', () => {
    const upstream = makeUpstream({
      nodeA: { outputData: { data: { x: 1 } } },
    })
    const result = resolveWorkflowExpression('[[nodeA.data]]', upstream)
    expect(result).toBe('{"x":1}')
  })

  it('does not crash on stale reference to deleted node', () => {
    const upstream = makeUpstream({ other: { outputData: { text: 'ok' } } })
    expect(() => resolveWorkflowExpression('prefix [[deletedNode.text]] suffix', upstream)).not.toThrow()
    expect(resolveWorkflowExpression('prefix [[deletedNode.text]] suffix', upstream)).toBe('prefix  suffix')
  })

  it('preserves surrounding text', () => {
    const upstream = makeUpstream({ n1: { outputData: { v: 'X' } } })
    expect(resolveWorkflowExpression('Start [[n1.v]] End', upstream)).toBe('Start X End')
  })
})
