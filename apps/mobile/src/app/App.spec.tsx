import * as React from 'react'
import { fireEvent, render, waitFor } from '@testing-library/react-native'

const mockAuthService = {
  getCurrentUser: jest.fn(),
  onAuthStateChange: jest.fn(),
  login: jest.fn(),
  register: jest.fn(),
  logout: jest.fn(),
  sendMagicLink: jest.fn(),
  signInWithOAuth: jest.fn(),
  resolveHandleToEmail: jest.fn(),
  requestPasswordReset: jest.fn(),
  resetPassword: jest.fn(),
  resendSignupConfirmation: jest.fn(),
}

const mockBattles = [
  {
    id: 'battle-1',
    title: 'Mobile Battle',
    status: 'active',
    battleType: 'standard',
    lensId: 'lens-1',
    createdAt: '2026-05-25T00:00:00Z',
    scheduledStart: null,
    scheduledEnd: null,
  },
]

const mockThreads = [
  {
    id: 'thread-1',
    title: 'Mobile MVP thread',
    content: 'A focused launch thread for the mobile app.',
    author: { id: 'lenser-1', handle: 'skyfall', displayName: 'Skyfall', avatarUrl: null },
    tags: [{ id: 'tag-1', slug: 'mobile', name: 'Mobile' }],
    reactionCount: 2,
    replyCount: 1,
    createdAt: '2026-05-25T00:00:00Z',
    userHasReacted: false,
    visibility: 'public',
    status: 'active',
  },
]

const mockLenses = [
  {
    id: 'lens-1',
    title: 'Mobile Lens',
    description: 'A reusable mobile lens.',
    usageCount: 3,
    createdAt: '2026-05-25T00:00:00Z',
    visibility: 'public',
    status: 'active',
    author: { id: 'lenser-1', handle: 'skyfall', displayName: 'Skyfall', avatarUrl: null },
    tags: [{ id: 'tag-1', slug: 'mobile', name: 'Mobile' }],
  },
]

const mockTags = [
  {
    id: 'tag-1',
    slug: 'mobile',
    name: 'Mobile',
    description: 'Mobile product work.',
    visibility: 'public',
    created_at: '2026-05-25T00:00:00Z',
    count: 5,
    trendingScore: 10,
  },
]

jest.mock('@lenserfight/data/repositories/mobile', () => ({
  authService: mockAuthService,
  battlesService: {
    listBattles: jest.fn(() => Promise.resolve(mockBattles)),
    getBattle: jest.fn(() => Promise.resolve(mockBattles[0])),
  },
  lenserService: {
    getAuthenticatedLenser: jest.fn(() =>
      Promise.resolve({
        id: 'lenser-1',
        user_id: 'user-1',
        handle: 'skyfall',
        display_name: 'Skyfall',
        total_xp: 42,
        current_level: 2,
      })
    ),
    getActiveLenser: jest.fn(() => Promise.resolve(null)),
  },
  threadsService: {
    getThreadsFeed: jest.fn(() =>
      Promise.resolve({ data: mockThreads, meta: { hasNextPage: false } })
    ),
    getThreadDetail: jest.fn(() =>
      Promise.resolve({
        ...mockThreads[0],
        replies: [],
        repliesHasNextPage: false,
        promptBlock: null,
      })
    ),
    getThreadsByTag: jest.fn(() =>
      Promise.resolve({ data: mockThreads, meta: { hasNextPage: false } })
    ),
  },
  lensesService: {
    getLenses: jest.fn(() =>
      Promise.resolve({ data: mockLenses, meta: { hasNextPage: false } })
    ),
    getLensDetail: jest.fn(() =>
      Promise.resolve({
        ...mockLenses[0],
        content: 'Full lens content for mobile detail.',
        reactionCounts: { like: 0, love: 0, clap: 0, saved: 0, copy: 0 },
        isSaved: false,
        parentLensId: null,
        forkedFromExecutionId: null,
        params: [],
        latestVersionId: null,
        latestPublishedVersion: null,
      })
    ),
    filter: jest.fn(() =>
      Promise.resolve({ data: mockLenses, meta: { hasNextPage: false } })
    ),
  },
  tagService: {
    getCloud: jest.fn(() => Promise.resolve(mockTags)),
    getTagDetails: jest.fn(() => Promise.resolve(mockTags[0])),
  },
}))

