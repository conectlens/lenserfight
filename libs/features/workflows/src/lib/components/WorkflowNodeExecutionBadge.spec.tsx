import { render, screen } from '@testing-library/react'
import React from 'react'
import { describe, expect, it } from 'vitest'

import { STATUS_LABELS } from '../execution/workflowNodeExecutionStatus'

import { WorkflowNodeExecutionBadge } from './WorkflowNodeExecutionBadge'

describe('WorkflowNodeExecutionBadge', () => {
  it('renders with role="status"', () => {
    render(<WorkflowNodeExecutionBadge status="running" />)
    expect(screen.getByRole('status')).toBeDefined()
  })

  it('sets aria-label to the status label', () => {
    render(<WorkflowNodeExecutionBadge status="completed" />)
    const badge = screen.getByRole('status')
    expect(badge.getAttribute('aria-label')).toBe(STATUS_LABELS['completed'])
  })

  it('appends (dry run) to aria-label when isDryRun is true', () => {
    render(<WorkflowNodeExecutionBadge status="completed" isDryRun />)
    const badge = screen.getByRole('status')
    expect(badge.getAttribute('aria-label')).toContain('(dry run)')
  })

  it('does not append (dry run) when isDryRun is false', () => {
    render(<WorkflowNodeExecutionBadge status="failed" isDryRun={false} />)
    const badge = screen.getByRole('status')
    expect(badge.getAttribute('aria-label')).not.toContain('(dry run)')
  })

  it('sets title matching aria-label', () => {
    render(<WorkflowNodeExecutionBadge status="running" />)
    const badge = screen.getByRole('status')
    expect(badge.getAttribute('title')).toBe(badge.getAttribute('aria-label'))
  })

  it('renders without throwing for all statuses', () => {
    const statuses = [
      'pending', 'awaiting_dependency', 'queued', 'running', 'streaming',
      'retrying', 'completed', 'failed', 'cancelled', 'skipped',
      'timed_out', 'blocked', 'invalidated',
    ] as const
    for (const status of statuses) {
      expect(() => render(<WorkflowNodeExecutionBadge status={status} />)).not.toThrow()
    }
  })
})
