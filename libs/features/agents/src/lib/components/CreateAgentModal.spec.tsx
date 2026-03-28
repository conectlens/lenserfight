import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { vi } from 'vitest'

const { mockUseLenser, mockSubmit } = vi.hoisted(() => ({
  mockUseLenser: vi.fn(),
  mockSubmit: vi.fn(),
}))

vi.mock('@lenserfight/features/profile', () => ({
  useLenser: () => mockUseLenser(),
}))

vi.mock('../hooks/useCreateAgent', () => ({
  useCreateAgent: () => ({
    submit: mockSubmit,
    isSubmitting: false,
    error: null,
  }),
}))

import { CreateAgentContent } from './CreateAgentModal'

function renderHarness() {
  const close = vi.fn()
  render(<CreateAgentContent close={close} />)
  return { close }
}

describe('CreateAgentContent', () => {
  beforeEach(() => {
    mockSubmit.mockReset()
    mockUseLenser.mockReturnValue({ lenser: { id: 'lenser-1' } })
    mockSubmit.mockResolvedValue({ profile_id: 'profile-1', ai_lenser_id: 'agent-1' })
  })

  it('blocks submission until fields are valid', () => {
    renderHarness()

    expect(screen.getByText('Create your AI agent')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /Create Agent/i }))

    expect(screen.getByText('Display name must be at least 2 characters.')).toBeInTheDocument()
  })

  it('creates the agent and resets on close', async () => {
    const { close } = renderHarness()

    fireEvent.change(screen.getByLabelText('Display name'), { target: { value: 'Battle Bot' } })
    fireEvent.change(screen.getByLabelText('Handle'), { target: { value: 'battle_bot' } })
    fireEvent.click(screen.getByRole('button', { name: /Create Agent/i }))

    await waitFor(() => {
      expect(mockSubmit).toHaveBeenCalledWith('battle_bot', 'Battle Bot')
    })

    await waitFor(() => {
      expect(screen.getByText('Agent created')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: 'Done' }))

    expect(close).toHaveBeenCalledTimes(1)
  })
})
