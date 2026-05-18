import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { WaitDelayRunner } from './wait-delay.runner'
import type { NodeRunnerContext } from './node-runner.interface'

describe('WaitDelayRunner', () => {
  const runner = new WaitDelayRunner()

  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('declares node type as wait_delay', () => {
    expect(runner.nodeType).toBe('wait_delay')
  })

  it('completes immediately with zero delay when unconfigured', async () => {
    const ctx: NodeRunnerContext = {
      nodeId: 'w1',
      upstreamOutputs: new Map(),
      resolvedParams: {},
      nodeConfig: {},
    }

    const result = await runner.execute(ctx)
    expect(result.output.data?.['delayMs']).toBe(0)
    expect(result.output.durationMs).toBe(0)
  })

  it('waits for configured delayMs', async () => {
    const ctx: NodeRunnerContext = {
      nodeId: 'w1',
      upstreamOutputs: new Map(),
      resolvedParams: {},
      nodeConfig: { delayMs: 500 },
    }

    const promise = runner.execute(ctx)
    await vi.advanceTimersByTimeAsync(500)
    const result = await promise

    expect(result.output.data?.['delayMs']).toBe(500)
  })

  it('caps delay at 24 hours', async () => {
    const ctx: NodeRunnerContext = {
      nodeId: 'w1',
      upstreamOutputs: new Map(),
      resolvedParams: {},
      nodeConfig: { delayMs: 100_000_000 }, // ~27.8 hours
    }

    const promise = runner.execute(ctx)
    await vi.advanceTimersByTimeAsync(86_400_000)
    const result = await promise

    expect(result.output.data?.['delayMs']).toBe(86_400_000)
  })

  it('ignores negative delay values', async () => {
    const ctx: NodeRunnerContext = {
      nodeId: 'w1',
      upstreamOutputs: new Map(),
      resolvedParams: {},
      nodeConfig: { delayMs: -5000 },
    }

    const result = await runner.execute(ctx)
    expect(result.output.data?.['delayMs']).toBe(0)
  })

  it('ignores non-numeric delay values', async () => {
    const ctx: NodeRunnerContext = {
      nodeId: 'w1',
      upstreamOutputs: new Map(),
      resolvedParams: {},
      nodeConfig: { delayMs: 'invalid' },
    }

    const result = await runner.execute(ctx)
    expect(result.output.data?.['delayMs']).toBe(0)
  })

  it('waits until delayUntil timestamp (takes priority over delayMs)', async () => {
    const futureMs = Date.now() + 2000
    const ctx: NodeRunnerContext = {
      nodeId: 'w1',
      upstreamOutputs: new Map(),
      resolvedParams: {},
      nodeConfig: {
        delayMs: 100,
        delayUntil: new Date(futureMs).toISOString(),
      },
    }

    const promise = runner.execute(ctx)
    await vi.advanceTimersByTimeAsync(2000)
    const result = await promise

    expect(result.output.data?.['delayMs']).toBeGreaterThanOrEqual(1900)
    expect(result.output.data?.['delayMs']).toBeLessThanOrEqual(2100)
  })

  it('completes immediately when delayUntil is in the past', async () => {
    const pastMs = Date.now() - 5000
    const ctx: NodeRunnerContext = {
      nodeId: 'w1',
      upstreamOutputs: new Map(),
      resolvedParams: {},
      nodeConfig: { delayUntil: new Date(pastMs).toISOString() },
    }

    const result = await runner.execute(ctx)
    expect(result.output.data?.['delayMs']).toBe(0)
  })

  it('cancels on AbortSignal', async () => {
    const controller = new AbortController()
    const ctx: NodeRunnerContext = {
      nodeId: 'w1',
      upstreamOutputs: new Map(),
      resolvedParams: {},
      nodeConfig: { delayMs: 10000 },
      signal: controller.signal,
    }

    const promise = runner.execute(ctx)
    await vi.advanceTimersByTimeAsync(100)
    controller.abort()

    await expect(promise).rejects.toThrow('Wait cancelled')
  })

  it('rejects immediately if signal already aborted', async () => {
    const controller = new AbortController()
    controller.abort()
    const ctx: NodeRunnerContext = {
      nodeId: 'w1',
      upstreamOutputs: new Map(),
      resolvedParams: {},
      nodeConfig: { delayMs: 5000 },
      signal: controller.signal,
    }

    await expect(runner.execute(ctx)).rejects.toThrow('Wait cancelled')
  })
})
