// PromptResolver — unit tests for input binding, merge strategies,
// conditional edge filtering, and prompt template rendering.
import { describe, it, expect } from 'vitest'

import {
  resolveRenderedInputs,
  isEdgeConditionSatisfied,
  renderPrompt,
  replaceTokenVariants,
} from './prompt-resolver'
import { PlaceholderUnboundError } from './validator'

import type { ResolverEdge, ResolverNode, ResolverUpstreamResult } from './prompt-resolver'

// ── Helpers ──────────────────────────────────────────────────────────────────

function completedResult(outputData: Record<string, unknown>): ResolverUpstreamResult {
  return { status: 'completed', outputData }
}

function makeEdge(
  source: string,
  target: string,
  sourceKey = 'output',
  targetLabel = 'input',
  opts: Partial<ResolverEdge> = {},
): ResolverEdge {
  return {
    sourceNodeId: source,
    targetNodeId: target,
    sourceOutputKey: sourceKey,
    targetParamLabel: targetLabel,
    ...opts,
  }
}

// ── resolveRenderedInputs ────────────────────────────────────────────────────

describe('resolveRenderedInputs', () => {
  describe('basic binding', () => {
    it('resolves single edge input from upstream output', () => {
      const node: ResolverNode = { id: 'B' }
      const edges = [makeEdge('A', 'B', 'output', 'prompt')]
      const upstream = new Map([['A', completedResult({ output: 'hello world' })]])

      const result = resolveRenderedInputs(node, edges, upstream, {})
      expect(result.prompt).toBe('hello world')
    })

    it('merges rootInputs with edge values (edges win on conflict)', () => {
      const node: ResolverNode = { id: 'B' }
      const edges = [makeEdge('A', 'B', 'output', 'prompt')]
      const upstream = new Map([['A', completedResult({ output: 'from-edge' })]])

      const result = resolveRenderedInputs(node, edges, upstream, { prompt: 'from-root', extra: 'kept' })
      expect(result.prompt).toBe('from-edge')
      expect(result.extra).toBe('kept')
    })

    it('returns rootInputs when no edges target this node', () => {
      const node: ResolverNode = { id: 'B' }
      const edges = [makeEdge('A', 'C', 'output', 'prompt')] // targets C, not B
      const upstream = new Map([['A', completedResult({ output: 'val' })]])

      const result = resolveRenderedInputs(node, edges, upstream, { topic: 'cats' })
      expect(result.topic).toBe('cats')
    })

    it('sets empty string for edge group with no valid upstream results', () => {
      const node: ResolverNode = { id: 'B' }
      const edges = [makeEdge('A', 'B', 'output', 'input')]
      const upstream = new Map<string, ResolverUpstreamResult>() // A not in map

      const result = resolveRenderedInputs(node, edges, upstream, {})
      expect(result.input).toBe('')
    })

    it('skips upstream results with non-completed status', () => {
      const node: ResolverNode = { id: 'B' }
      const edges = [makeEdge('A', 'B', 'output', 'input')]
      const upstream = new Map([['A', { status: 'failed', outputData: { output: 'nope' } }]])

      const result = resolveRenderedInputs(node, edges, upstream, {})
      expect(result.input).toBe('')
    })
  })

  describe('merge strategies', () => {
    const node: ResolverNode = { id: 'D' }
    const upstream = new Map<string, ResolverUpstreamResult>([
      ['A', completedResult({ output: 'alpha' })],
      ['B', completedResult({ output: 'beta' })],
      ['C', completedResult({ output: 'gamma' })],
    ])

    it('last_write_wins — takes last edge value', () => {
      const edges = [
        makeEdge('A', 'D', 'output', 'input', { mergeStrategy: 'last_write_wins' }),
        makeEdge('B', 'D', 'output', 'input', { mergeStrategy: 'last_write_wins' }),
        makeEdge('C', 'D', 'output', 'input', { mergeStrategy: 'last_write_wins' }),
      ]
      const result = resolveRenderedInputs(node, edges, upstream, {})
      // last_write_wins takes the last value in the collected array
      expect(result.input).toBe('gamma')
    })

    it('concat — joins values with double newline', () => {
      const edges = [
        makeEdge('A', 'D', 'output', 'input', { mergeStrategy: 'concat' }),
        makeEdge('B', 'D', 'output', 'input', { mergeStrategy: 'concat' }),
      ]
      const result = resolveRenderedInputs(node, edges, upstream, {})
      expect(result.input).toBe('alpha\n\nbeta')
    })

    it('array — collects values into array', () => {
      const edges = [
        makeEdge('A', 'D', 'output', 'input', { mergeStrategy: 'array' }),
        makeEdge('B', 'D', 'output', 'input', { mergeStrategy: 'array' }),
        makeEdge('C', 'D', 'output', 'input', { mergeStrategy: 'array' }),
      ]
      const result = resolveRenderedInputs(node, edges, upstream, {})
      expect(result.input).toEqual(['alpha', 'beta', 'gamma'])
    })

    it('json_object — keys values by source node id', () => {
      const edges = [
        makeEdge('A', 'D', 'output', 'input', { mergeStrategy: 'json_object' }),
        makeEdge('B', 'D', 'output', 'input', { mergeStrategy: 'json_object' }),
      ]
      const result = resolveRenderedInputs(node, edges, upstream, {})
      expect(result.input).toEqual({ A: 'alpha', B: 'beta' })
    })

    it('uses node config default merge when edge has no strategy', () => {
      const nodeWithDefault: ResolverNode = { id: 'D', config: { merge: 'array' } }
      const edges = [
        makeEdge('A', 'D', 'output', 'input'),
        makeEdge('B', 'D', 'output', 'input'),
      ]
      const result = resolveRenderedInputs(nodeWithDefault, edges, upstream, {})
      expect(result.input).toEqual(['alpha', 'beta'])
    })

    it('defaults to last_write_wins when no strategy anywhere', () => {
      const edges = [
        makeEdge('A', 'D', 'output', 'input'),
        makeEdge('B', 'D', 'output', 'input'),
      ]
      const result = resolveRenderedInputs(node, edges, upstream, {})
      expect(result.input).toBe('beta')
    })
  })

  describe('param_overrides with upstream refs', () => {
    it('resolves [[nodeId.field]] expressions from upstream', () => {
      const node: ResolverNode = {
        id: 'B',
        config: { param_overrides: { system_prompt: 'Use tone: [[A.tone]]' } },
      }
      const edges: ResolverEdge[] = []
      const upstream = new Map([['A', completedResult({ tone: 'formal' })]])

      const result = resolveRenderedInputs(node, edges, upstream, {})
      expect(result.system_prompt).toBe('Use tone: formal')
    })

    it('replaces missing upstream ref with empty string', () => {
      const node: ResolverNode = {
        id: 'B',
        config: { param_overrides: { x: '[[missing.field]]' } },
      }
      const result = resolveRenderedInputs(node, [], new Map(), {})
      expect(result.x).toBe('')
    })

    it('passes non-string override values directly', () => {
      const node: ResolverNode = {
        id: 'B',
        config: { param_overrides: { count: 42 as unknown as string } },
      }
      const result = resolveRenderedInputs(node, [], new Map(), {})
      expect(result.count).toBe(42)
    })
  })
})

