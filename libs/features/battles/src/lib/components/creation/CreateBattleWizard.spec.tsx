import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import React from 'react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { vi } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

// ── Hoisted mocks ─────────────────────────────────────────────────────────────

const { mockCreateBattle, mockListWorkflows, mockGetPersonalFeed } = vi.hoisted(() => ({
  mockCreateBattle: vi.fn(),
  mockListWorkflows: vi.fn(),
  mockGetPersonalFeed: vi.fn(),
}))

vi.mock('@lenserfight/data/repositories', () => ({
  battlesService: {
    createBattle: mockCreateBattle,
    updateBattle: vi.fn(),
    getBattleById: vi.fn(),
    getContenders: vi.fn().mockResolvedValue([]),
    removeContender: vi.fn(),
    scheduleBattle: vi.fn(),
  },
  battlesRepository: {
    listPublicBattleTemplates: vi.fn().mockResolvedValue([]),
  },
  workflowsService: {
    listByLenser: mockListWorkflows,
    listByLenserPaginated: vi.fn().mockResolvedValue({ data: [{ id: 'wf-1', title: 'My Workflow', description: 'Test workflow', lenser_id: 'user-1', visibility: 'private', battle_count: 0, created_at: '', updated_at: '' }] }),
    getPopular: vi.fn().mockResolvedValue({ data: [] }),
  },
  lensesService: { getPersonalFeed: mockGetPersonalFeed },
  battleExecutionService: { upsertExecutionConfig: vi.fn() },
  // Theme controller transitively imports this from the data barrel; a stub is
  // enough since the wizard doesn't read theme prefs.
  SupabasePreferencesRepository: class {
    getTheme = vi.fn().mockResolvedValue(null)
    setTheme = vi.fn().mockResolvedValue(undefined)
  },
}))

vi.mock('@lenserfight/features/auth', () => ({
  useAuth: () => ({ user: { id: 'user-1' } }),
}))

vi.mock('@lenserfight/features/generations', () => ({
  useAIProviders: () => ({ data: [], isLoading: false }),
  useAIModelsByProvider: () => ({ data: [], isLoading: false }),
}))

vi.mock('@lenserfight/features/lenses', () => ({
  useFundingSource: () => ({
    fundingSource: 'platform_credit',
    setFundingSource: vi.fn(),
    selectedKeyRefId: null,
    setSelectedKeyRefId: vi.fn(),
    availableKeys: [],
    selectedLocalKeyId: null,
    setSelectedLocalKeyId: vi.fn(),
    localKeys: [],
    addLocalKey: vi.fn(),
    removeLocalKey: vi.fn(),
    updateLocalKey: vi.fn(),
    walletBalance: 0,
    canUseBYOK: false,
  }),
  FundingSourceToggle: () => null,
}))

vi.mock('@lenserfight/features/profile', () => ({
  useLenser: () => ({ lenser: { id: 'lenser-1' } }),
}))

vi.mock('@lenserfight/features/store', () => ({
  useChainabitConnection: () => ({ state: { status: 'disconnected' }, models: [], reconnect: vi.fn() }),
}))

import { CreateBattleWizard } from './CreateBattleWizard'

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeQueryClient() {
  return new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
}

