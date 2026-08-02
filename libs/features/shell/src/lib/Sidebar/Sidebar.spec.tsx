import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { Sidebar } from './Sidebar'

const { humanWorkspace, agentWorkspace, switchToProfile } = vi.hoisted(() => ({
  humanWorkspace: {
    id: 'human-1',
    handle: 'skyfall',
    display_name: 'Skyfall',
    avatar_url: null,
    type: 'human' as const,
    is_active: false,
  },
  agentWorkspace: {
    id: 'agent-1',
    handle: 'sky-bot',
    display_name: 'Sky Bot',
    avatar_url: null,
    type: 'ai' as const,
    is_active: true,
  },
  switchToProfile: vi.fn(),
}))

vi.mock('@lenserfight/features/profile', () => ({
  useLenser: () => ({
    lenser: agentWorkspace,
    redirectToOnboarding: vi.fn(),
  }),
  useHasLenserProfile: () => ({ hasLenser: true, isLoading: false }),
  useLenserWorkspace: () => ({
    workspaces: [humanWorkspace, agentWorkspace],
    activeWorkspace: agentWorkspace,
    humanWorkspace,
  }),
  useWorkspaceSwitchController: () => ({ switchToProfile, isSwitching: false }),
}))

vi.mock('@lenserfight/features/auth', () => ({
  useAuth: () => ({
    logout: vi.fn(),
    isAuthenticated: true,
    redirectToLogin: vi.fn(),
  }),
}))

vi.mock('@lenserfight/features/notifications', () => ({
  useNotifications: () => ({ unreadCount: 0 }),
}))

vi.mock('@lenserfight/features/feedback', () => ({
  FeedbackModal: () => null,
}))

vi.mock('@lenserfight/features/agents', () => ({
  AgentSettingsSheet: () => null,
}))

vi.mock('@lenserfight/ui/theme', () => ({
  useTheme: () => ({ themeMode: 'light', setTheme: vi.fn() }),
}))

vi.mock('@lenserfight/ui/components', () => ({
  Avatar: () => <span aria-hidden="true" />,
  Logo: () => <span>LenserFight</span>,
}))

vi.mock('./agentSidebar', () => ({
  buildAgentSidebarSections: () => [],
}))

describe('Sidebar profile navigation', () => {
  beforeEach(() => {
    switchToProfile.mockReset()
    switchToProfile.mockResolvedValue(humanWorkspace)
  })

  it('switches from an agent workspace to the human profile from My Profile', async () => {
    render(
      <MemoryRouter initialEntries={['/lenser/sky-bot/ag/overview']}>
        <Sidebar
          isOpen
          isMobile={false}
          onCloseMobile={vi.fn()}
          onOpenProfileSetup={vi.fn()}
        />
      </MemoryRouter>
    )

    fireEvent.click(screen.getByRole('button', { name: 'Account menu' }))
    fireEvent.click(screen.getByRole('menuitem', { name: 'My Profile' }))

    await waitFor(() => {
      expect(switchToProfile).toHaveBeenCalledWith(humanWorkspace)
    })
  })
})
