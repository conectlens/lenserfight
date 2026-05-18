import { describe, it, expect } from 'vitest'
import { EventTriggerRunner } from './event-trigger.runner'
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

describe('EventTriggerRunner', () => {
  const runner = new EventTriggerRunner()

  it('has nodeType event_trigger', () => {
    expect(runner.nodeType).toBe('event_trigger')
  })

  it('forwards __event__ from resolvedParams when present', async () => {
    const eventPayload = { type: 'battle.completed', data: { winner_id: 'abc', score: 100 } }
    const ctx = makeCtx({ resolvedParams: { __event__: eventPayload } })

    const result = await runner.execute(ctx)

    expect(result.output.mediaType).toBe('json')
    expect((result.output.data as Record<string, unknown>)['event']).toEqual(eventPayload)
  })

  it('falls back to typed stub using nodeConfig.eventType when __event__ is absent', async () => {
    const ctx = makeCtx({ nodeConfig: { eventType: 'lens.published' } })

    const result = await runner.execute(ctx)

    const event = (result.output.data as Record<string, unknown>)['event'] as Record<string, unknown>
    expect(event['type']).toBe('lens.published')
    expect(event['data']).toEqual({})
    expect(typeof event['timestamp']).toBe('string')
  })

  it('uses "unknown" eventType when neither __event__ nor nodeConfig.eventType is set', async () => {
    const ctx = makeCtx()

    const result = await runner.execute(ctx)

    const event = (result.output.data as Record<string, unknown>)['event'] as Record<string, unknown>
    expect(event['type']).toBe('unknown')
  })

  it('does not emit variableMutations', async () => {
    const result = await runner.execute(makeCtx())
    expect(result.variableMutations).toBeUndefined()
  })
})