const AppRoot = require('./AppRoot').default as React.ComponentType

beforeEach(() => {
  jest.clearAllMocks()
  mockAuthService.onAuthStateChange.mockReturnValue(() => undefined)
  mockAuthService.login.mockResolvedValue({ id: 'user-1', email: 'user@example.com' })
  mockAuthService.register.mockResolvedValue({ id: 'user-1', email: 'user@example.com' })
  mockAuthService.sendMagicLink.mockResolvedValue(undefined)
  mockAuthService.signInWithOAuth.mockResolvedValue(undefined)
  mockAuthService.logout.mockResolvedValue(undefined)
})

test('auth entry renders login, magic link, register, and OAuth controls', async () => {
  mockAuthService.getCurrentUser.mockResolvedValue(null)

  const screen = render(<AppRoot />)

  await waitFor(() => expect(screen.getByTestId('login-email')).toBeTruthy())
  expect(screen.getByTestId('login-password')).toBeTruthy()
  expect(screen.getByTestId('login-submit')).toBeTruthy()
  expect(screen.getByTestId('oauth-google')).toBeTruthy()
  expect(screen.getByTestId('oauth-github')).toBeTruthy()
  expect(screen.getByTestId('oauth-apple')).toBeTruthy()

  fireEvent.press(screen.getByText('Use email link'))
  expect(await screen.findByTestId('magic-email')).toBeTruthy()

  fireEvent.press(screen.getByText('Back to sign in'))
  fireEvent.press(await screen.findByText('Create an account'))
  expect(await screen.findByTestId('register-email')).toBeTruthy()
})

test('authenticated shell renders lists and opens detail screens', async () => {
  mockAuthService.getCurrentUser.mockResolvedValue({ id: 'user-1', email: 'user@example.com' })

  const screen = render(<AppRoot />)

  expect(await screen.findByTestId('thread-list-screen')).toBeTruthy()
  expect(await screen.findByText('Mobile MVP thread')).toBeTruthy()
  fireEvent.press(screen.getByText('Mobile MVP thread'))
  expect(await screen.findByTestId('thread-detail-screen')).toBeTruthy()

  fireEvent.press(screen.getByLabelText('Back'))
  fireEvent.press(screen.getByText('Lenses'))
  expect(await screen.findByTestId('lens-list-screen')).toBeTruthy()
  fireEvent.press(await screen.findByText('Mobile Lens'))
  expect(await screen.findByTestId('lens-detail-screen')).toBeTruthy()

  fireEvent.press(screen.getByLabelText('Back'))
  fireEvent.press(screen.getByText('Tags'))
  expect(await screen.findByTestId('tag-list-screen')).toBeTruthy()
  fireEvent.press(await screen.findByText('Mobile'))
  expect(await screen.findByTestId('tag-detail-screen')).toBeTruthy()
})

test('profile tab renders authenticated identity and sign out action', async () => {
  mockAuthService.getCurrentUser.mockResolvedValue({ id: 'user-1', email: 'user@example.com' })

  const screen = render(<AppRoot />)

  expect(await screen.findByTestId('thread-list-screen')).toBeTruthy()
  fireEvent.press(screen.getByText('Profile'))
  expect(await screen.findByTestId('profile-screen')).toBeTruthy()
  expect(await screen.findByText('Skyfall')).toBeTruthy()
  expect(screen.getByText('Sign out')).toBeTruthy()
})

test('battles tab renders list and opens detail screen', async () => {
  mockAuthService.getCurrentUser.mockResolvedValue({ id: 'user-1', email: 'user@example.com' })

  const screen = render(<AppRoot />)

  expect(await screen.findByTestId('thread-list-screen')).toBeTruthy()
  fireEvent.press(screen.getByText('Battles'))
  expect(await screen.findByTestId('battle-list-screen')).toBeTruthy()
  fireEvent.press(await screen.findByText('Mobile Battle'))
  expect(await screen.findByTestId('battle-detail-screen')).toBeTruthy()
})
