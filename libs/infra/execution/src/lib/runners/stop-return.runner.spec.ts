import { describe, it, expect } from 'vitest'

import { StopReturnRunner, WORKFLOW_HALT_KEY } from './stop-return.runner'

import type { NodeRunnerContext } from './node-runner.interface'
import type { ExecutionResult } from '../execution.types'

function ctxWith(
  nodeConfig: Record<string, unknown>,
  upstream?: ExecutionResult,
): NodeRunnerContext {
  return {
    nodeId: 'stop1',
    upstreamOutputs: upstream ? new Map([['n1', upstream]]) : new Map(),
    resolvedParams: {},
    nodeConfig,
  }
}

describe('StopReturnRunner', () => {
  const runner = new StopReturnRunner()

  it('declares node type as stop_return', () => {
    expect(runner.nodeType).toBe('stop_return')
  })

  it('always raises the halt signal', async () => {
    const result = await runner.execute(ctxWith({}))
    expect(result.variableMutations?.[WORKFLOW_HALT_KEY]).toBe(true)
    expect(result.output.data?.['halted']).toBe(true)
  })

  it('surfaces a literal returnValue as the run output text', async () => {
    const result = await runner.execute(ctxWith({ returnValue: 'final answer' }))
    expect(result.output.text).toBe('final answer')
    expect(result.output.data?.['returnValue']).toBe('final answer')
  })

  it('serializes a non-string returnValue', async () => {
    const result = await runner.execute(ctxWith({ returnValue: { ok: true } }))
    expect(result.output.text).toBe('{"ok":true}')
    expect(result.output.data?.['returnValue']).toEqual({ ok: true })
  })

  it('resolves returnPath from upstream data (precedence over returnValue)', async () => {
    const upstream: ExecutionResult = {
      mediaType: 'text',
      text: '',
      data: { result: { value: 42 } },
      durationMs: 0,
    }
    const result = await runner.execute(
      ctxWith({ returnValue: 'ignored', returnPath: 'result.value' }, upstream),
    )
    expect(result.output.data?.['returnValue']).toBe(42)
  })

  it('defaults message when no return value configured', async () => {
    const result = await runner.execute(ctxWith({}))
    expect(result.output.text).toBe('Workflow stopped.')
    expect(result.output.data?.['returnValue']).toBe(null)
  })

  it('missing returnPath field yields null return value but still halts', async () => {
    const upstream: ExecutionResult = { mediaType: 'text', text: '', data: {}, durationMs: 0 }
    const result = await runner.execute(ctxWith({ returnPath: 'no.such.path' }, upstream))
    expect(result.variableMutations?.[WORKFLOW_HALT_KEY]).toBe(true)
    expect(result.output.data?.['returnValue']).toBe(null)
  })
})