// ── isEdgeConditionSatisfied ─────────────────────────────────────────────────

describe('isEdgeConditionSatisfied', () => {
  const upstream = new Map<string, ResolverUpstreamResult>([
    ['A', completedResult({ output: 'hello', count: 5, empty: '', zero: 0 })],
  ])

  it('returns true when no condition is set', () => {
    const edge = makeEdge('A', 'B', 'output', 'input')
    expect(isEdgeConditionSatisfied(edge, upstream)).toBe(true)
  })

  it('equals — true when values match', () => {
    const edge = makeEdge('A', 'B', 'output', 'input', {
      condition: { type: 'equals', value: 'hello' },
    })
    expect(isEdgeConditionSatisfied(edge, upstream)).toBe(true)
  })

  it('equals — false when values differ', () => {
    const edge = makeEdge('A', 'B', 'output', 'input', {
      condition: { type: 'equals', value: 'world' },
    })
    expect(isEdgeConditionSatisfied(edge, upstream)).toBe(false)
  })

  it('contains — true when source includes substring', () => {
    const edge = makeEdge('A', 'B', 'output', 'input', {
      condition: { type: 'contains', value: 'ell' },
    })
    expect(isEdgeConditionSatisfied(edge, upstream)).toBe(true)
  })

  it('contains — false when types are not strings', () => {
    const edge = makeEdge('A', 'B', 'count', 'input', {
      condition: { type: 'contains', value: '5' },
    })
    expect(isEdgeConditionSatisfied(edge, upstream)).toBe(false)
  })

  it('present — true for non-empty value', () => {
    const edge = makeEdge('A', 'B', 'output', 'input', {
      condition: { type: 'present' },
    })
    expect(isEdgeConditionSatisfied(edge, upstream)).toBe(true)
  })

  it('present — false for empty string', () => {
    const edge = makeEdge('A', 'B', 'empty', 'input', {
      condition: { type: 'present' },
    })
    expect(isEdgeConditionSatisfied(edge, upstream)).toBe(false)
  })

  it('truthy — true for non-zero number', () => {
    const edge = makeEdge('A', 'B', 'count', 'input', {
      condition: { type: 'truthy' },
    })
    expect(isEdgeConditionSatisfied(edge, upstream)).toBe(true)
  })

  it('truthy — false for zero', () => {
    const edge = makeEdge('A', 'B', 'zero', 'input', {
      condition: { type: 'truthy' },
    })
    expect(isEdgeConditionSatisfied(edge, upstream)).toBe(false)
  })

  it('returns false when source node not in upstream map', () => {
    const edge = makeEdge('MISSING', 'B', 'output', 'input', {
      condition: { type: 'present' },
    })
    expect(isEdgeConditionSatisfied(edge, upstream)).toBe(false)
  })

  it('returns false when source node is not completed', () => {
    const failedUpstream = new Map([['A', { status: 'failed', outputData: { output: 'x' } }]])
    const edge = makeEdge('A', 'B', 'output', 'input', {
      condition: { type: 'present' },
    })
    expect(isEdgeConditionSatisfied(edge, failedUpstream)).toBe(false)
  })
})

