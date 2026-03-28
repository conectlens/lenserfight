import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import React from 'react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { vi } from 'vitest'

const { mockSubmit } = vi.hoisted(() => ({
  mockSubmit: vi.fn(),
}))

vi.mock('../hooks/useCreateWorkflow', () => ({
  useCreateWorkflow: () => ({
    submit: mockSubmit,
    isSubmitting: false,
    error: null,
  }),
}))

import { CreateWorkflowWizard } from './CreateWorkflowWizard'

describe('CreateWorkflowWizard', () => {
  beforeEach(() => {
    mockSubmit.mockReset()
    mockSubmit.mockResolvedValue({
      id: 'workflow-1',
      lenser_id: 'lenser-1',
      title: 'Research workflow',
      description: 'Summarise and polish',
      visibility: 'public',
      battle_count: 0,
      created_at: '2026-03-26T00:00:00.000Z',
      updated_at: '2026-03-26T00:00:00.000Z',
    })
  })

  it('walks through metadata review and creates the workflow shell', async () => {
    const onCreated = vi.fn()

    render(
      <MemoryRouter initialEntries={['/workflows/new']}>
        <Routes>
          <Route
            path="/workflows/new"
            element={<CreateWorkflowWizard onCreated={onCreated} onCancel={vi.fn()} />}
          />
        </Routes>
      </MemoryRouter>
    )

    fireEvent.change(screen.getByLabelText('Workflow title'), {
      target: { value: 'Research workflow' },
    })
    fireEvent.change(screen.getByLabelText('Description'), {
      target: { value: 'Summarise and polish' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Next' }))

    expect(screen.getByText('Review workflow metadata')).toBeInTheDocument()
    expect(screen.getByText('Research workflow')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Create workflow' }))

    await waitFor(() => {
      expect(mockSubmit).toHaveBeenCalledWith({
        title: 'Research workflow',
        description: 'Summarise and polish',
        visibility: 'public',
      })
    })

    await waitFor(() => {
      expect(onCreated).toHaveBeenCalledWith('workflow-1')
    })
  })
})
