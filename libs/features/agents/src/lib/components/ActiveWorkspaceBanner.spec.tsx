import { fireEvent, render, screen } from '@testing-library/react'
import React from 'react'
import { vi } from 'vitest'

const {
  mockUseAgentWorkspace,
  mockUseLenserWorkspace,
  mockSwitchWorkspace,
} = vi.hoisted(() => ({
  mockUseAgentWorkspace: vi.fn(),
  mockUseLenserWorkspace: vi.fn(),
  mockSwitchWorkspace: vi.fn(),
}))

vi.mock('../context/AgentWorkspaceContext', () => ({
  useAgentWorkspace: () => mockUseAgentWorkspace(),
}))

vi.mock('@lenserfight/features/profile', () => ({
  useLenserWorkspace: () => mockUseLenserWorkspace(),
}))

import { ActiveWorkspaceBanner } from './ActiveWorkspaceBanner'

function makeAgentContext(overrides = {}) {
  return {
    viewMode: 'agent_owner',
    profile: {
      id: 'profile-ai-1',
      handle: 'research-bot',
      display_name: 'Research Bot',
      type: 'ai',
    },
    isSwitching: false,
    ...overrides,
  }
}

function makeWorkspaceContext(overrides = {}) {
  return {
    humanWorkspace: {
      id: 'profile-human-1',
      handle: 'ofcskn',
      type: 'human',
      is_active: false,
    },
    switchWorkspace: mockSwitchWorkspace,
    ...overrides,
  }
}

describe('ActiveWorkspaceBanner', () => {
  beforeEach(() => {
    mockUseAgentWorkspace.mockReset()
    mockUseLenserWorkspace.mockReset()
    mockSwitchWorkspace.mockReset()
  })

  it('renders when viewMode is agent_owner', () => {
    mockUseAgentWorkspace.mockReturnValue(makeAgentContext())
    mockUseLenserWorkspace.mockReturnValue(makeWorkspaceContext())

    render(<ActiveWorkspaceBanner />)

    expect(screen.getByText(/AI workspace active/)).toBeTruthy()
    expect(screen.getByText(/@research-bot/)).toBeTruthy()
  })

  it('renders the human handle in the back button', () => {
    mockUseAgentWorkspace.mockReturnValue(makeAgentContext())
    mockUseLenserWorkspace.mockReturnValue(makeWorkspaceContext())

    render(<ActiveWorkspaceBanner />)

    expect(screen.getByRole('button', { name: /@ofcskn/ })).toBeTruthy()
  })

  it('calls switchWorkspace with human workspace id when back button is clicked', () => {
    mockUseAgentWorkspace.mockReturnValue(makeAgentContext())
    mockUseLenserWorkspace.mockReturnValue(makeWorkspaceContext())

    render(<ActiveWorkspaceBanner />)

    fireEvent.click(screen.getByRole('button', { name: /@ofcskn/ }))

    expect(mockSwitchWorkspace).toHaveBeenCalledWith('profile-human-1')
  })

  it('does not render when viewMode is human_owner', () => {
    mockUseAgentWorkspace.mockReturnValue(makeAgentContext({ viewMode: 'human_owner' }))
    mockUseLenserWorkspace.mockReturnValue(makeWorkspaceContext())

    const { container } = render(<ActiveWorkspaceBanner />)

    expect(container.firstChild).toBeNull()
  })

  it('does not render when viewMode is agent_public', () => {
    mockUseAgentWorkspace.mockReturnValue(makeAgentContext({ viewMode: 'agent_public' }))
    mockUseLenserWorkspace.mockReturnValue(makeWorkspaceContext())

    const { container } = render(<ActiveWorkspaceBanner />)

    expect(container.firstChild).toBeNull()
  })

  it('disables the back button while switching', () => {
    mockUseAgentWorkspace.mockReturnValue(makeAgentContext({ isSwitching: true }))
    mockUseLenserWorkspace.mockReturnValue(makeWorkspaceContext())

    render(<ActiveWorkspaceBanner />)

    const btn = screen.getByRole('button') as HTMLButtonElement
    expect(btn.disabled).toBe(true)
    expect(screen.getByText('Switching…')).toBeTruthy()
  })
})
