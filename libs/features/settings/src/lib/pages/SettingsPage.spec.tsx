import React from 'react'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi, beforeEach } from 'vitest'

const {
  mockUseWallet,
  mockUseChainabitCapabilities,
  mockReconnect,
  stableLenser,
  stableUser,
  stableUpdateLenserProfile,
} = vi.hoisted(() => ({
  mockUseWallet: vi.fn(),
  mockUseChainabitCapabilities: vi.fn(),
  mockReconnect: vi.fn(),
  stableLenser: { id: 'lenser-1', type: 'human' },
  stableUser: { id: 'user-1', email: 'lenser@example.com', user_metadata: {} },
  stableUpdateLenserProfile: vi.fn(),
}))

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom')
  return {
    ...actual,
    useParams: () => ({ tab: 'account' }),
    useNavigate: () => vi.fn(),
  }
})

vi.mock('@lenserfight/features/auth', () => ({
  useAuth: () => ({
    user: stableUser,
    isAuthenticated: true,
    isLoading: false,
    logout: vi.fn(),
  }),
}))

vi.mock('@lenserfight/features/notifications', () => ({
  useNotifications: () => ({ notifications: [], isLoading: false, markAllRead: vi.fn() }),
}))

vi.mock('@lenserfight/features/profile', () => ({
  useLenser: () => ({ lenser: stableLenser, updateLenserProfile: stableUpdateLenserProfile }),
  AvatarSelectionModal: () => null,
}))

vi.mock('@lenserfight/features/store', () => ({
  useWallet: () => mockUseWallet(),
  useChainabitCapabilities: () => mockUseChainabitCapabilities(),
}))

vi.mock('@lenserfight/data/repositories', () => ({
  feedbackService: { getUserFeedbacks: vi.fn().mockResolvedValue({ data: [], total: 0 }) },
  lenserService: {},
  socialLinksService: { getLinks: vi.fn().mockResolvedValue([]), syncLinks: vi.fn() },
}))

vi.mock('@tanstack/react-query', () => ({
  useQuery: () => ({ data: { data: [], total: 0 }, isLoading: false }),
}))

vi.mock('@lenserfight/ui/forms', () => ({
  InputField: () => null,
  SelectField: () => null,
}))

vi.mock('@lenserfight/ui/modals', () => ({
  ConfirmModal: () => null,
}))

vi.mock('@lenserfight/ui/components', () => ({
  Avatar: () => null,
  Button: ({ children, onClick, disabled }: any) => (
    <button onClick={onClick} disabled={disabled}>{children}</button>
  ),
  Card: ({ children }: any) => <div>{children}</div>,
  DangerZone: () => null,
  HelpButton: () => null,
  Table: () => null,
  Column: () => null,
}))

vi.mock('../components/AgentsTab', () => ({ AgentsTab: () => null }))
vi.mock('../components/ApiKeysTab', () => ({ ApiKeysTab: () => null }))
vi.mock('../components/GeneralTab', () => ({ GeneralTab: () => null }))
vi.mock('../components/NotificationPreferencesTab', () => ({ NotificationPreferencesTab: () => null }))
vi.mock('../components/PartnerAccountsTab', () => ({ PartnerAccountsTab: () => null }))
vi.mock('../components/OAuthConnectionsSection', () => ({ OAuthConnectionsSection: () => null }))

import { SettingsPage } from './SettingsPage'

const renderPage = () =>
  render(
    <MemoryRouter>
      <SettingsPage />
    </MemoryRouter>
  )

describe('SettingsPage — wallet balance card', () => {
  beforeEach(() => {
    mockUseWallet.mockReset()
    mockUseChainabitCapabilities.mockReset()
    mockReconnect.mockReset()
    mockUseWallet.mockReturnValue({ balance: 500, hasBalance: true, isLoading: false, error: null, redirectToStore: vi.fn() })
  })

  it('renders "Add credits" as an active external link when Chainabit is connected', () => {
    mockUseChainabitCapabilities.mockReturnValue({
      state: 'connected',
      credits: 500,
      models: null,
      reconnect: mockReconnect,
      invalidate: vi.fn(),
    })

    renderPage()

    const link = screen.getByRole('link', { name: 'Add credits' }) as HTMLAnchorElement
    expect(link.href).toContain('https://app.chainabit.com/billing')
  })

  it('disables "Add credits" and routes to OAuth reconnect when no Chainabit account is connected', () => {
    mockUseChainabitCapabilities.mockReturnValue({
      state: 'not_connected',
      credits: null,
      models: null,
      reconnect: mockReconnect,
      invalidate: vi.fn(),
    })

    renderPage()

    expect(screen.queryByRole('link', { name: 'Add credits' })).toBeNull()

    const button = screen.getByRole('button', { name: 'Add credits' })
    button.click()
    expect(mockReconnect).toHaveBeenCalledTimes(1)
  })

  it('disables the "Add credits" button while Chainabit connection state is loading', () => {
    mockUseChainabitCapabilities.mockReturnValue({
      state: 'loading',
      credits: null,
      models: null,
      reconnect: mockReconnect,
      invalidate: vi.fn(),
    })

    renderPage()

    expect((screen.getByRole('button', { name: 'Add credits' }) as HTMLButtonElement).disabled).toBe(true)
  })
})
