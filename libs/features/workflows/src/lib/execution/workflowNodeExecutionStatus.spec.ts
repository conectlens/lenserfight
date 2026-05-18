import { describe, expect, it } from 'vitest'

import {
  getNodeExecutionRingClassName,
  getStatusIcon,
  isSpinningStatus,
  STATUS_LABELS,
  type NodeStatus,
} from './workflowNodeExecutionStatus'

const ALL_STATUSES: NodeStatus[] = [
  'pending',
  'awaiting_dependency',
  'queued',
  'running',
  'streaming',
  'retrying',
  'completed',
  'failed',
  'cancelled',
  'skipped',
  'timed_out',
  'blocked',
  'invalidated',
]

describe('getStatusIcon', () => {
  it('returns a non-null React element for every known status', () => {
    for (const status of ALL_STATUSES) {
      const icon = getStatusIcon(status)
      expect(icon, `expected icon for status "${status}"`).not.toBeNull()
    }
  })

  it('accepts a custom size without throwing', () => {
    expect(() => getStatusIcon('running', 9)).not.toThrow()
    expect(() => getStatusIcon('completed', 16)).not.toThrow()
  })
})

describe('STATUS_LABELS', () => {
  it('has a non-empty label for every status', () => {
    for (const status of ALL_STATUSES) {
      expect(STATUS_LABELS[status], `missing label for "${status}"`).toBeTruthy()
    }
  })
})

describe('getNodeExecutionRingClassName', () => {
  it('returns yellow ring for active statuses', () => {
    const active: NodeStatus[] = ['running', 'streaming', 'retrying']
    for (const s of active) {
      expect(getNodeExecutionRingClassName(s)).toContain('ring-primary-yellow-500')
    }
  })

  it('returns green ring for completed', () => {
    expect(getNodeExecutionRingClassName('completed')).toContain('ring-status-green')
  })

  it('returns red ring for error statuses', () => {
    const errors: NodeStatus[] = ['failed', 'cancelled', 'timed_out', 'blocked', 'invalidated']
    for (const s of errors) {
      const cls = getNodeExecutionRingClassName(s)
      expect(cls, `expected red ring for "${s}"`).toContain('ring-status-red')
    }
  })

  it('returns a subtle ring for waiting statuses', () => {
    const waiting: NodeStatus[] = ['queued', 'awaiting_dependency', 'pending']
    for (const s of waiting) {
      const cls = getNodeExecutionRingClassName(s)
      expect(cls).toContain('ring-')
      expect(cls).not.toContain('ring-2')
    }
  })

  it('returns opacity for skipped', () => {
    expect(getNodeExecutionRingClassName('skipped')).toContain('opacity-60')
  })

  it('returns empty string for null and undefined', () => {
    expect(getNodeExecutionRingClassName(null)).toBe('')
    expect(getNodeExecutionRingClassName(undefined)).toBe('')
  })
})

describe('isSpinningStatus', () => {
  it('returns true for running, streaming, retrying', () => {
    expect(isSpinningStatus('running')).toBe(true)
    expect(isSpinningStatus('streaming')).toBe(true)
    expect(isSpinningStatus('retrying')).toBe(true)
  })

  it('returns false for all other statuses', () => {
    const nonSpinning: NodeStatus[] = [
      'pending', 'awaiting_dependency', 'queued',
      'completed', 'failed', 'cancelled', 'skipped',
      'timed_out', 'blocked', 'invalidated',
    ]
    for (const s of nonSpinning) {
      expect(isSpinningStatus(s), `expected false for "${s}"`).toBe(false)
    }
  })

  it('returns false for null and undefined', () => {
    expect(isSpinningStatus(null)).toBe(false)
    expect(isSpinningStatus(undefined)).toBe(false)
  })
})
