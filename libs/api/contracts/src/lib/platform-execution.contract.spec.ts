import { describe, expect, it } from 'vitest'

import { mapToLifecycle } from './platform-execution.contract'

describe('mapToLifecycle', () => {
  it.each([
    ['succeeded', 'workflow', 'completed'],
    ['completed', 'battle_job', 'completed'],
    ['canceled', 'workflow', 'cancelled'],
    ['cancelled', 'workflow', 'cancelled'],
    ['timed_out', 'workflow', 'failed'],
    ['streaming', 'workflow', 'running'],
    ['recovered', 'workflow', 'running'],
    ['claimed', 'battle_job', 'claimed'],
    ['validated', 'workflow', 'pending'],
  ] as const)('maps %s from %s to %s', (raw, source, expected) => {
    expect(mapToLifecycle(raw, source)).toBe(expected)
  })
})
