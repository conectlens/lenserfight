import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import React from 'react'

// Mock execution status helpers
vi.mock('../../execution/workflowNodeExecutionStatus', () => ({
  STATUS_COLORS: {
    completed: 'border-status-green bg-status-green/5',
    failed: 'border-status-red bg-status-red/5',
    skipped: 'border-surface-border bg-surface-base opacity-70',
    running: 'border-primary-yellow-500 bg-primary-yellow-500/5',
    pending: 'border-surface-border bg-surface-base',
  },
  STATUS_LABELS: {
    completed: 'Completed',
    failed: 'Failed',
    skipped: 'Skipped',
    running: 'Running',
    pending: 'Pending',
  },
  getStatusIcon: (_status: string, _size: number) => React.createElement('span', { 'data-testid': 'status-icon' }),
}))

import type { UpstreamNodeOutput } from '../../hooks/useUpstreamNodeOutputs'
import { WorkflowUpstreamOutputPanel } from './WorkflowUpstreamOutputPanel'

function makeUpstream(overrides: Partial<UpstreamNodeOutput> & { nodeId: string }): UpstreamNodeOutput {
  return {
    label: 'Test Node',
    nodeType: 'manual_trigger',
    status: null,
    outputSchema: [{ name: 'text', type: 'text', description: 'Text output' }],
    executedValues: null,
    error: null,
    ...overrides,
  }
}

describe('WorkflowUpstreamOutputPanel', () => {
  it('returns null when upstreamOutputs is empty', () => {
    const { container } = render(
      <WorkflowUpstreamOutputPanel upstreamOutputs={[]} />,
    )
    expect(container.firstChild).toBeNull()
  })

  it('renders one section per upstream node', () => {
    render(
      <WorkflowUpstreamOutputPanel
        upstreamOutputs={[
          makeUpstream({ nodeId: 'n1', label: 'Node Alpha' }),
          makeUpstream({ nodeId: 'n2', label: 'Node Beta' }),
        ]}
      />,
    )
    expect(screen.getByText('Node Alpha')).toBeDefined()
    expect(screen.getByText('Node Beta')).toBeDefined()
  })

  it('shows status label when upstream has a status', () => {
    render(
      <WorkflowUpstreamOutputPanel
        upstreamOutputs={[makeUpstream({ nodeId: 'n1', status: 'completed' })]}
      />,
    )
    expect(screen.getByText('Completed')).toBeDefined()
  })

  it('shows field names in the body', () => {
    render(
      <WorkflowUpstreamOutputPanel
        upstreamOutputs={[
          makeUpstream({
            nodeId: 'n1',
            outputSchema: [
              { name: 'text', type: 'text', description: '' },
              { name: 'score', type: 'number', description: '' },
            ],
          }),
        ]}
      />,
    )
    // 'text' appears as both field name and type badge — check at least one
    expect(screen.getAllByText('text').length).toBeGreaterThanOrEqual(1)
    // 'score' is unique (its type badge shows 'number')
    expect(screen.getByText('score')).toBeDefined()
  })

  it('shows skipped message when status is skipped', () => {
    render(
      <WorkflowUpstreamOutputPanel
        upstreamOutputs={[makeUpstream({ nodeId: 'n1', status: 'skipped' })]}
      />,
    )
    // "skipped" appears in both status label and body message — check the body message specifically
    expect(screen.getByText(/outputs unavailable/i)).toBeDefined()
  })

  it('shows error message when upstream failed with error', () => {
    render(
      <WorkflowUpstreamOutputPanel
        upstreamOutputs={[
          makeUpstream({ nodeId: 'n1', status: 'failed', error: 'Provider timeout' }),
        ]}
      />,
    )
    expect(screen.getByText('Provider timeout')).toBeDefined()
  })

  it('shows "did not complete" message when upstream failed without error', () => {
    render(
      <WorkflowUpstreamOutputPanel
        upstreamOutputs={[makeUpstream({ nodeId: 'n1', status: 'failed', error: null })]}
      />,
    )
    expect(screen.getByText(/did not complete/i)).toBeDefined()
  })

  it('collapses and expands on header click', () => {
    render(
      <WorkflowUpstreamOutputPanel
        upstreamOutputs={[
          makeUpstream({
            nodeId: 'n1',
            outputSchema: [{ name: 'score', type: 'number', description: '' }],
          }),
        ]}
      />,
    )
    // Field name 'score' is unique (type badge shows 'number')
    expect(screen.getByText('score')).toBeDefined()

    // Click the collapse toggle (has aria-expanded)
    fireEvent.click(screen.getByRole('button', { expanded: true }))
    expect(screen.queryByText('score')).toBeNull()

    // Click to expand again
    fireEvent.click(screen.getByRole('button', { expanded: false }))
    expect(screen.getByText('score')).toBeDefined()
  })

  it('shows live value when executedValues provided', () => {
    render(
      <WorkflowUpstreamOutputPanel
        upstreamOutputs={[
          makeUpstream({
            nodeId: 'n1',
            status: 'completed',
            executedValues: { text: 'hello result' },
          }),
        ]}
        hasRun
      />,
    )
    expect(screen.getByText('hello result')).toBeDefined()
  })

  it('shows expression syntax hint', () => {
    render(
      <WorkflowUpstreamOutputPanel
        upstreamOutputs={[makeUpstream({ nodeId: 'n1' })]}
      />,
    )
    expect(screen.getByText(/\[\[nodeId\.field\]\]/)).toBeDefined()
  })
})
