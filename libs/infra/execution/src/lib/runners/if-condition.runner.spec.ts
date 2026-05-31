import { describe, it, expect } from 'vitest'

import { IfConditionRunner } from './if-condition.runner'

import type { IfOperator } from './if-condition.runner'
import type { NodeRunnerContext } from './node-runner.interface'
import type { ExecutionResult } from '../execution.types'

function ctxWith(
  nodeConfig: Record<string, unknown>,
  upstream?: ExecutionResult,
): NodeRunnerContext {
  return {
    nodeId: 'if1',
    upstreamOutputs: upstream ? new Map([['n1', upstream]]) : new Map(),
    resolvedParams: {},
    nodeConfig,
  }
}

describe('IfConditionRunner', () => {
  const runner = new IfConditionRunner()

  it('declares node type as if_condition', () => {
    expect(runner.nodeType).toBe('if_condition')
  })

  // ── Branch resolution (the core fix: false must actually be emitted) ──
  const branchCases: Array<{
    name: string
    operator: IfOperator
    value: unknown
    text: string
    expected: 'true' | 'false'
  }> = [
    { name: 'equals match → true', operator: 'equals', value: 'go', text: 'go', expected: 'true' },
    { name: 'equals miss → false', operator: 'equals', value: 'go', text: 'stop', expected: 'false' },
    { name: 'not_equals → true', operator: 'not_equals', value: 'x', text: 'y', expected: 'true' },
    { name: 'contains → true', operator: 'contains', value: 'ell', text: 'hello', expected: 'true' },
    { name: 'greater_than → true', operator: 'greater_than', value: '5', text: '9', expected: 'true' },
    { name: 'greater_than → false', operator: 'greater_than', value: '50', text: '9', expected: 'false' },
    { name: 'is_empty on empty → true', operator: 'is_empty', value: '', text: '', expected: 'true' },
    { name: 'is_not_empty on empty → false', operator: 'is_not_empty', value: '', text: '', expected: 'false' },
  ]

  for (const c of branchCases) {
    it(`routes branch: ${c.name}`, async () => {
      const upstream: ExecutionResult = { mediaType: 'text', text: c.text, durationMs: 0 }
      const result = await runner.execute(ctxWith({ operator: c.operator, value: c.value }, upstream))
      expect(result.output.data?.['branch']).toBe(c.expected)
      expect(result.variableMutations?.['__if_branch']).toBe(c.expected)
    })
  }

  it('defaults to is_not_empty when no operator configured (present input → true)', async () => {
    const upstream: ExecutionResult = { mediaType: 'text', text: 'value', durationMs: 0 }
    const result = await runner.execute(ctxWith({}, upstream))
    expect(result.output.data?.['branch']).toBe('true')
  })

  it('empty input with default operator → false', async () => {
    const result = await runner.execute(ctxWith({}))
    expect(result.output.data?.['branch']).toBe('false')
  })

  it('resolves nested value via inputPath', async () => {
    const upstream: ExecutionResult = {
      mediaType: 'text',
      text: '',
      data: { user: { role: 'admin' } },
      durationMs: 0,
    }
    const result = await runner.execute(
      ctxWith({ operator: 'equals', value: 'admin', inputPath: 'user.role' }, upstream),
    )
    expect(result.output.data?.['branch']).toBe('true')
  })

  it('handles invalid regex gracefully → false', async () => {
    const upstream: ExecutionResult = { mediaType: 'text', text: 'test', durationMs: 0 }
    const result = await runner.execute(
      ctxWith({ operator: 'regex_match', value: '[invalid' }, upstream),
    )
    expect(result.output.data?.['branch']).toBe('false')
  })

  it('missing field via inputPath yields undefined → false for equals', async () => {
    const upstream: ExecutionResult = { mediaType: 'text', text: '', data: {}, durationMs: 0 }
    const result = await runner.execute(
      ctxWith({ operator: 'equals', value: 'x', inputPath: 'missing.field' }, upstream),
    )
    expect(result.output.data?.['branch']).toBe('false')
  })
})
