import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { vi } from 'vitest'

const { mockUseLenserWorkspace, mockUseHandleCheck, mockSubmit, mockNavigate } = vi.hoisted(() => ({
  mockUseLenserWorkspace: vi.fn(),
  mockUseHandleCheck: vi.fn(),
  mockSubmit: vi.fn(),
  mockNavigate: vi.fn(),
}))

vi.mock('@lenserfight/features/profile', () => ({
  useLenserWorkspace: () => mockUseLenserWorkspace(),
}))

vi.mock('../hooks/useCreateAgent', () => ({
  useCreateAgent: () => ({
    submit: mockSubmit,
    isSubmitting: false,
    error: null,
  }),
}))

vi.mock('../hooks/useHandleCheck', () => ({
  useHandleCheck: () => mockUseHandleCheck(),
}))

vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
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
    mockNavigate.mockReset()
    mockUseLenserWorkspace.mockReturnValue({ humanWorkspace: { id: 'lenser-1' } })
    mockUseHandleCheck.mockReturnValue({
      handle: 'battle_bot',
      setHandle: vi.fn(),
      normalizedHandle: 'battle_bot',
      isCheckingHandle: false,
      isHandleUnique: true,
      handleError: null,
      suggestions: [],
    })
    mockSubmit.mockResolvedValue({ profile_id: 'profile-1', ai_lenser_id: 'agent-1' })
  })

  it('blocks submission until fields are valid', () => {
    renderHarness()

    expect(
      (screen.getByRole('button', { name: /Create Agent/i }) as HTMLButtonElement).disabled
    ).toBe(true)
  })

  it('creates the agent and navigates to the new profile', async () => {
    const { close } = renderHarness()

    fireEvent.change(screen.getByLabelText(/Display name/i), {
      target: { value: 'Battle Bot' },
    })
    fireEvent.click(screen.getByRole('button', { name: /Create Agent/i }))

    await waitFor(() => {
      expect(mockSubmit).toHaveBeenCalledWith('battle_bot', 'Battle Bot')
    })

    await waitFor(() => {
      expect(close).toHaveBeenCalledTimes(1)
      expect(mockNavigate).toHaveBeenCalledWith('/lenser/battle_bot')
    })
  })
})
