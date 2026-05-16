import { describe, it, expect } from 'vitest'
import { ManualTriggerRunner } from './manual-trigger.runner'
import type { NodeRunnerContext } from '../node-runner.interface'

function makeCtx(overrides: Partial<NodeRunnerContext> = {}): NodeRunnerContext {
  return {
    nodeId: 'n1',
    upstreamOutputs: new Map(),
    resolvedParams: {},
    nodeConfig: {},
    ...overrides,
  }
}

describe('ManualTriggerRunner', () => {
  const runner = new ManualTriggerRunner()

  it('has nodeType manual_trigger', () => {
    expect(runner.nodeType).toBe('manual_trigger')
  })

  it('returns all rootInputs as the output payload', async () => {
    const ctx = makeCtx({ resolvedParams: { topic: 'AI ethics', audience: 'engineers', count: 5 } })
    const result = await runner.execute(ctx)

    expect(result.output.mediaType).toBe('json')
    expect(result.output.data).toEqual({ topic: 'AI ethics', audience: 'engineers', count: 5 })
  })

  it('returns an empty object when no rootInputs are provided', async () => {
    const ctx = makeCtx({ resolvedParams: {} })
    const result = await runner.execute(ctx)

    expect(result.output.data).toEqual({})
  })

  it('does not emit variableMutations', async () => {
    const ctx = makeCtx({ resolvedParams: { x: 1 } })
    const result = await runner.execute(ctx)

    expect(result.variableMutations).toBeUndefined()
  })

  it('sets durationMs to 0', async () => {
    const result = await runner.execute(makeCtx())
    expect(result.output.durationMs).toBe(0)
  })
})