function renderWizard(url = '/battles/create') {
  const qc = makeQueryClient()
  const onSuccess = vi.fn()
  const onClose = vi.fn()
  render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={[url]}>
        <Routes>
          <Route path="/battles/create" element={<CreateBattleWizard onSuccess={onSuccess} onClose={onClose} />} />
          <Route path="*" element={<div data-testid="navigated" />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  )
  return { onSuccess, onClose }
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('CreateBattleWizard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockCreateBattle.mockResolvedValue({ id: 'battle-1', slug: 'test-battle' })
    mockListWorkflows.mockResolvedValue([
      { id: 'wf-1', title: 'My Workflow', description: 'Test workflow', lenser_id: 'user-1', visibility: 'private', battle_count: 0, created_at: '', updated_at: '' },
    ])
    mockGetPersonalFeed.mockResolvedValue({
      data: [{ id: 'lens-1', title: 'My Lens', visibility: 'private' }],
    })
  })

  it('renders step 0 with two format cards and no selection', () => {
    renderWizard()
    expect(screen.getByText('Workflow Battle')).toBeInTheDocument()
    expect(screen.getByText('Lens Battle')).toBeInTheDocument()
  })

  it('cannot advance step 0 without selecting a format', () => {
    renderWizard()
    const nextBtn = screen.getByRole('button', { name: /next/i })
    expect(nextBtn).toBeDisabled()
  })

  it('selecting Workflow card enables Next and shows step indicator', () => {
    renderWizard()
    fireEvent.click(screen.getByText('Workflow Battle'))
    const nextBtn = screen.getByRole('button', { name: /next/i })
    expect(nextBtn).not.toBeDisabled()
  })

  it('selecting Lens card enables Next', () => {
    renderWizard()
    fireEvent.click(screen.getByText('Lens Battle'))
    const nextBtn = screen.getByRole('button', { name: /next/i })
    expect(nextBtn).not.toBeDisabled()
  })

  it('?workflow_id param skips to step 1 in workflow mode with pre-selection', async () => {
    renderWizard('/battles/create?workflow_id=wf-preselected&step=1')
    // Step 1 workflow picker should render
    await waitFor(() => expect(screen.getByText('My Workflow')).toBeInTheDocument())
  })

  it('clicking Workflow card then Next shows workflow list', async () => {
    renderWizard()
    fireEvent.click(screen.getByText('Workflow Battle'))
    fireEvent.click(screen.getByRole('button', { name: /next/i }))
    await waitFor(() => expect(screen.getByText('My Workflow')).toBeInTheDocument())
  })

  it('clicking Lens card then Next shows lens list', async () => {
    renderWizard()
    fireEvent.click(screen.getByText('Lens Battle'))
    fireEvent.click(screen.getByRole('button', { name: /next/i }))
    await waitFor(() => expect(screen.getByText('My Lens')).toBeInTheDocument())
  })

  it('shows error in step 4 when createBattle rejects', async () => {
    mockCreateBattle.mockRejectedValue(new Error('Server error'))
    renderWizard()

    // Step 0: pick Workflow
    fireEvent.click(screen.getByText('Workflow Battle'))
    fireEvent.click(screen.getByRole('button', { name: /next/i }))

    // Step 1: pick workflow
    await waitFor(() => screen.getByText('My Workflow'))
    fireEvent.click(screen.getByText('My Workflow'))
    fireEvent.click(screen.getByRole('button', { name: /next/i }))

    // Step 2: fill title
    fireEvent.change(screen.getByPlaceholderText(/battle title|e\.g\. GPT/i), {
      target: { value: 'My Test Battle' },
    })
    fireEvent.click(screen.getByRole('button', { name: /next/i }))

    // Step 3: pick Workflow Battle type (matrix-compatible with workflow
    // format AND not in AI_BATTLE_TYPES — avoids needing a configured
    // provider/model at step 4 just to satisfy aiExecutionValid).
    await waitFor(() => screen.getByTestId('battle-type-card-workflow_battle'))
    fireEvent.click(screen.getByTestId('battle-type-card-workflow_battle'))
    fireEvent.click(screen.getByRole('button', { name: /next/i }))

    // Step 4: click "Create Battle"
    fireEvent.click(screen.getByRole('button', { name: /create battle/i }))

    await waitFor(() => expect(screen.getByText('Server error')).toBeInTheDocument())
  })

  it('disables incompatible battle types based on the selected format', async () => {
    renderWizard()

    // Step 0 → Workflow
    fireEvent.click(screen.getByText('Workflow Battle'))
    fireEvent.click(screen.getByRole('button', { name: /next/i }))

    // Step 1 → workflow
    await waitFor(() => screen.getByText('My Workflow'))
    fireEvent.click(screen.getByText('My Workflow'))
    fireEvent.click(screen.getByRole('button', { name: /next/i }))

    // Step 2 → title
    fireEvent.change(screen.getByPlaceholderText(/battle title|e\.g\. GPT/i), {
      target: { value: 'Compatibility Test' },
    })
    fireEvent.click(screen.getByRole('button', { name: /next/i }))

    // Step 3: Human vs Human is unavailable for the workflow format.
    await waitFor(() => screen.getByTestId('battle-type-card-human_vs_human_open_votes'))
    const hvh = screen.getByTestId('battle-type-card-human_vs_human_open_votes')
    expect(hvh).toBeDisabled()
    expect(hvh.getAttribute('aria-disabled')).toBe('true')

    // AI vs AI must remain enabled (flagship for the workflow format).
    const aiVsAi = screen.getByTestId('battle-type-card-ai_vs_ai')
    expect(aiVsAi).not.toBeDisabled()
  })
})