// ── renderPrompt ─────────────────────────────────────────────────────────────

describe('renderPrompt', () => {
  it('replaces [[label]] with rendered value', () => {
    const result = renderPrompt('Hello [[name]]!', { name: 'World' })
    expect(result).toBe('Hello World!')
  })

  it('replaces {{label}} variant', () => {
    const result = renderPrompt('Say {{greeting}}', { greeting: 'hi' })
    expect(result).toBe('Say hi')
  })

  it('replaces [ label ] with spaces variant', () => {
    const result = renderPrompt('Use [ topic ]', { topic: 'AI' })
    expect(result).toBe('Use AI')
  })

  it('throws PlaceholderUnboundError for unresolved required placeholder', () => {
    expect(() => renderPrompt('Missing [[required_field]]', {})).toThrow(PlaceholderUnboundError)
  })

  it('does not throw for unresolved optional placeholder', () => {
    const contract = { fields: { optional_field: { required: false } } }
    const result = renderPrompt('Has [[optional_field]]', {}, contract as any)
    expect(result).toContain('[[optional_field]]')
  })

  it('handles multiple placeholders in one template', () => {
    const result = renderPrompt('[[a]] and [[b]]', { a: 'X', b: 'Y' })
    expect(result).toBe('X and Y')
  })

  it('serializes non-string values as JSON', () => {
    const result = renderPrompt('Data: [[obj]]', { obj: { key: 'val' } })
    expect(result).toBe('Data: {"key":"val"}')
  })
})

// ── replaceTokenVariants ─────────────────────────────────────────────────────

describe('replaceTokenVariants', () => {
  it('replaces [[key]] and {{key}} variants with same key', () => {
    const result = replaceTokenVariants('[[user_name]] and {{user_name}}', 'user_name', 'Alice')
    expect(result).toBe('Alice and Alice')
  })

  it('replaces normalized key variant (underscore matches space in [ ] pattern)', () => {
    const result = replaceTokenVariants('[ user name ]', 'user_name', 'Alice')
    expect(result).toBe('Alice')
  })

  it('is case-insensitive for spaced bracket variant', () => {
    const result = replaceTokenVariants('[ Topic ]', 'topic', 'science')
    expect(result).toBe('science')
  })
})
