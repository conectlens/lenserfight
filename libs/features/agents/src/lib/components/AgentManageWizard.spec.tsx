import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import React from 'react'
import { vi } from 'vitest'

const {
  mockUseLenserWorkspace,
  mockUseHandleCheck,
  mockSubmit,
  mockNavigate,
  mockNextStep,
  mockUseAgentDetail,
} = vi.hoisted(() => ({
  mockUseLenserWorkspace: vi.fn(),
  mockUseHandleCheck: vi.fn(),
  mockSubmit: vi.fn(),
  mockNavigate: vi.fn(),
  mockNextStep: vi.fn(),
  mockUseAgentDetail: vi.fn(),
}))

vi.mock('@lenserfight/data/repositories', () => ({
  agentsService: {
    updatePolicy: vi.fn(),
    createAgent: vi.fn(),
  },
  lenserService: {
    checkHandle: vi.fn(),
    getLenserByHandle: vi.fn(),
  },
}))

vi.mock('@lenserfight/data/cache', () => ({
  queryKeys: {
    agents: {
      detail: (id: string) => ['agents', 'detail', id],
    },
  },
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

vi.mock('../hooks/useAgentDetail', () => ({
  useAgentDetail: (...args: unknown[]) => mockUseAgentDetail(...args),
}))

vi.mock('../hooks/useAgentPersonality', () => ({
  useAgentPersonality: () => ({
    savePersonalityNote: vi.fn(),
    bindLens: vi.fn(),
    isSaving: false,
    error: null,
  }),
}))

vi.mock('@lenserfight/features/lenses', () => ({
  useCreateLens: () => ({
    isOpen: false,
    openModal: vi.fn(),
    closeModal: vi.fn(),
    submit: vi.fn(),
    form: {},
    isSubmitting: false,
    error: null,
    isEditMode: false,
  }),
  CreateLensModal: () => null,
}))

vi.mock('@lenserfight/ui/routing', () => ({
  useWizardStep: () => ({
    step: 0,
    nextStep: mockNextStep,
    prevStep: vi.fn(),
    setStep: vi.fn(),
  }),
}))

vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
  Link: ({ children, to }: { children: React.ReactNode; to: string }) => (
    <a href={to}>{children}</a>
  ),
}))

vi.mock('@tanstack/react-query', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@tanstack/react-query')>()
  return {
    ...actual,
    useQueryClient: () => ({ invalidateQueries: vi.fn() }),
  }
})

vi.mock('@lenserfight/ui/components', () => ({
  StepWizard: ({ children, onNext, onCancel, canProceed, steps, currentStep }: any) => (
    <div>
      <div data-testid="step-label">{steps[currentStep]?.label}</div>
      {children}
      <button onClick={onNext} disabled={!canProceed} data-testid="next-btn">
        {currentStep === steps.length - 1 ? 'Done' : 'Next'}
      </button>
      <button onClick={onCancel} data-testid="cancel-btn">Cancel</button>
    </div>
  ),
  Badge: ({ children }: any) => <span>{children}</span>,
  Tooltip: ({ children }: any) => <>{children}</>,
  HelpButton: () => null,
  Button: ({ children, onClick, disabled }: any) => (
    <button onClick={onClick} disabled={disabled}>{children}</button>
  ),
}))

vi.mock('@lenserfight/ui/forms', () => ({
  Field: ({ children, label, id, error }: any) => (
    <div>
      <label htmlFor={id}>{label}</label>
      {children}
      {error && <p role="alert">{error}</p>}
    </div>
  ),
  Input: ({ id, value, onChange, placeholder, ...rest }: any) => (
    <input id={id} value={value} onChange={onChange} placeholder={placeholder} {...rest} />
  ),
  Switch: () => null,
}))

vi.mock('@lenserfight/ui/modals', () => ({
  AgentIdentityCard: () => null,
}))

import { AgentManageWizard } from './AgentManageWizard'

function defaultHandleCheck(overrides = {}) {
  return {
    handle: 'battle_bot',
    setHandle: vi.fn(),
    normalizedHandle: 'battle_bot',
    isCheckingHandle: false,
    isHandleUnique: true,
    handleError: null,
    suggestions: [],
    ...overrides,
  }
}

const AGENT_FIXTURE = {
  display_name: 'Battle Bot',
  handle: 'battle_bot',
  avatar_url: null,
  model_count: 0,
  lens_count: 0,
  runtime_pref: null,
  suspended_reason: null,
  suspended_at: null,
  ai_lenser_id: 'agent-1',
  profile_id: 'profile-1',
  is_active: true,
  can_join_battles: true,
  can_vote: true,
  can_create_battles: false,
  can_receive_sponsorship: false,
  model_binding_mode: 'single',
  personality_note: null,
  max_daily_battles: 10,
  max_daily_votes: 10,
  battles_used: 0,
  votes_used: 0,
  spending_limit_credits: 0,
}

