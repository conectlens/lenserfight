// EventPublisher — unit tests for engine event emission.
import { describe, it, expect, vi } from 'vitest'

import { EventPublisher } from './event-publisher'

import type { EnginePublishEvent } from './event-publisher'

describe('EventPublisher', () => {
  describe('emit', () => {
    it('calls sink with stamped event including wave and traceId', async () => {
      const sink = vi.fn()
      const pub = new EventPublisher({ traceId: 'trace-abc', sink })
      pub.setWave(2)

      await pub.emit({ runId: 'run-1', nodeId: 'node-A', name: 'node_completed' })

      expect(sink).toHaveBeenCalledWith(
        expect.objectContaining({
          runId: 'run-1',
          nodeId: 'node-A',
          name: 'node_completed',
          metadata: expect.objectContaining({ wave: 2, traceId: 'trace-abc' }),
        }),
      )
    })

    it('preserves existing metadata fields alongside wave stamp', async () => {
      const sink = vi.fn()
      const pub = new EventPublisher({ sink })

      await pub.emit({
        runId: 'r',
        nodeId: 'n',
        name: 'node_started',
        metadata: { custom: 'value' },
      })

      const emitted = sink.mock.calls[0][0] as EnginePublishEvent
      expect(emitted.metadata).toEqual({ custom: 'value', wave: 0 })
    })

    it('does nothing when no sink is configured', async () => {
      const pub = new EventPublisher()
      // Should not throw
      await expect(pub.emit({ runId: 'r', nodeId: 'n', name: 'x' })).resolves.toBeUndefined()
    })

    it('swallows sink errors without propagating', async () => {
      const sink = vi.fn().mockRejectedValue(new Error('sink crashed'))
      const pub = new EventPublisher({ sink })

      await expect(
        pub.emit({ runId: 'r', nodeId: 'n', name: 'node_failed' }),
      ).resolves.toBeUndefined()
    })

    it('does not increment emissionCount when sink throws', async () => {
      const sink = vi.fn().mockRejectedValue(new Error('crash'))
      const pub = new EventPublisher({ sink })

      await pub.emit({ runId: 'r', nodeId: 'n', name: 'x' })
      expect(pub.emissionCount).toBe(0)
    })
  })

  describe('emissionCount', () => {
    it('starts at 0', () => {
      const pub = new EventPublisher()
      expect(pub.emissionCount).toBe(0)
    })

    it('increments on successful emission', async () => {
      const sink = vi.fn()
      const pub = new EventPublisher({ sink })

      await pub.emit({ runId: 'r', nodeId: 'a', name: 'one' })
      await pub.emit({ runId: 'r', nodeId: 'b', name: 'two' })

      expect(pub.emissionCount).toBe(2)
    })
  })

  describe('setWave', () => {
    it('updates wave metadata on subsequent emissions', async () => {
      const sink = vi.fn()
      const pub = new EventPublisher({ sink })

      pub.setWave(0)
      await pub.emit({ runId: 'r', nodeId: 'n', name: 'first' })

      pub.setWave(3)
      await pub.emit({ runId: 'r', nodeId: 'n', name: 'second' })

      expect((sink.mock.calls[0][0] as EnginePublishEvent).metadata?.wave).toBe(0)
      expect((sink.mock.calls[1][0] as EnginePublishEvent).metadata?.wave).toBe(3)
    })
  })

  describe('traceId behavior', () => {
    it('omits traceId from metadata when not configured', async () => {
      const sink = vi.fn()
      const pub = new EventPublisher({ sink })

      await pub.emit({ runId: 'r', nodeId: 'n', name: 'x' })

      const emitted = sink.mock.calls[0][0] as EnginePublishEvent
      expect(emitted.metadata).toEqual({ wave: 0 })
      expect(emitted.metadata).not.toHaveProperty('traceId')
    })
  })
})
