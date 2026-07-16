import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import React from 'react'
import { vi } from 'vitest'
import { WorkflowCronPanel } from './WorkflowCronPanel'

const { mockUpsert, mockDelete } = vi.hoisted(() => ({
  mockUpsert: vi.fn().mockResolvedValue(undefined),
  mockDelete: vi.fn(),
}))

vi.mock('../hooks/useWorkflowSchedules', () => ({
  useWorkflowSchedules: () => ({ data: [], isLoading: false }),
  useUpsertWorkflowSchedule: () => ({ mutateAsync: mockUpsert, mutate: mockUpsert, isPending: false }),
  useDeleteWorkflowSchedule: () => ({ mutate: mockDelete }),
}))

const openForm = () => {
  render(<WorkflowCronPanel workflowId="wf-1" isOwner />)
  fireEvent.click(screen.getByText('Add'))
}

const typeExpr = (value: string) => {
  fireEvent.change(screen.getByPlaceholderText('0 * * * *'), { target: { value } })
}

describe('WorkflowCronPanel field-count guard', () => {
  beforeEach(() => {
    mockUpsert.mockClear()
    mockDelete.mockClear()
  })

  it('blocks submit and shows an inline error for a 6-field (sub-minute) expression', () => {
    openForm()
    typeExpr('*/30 * * * * *')
    fireEvent.click(screen.getByText('Save Schedule'))

    expect(mockUpsert).not.toHaveBeenCalled()
    expect(screen.getByText(/exactly 5 fields/i)).toBeTruthy()
  })

  it('submits a valid 5-field expression without a validation error', async () => {
    openForm()
    typeExpr('*/5 * * * *')
    fireEvent.click(screen.getByText('Save Schedule'))

    expect(screen.queryByText(/exactly 5 fields/i)).toBeNull()
    expect(mockUpsert).toHaveBeenCalledWith({
      workflow_id: 'wf-1',
      cron_expr: '*/5 * * * *',
      is_active: true,
    })
    // Let the async mutation resolve and the form close before the test ends.
    await waitFor(() => expect(screen.queryByPlaceholderText('0 * * * *')).toBeNull())
  })

  it('clears the inline error once the user edits the expression', () => {
    openForm()
    typeExpr('*/30 * * * * *')
    fireEvent.click(screen.getByText('Save Schedule'))
    expect(screen.getByText(/exactly 5 fields/i)).toBeTruthy()

    typeExpr('*/5 * * * *')
    expect(screen.queryByText(/exactly 5 fields/i)).toBeNull()
  })
})