describe('AgentManageWizard — create mode (no agentId)', () => {
  beforeEach(() => {
    mockSubmit.mockReset()
    mockNavigate.mockReset()
    mockNextStep.mockReset()
    mockUseLenserWorkspace.mockReturnValue({ humanWorkspace: { id: 'lenser-1' } })
    mockUseHandleCheck.mockReturnValue(defaultHandleCheck())
    mockUseAgentDetail.mockReturnValue({ data: null, isLoading: false })
    mockSubmit.mockResolvedValue({ ai_lenser_id: 'agent-1', profile_id: 'profile-1' })
  })

  it('renders the Identity step as step 0', () => {
    render(<AgentManageWizard onDone={vi.fn()} />)
    expect(screen.getByTestId('step-label').textContent).toBe('Identity')
    expect(screen.getByLabelText(/Display name/i)).toBeTruthy()
    expect(screen.getByLabelText(/Handle/i)).toBeTruthy()
  })

  it('blocks Next when display name is empty', () => {
    render(<AgentManageWizard onDone={vi.fn()} />)
    const next = screen.getByTestId('next-btn') as HTMLButtonElement
    expect(next.disabled).toBe(true)
  })

  it('enables Next when display name is filled and handle is unique', () => {
    render(<AgentManageWizard onDone={vi.fn()} />)
    fireEvent.change(screen.getByLabelText(/Display name/i), {
      target: { value: 'Battle Bot' },
    })
    const next = screen.getByTestId('next-btn') as HTMLButtonElement
    expect(next.disabled).toBe(false)
  })

  it('creates the agent and advances on valid submit', async () => {
    render(<AgentManageWizard onDone={vi.fn()} />)

    fireEvent.change(screen.getByLabelText(/Display name/i), {
      target: { value: 'Battle Bot' },
    })
    fireEvent.click(screen.getByTestId('next-btn'))

    await waitFor(() => {
      expect(mockSubmit).toHaveBeenCalledWith('battle_bot', 'Battle Bot')
    })
    await waitFor(() => {
      expect(mockNextStep).toHaveBeenCalledTimes(1)
    })
  })

  it('shows handle error when handle is taken', () => {
    mockUseHandleCheck.mockReturnValue(
      defaultHandleCheck({ isHandleUnique: false, handleError: 'Handle is already taken.' })
    )
    render(<AgentManageWizard onDone={vi.fn()} />)
    fireEvent.change(screen.getByLabelText(/Display name/i), {
      target: { value: 'Battle Bot' },
    })
    expect((screen.getByTestId('next-btn') as HTMLButtonElement).disabled).toBe(true)
    expect(screen.getByRole('alert').textContent).toContain('Handle is already taken.')
  })

  it('shows workspace warning when no human workspace', () => {
    mockUseLenserWorkspace.mockReturnValue({ humanWorkspace: null })
    render(<AgentManageWizard onDone={vi.fn()} />)
    expect(screen.getByText(/Switch back to your human workspace/i)).toBeTruthy()
  })

  it('shows api error when creation fails with max agents message', async () => {
    mockSubmit.mockRejectedValue({ message: 'Maximum of 5 AI agents reached.' })

    render(<AgentManageWizard onDone={vi.fn()} />)
    fireEvent.change(screen.getByLabelText(/Display name/i), {
      target: { value: 'Battle Bot' },
    })
    fireEvent.click(screen.getByTestId('next-btn'))

    await waitFor(() => {
      expect(screen.getByText(/Maximum of 5 AI agents reached/i)).toBeTruthy()
    })
    expect(mockNextStep).not.toHaveBeenCalled()
  })

  it('calls onDone when Cancel is pressed', () => {
    const onDone = vi.fn()
    render(<AgentManageWizard onDone={onDone} />)
    fireEvent.click(screen.getByTestId('cancel-btn'))
    expect(onDone).toHaveBeenCalledTimes(1)
  })
})

describe('AgentManageWizard — manage mode (with agentId)', () => {
  beforeEach(() => {
    mockUseLenserWorkspace.mockReturnValue({ humanWorkspace: { id: 'lenser-1' } })
    mockUseHandleCheck.mockReturnValue(defaultHandleCheck())
    mockNextStep.mockReset()
    mockUseAgentDetail.mockReturnValue({ data: AGENT_FIXTURE, isLoading: false })
  })

  it('starts at step 0 = Identity with editable display name', () => {
    render(<AgentManageWizard agentId="agent-1" handle="battle_bot" onDone={vi.fn()} />)
    expect(screen.getByTestId('step-label').textContent).toBe('Identity')
    expect(screen.getByLabelText(/Display name/i)).toBeTruthy()
  })

  it('shows the handle as read-only', () => {
    render(<AgentManageWizard agentId="agent-1" handle="battle_bot" onDone={vi.fn()} />)
    const handleInput = screen.getByLabelText(/Handle/i) as HTMLInputElement
    expect(handleInput.readOnly).toBe(true)
  })

  it('blocks Next when display name is cleared', () => {
    render(<AgentManageWizard agentId="agent-1" handle="battle_bot" onDone={vi.fn()} />)
    fireEvent.change(screen.getByLabelText(/Display name/i), { target: { value: '' } })
    expect((screen.getByTestId('next-btn') as HTMLButtonElement).disabled).toBe(true)
  })

  it('saves display name and advances on Next', async () => {
    const { agentsService: mockAgentsService } = await import('@lenserfight/data/repositories') as any
    mockAgentsService.updateAgentProfile = vi.fn().mockResolvedValue(undefined)

    render(<AgentManageWizard agentId="agent-1" handle="battle_bot" onDone={vi.fn()} />)
    fireEvent.change(screen.getByLabelText(/Display name/i), {
      target: { value: 'Updated Bot' },
    })
    fireEvent.click(screen.getByTestId('next-btn'))

    await waitFor(() => {
      expect(mockAgentsService.updateAgentProfile).toHaveBeenCalledWith(
        'agent-1',
        { display_name: 'Updated Bot' }
      )
    })
    await waitFor(() => {
      expect(mockNextStep).toHaveBeenCalledTimes(1)
    })
  })
})
