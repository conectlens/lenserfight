import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Dialog } from '@lenserfight/ui/overlays'
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

vi.mock('@lenserfight/data/repositories', () => ({
  SupabasePreferencesRepository: vi.fn().mockImplementation(function SupabasePreferencesRepository() {
    return {
    get: vi.fn().mockResolvedValue(null),
    set: vi.fn().mockResolvedValue(undefined),
    }
  }),
  SupabaseAgentAnalyticsRepository: vi.fn().mockImplementation(function SupabaseAgentAnalyticsRepository() {
    return {
      getSummary: vi.fn().mockResolvedValue(null),
      getRuns: vi.fn().mockResolvedValue([]),
      getCosts: vi.fn().mockResolvedValue([]),
    }
  }),
  SupabaseWorkspaceControlsRepository: vi.fn().mockImplementation(function SupabaseWorkspaceControlsRepository() {
    return {
      listRuns: vi.fn().mockResolvedValue([]),
      getRuns: vi.fn().mockResolvedValue([]),
      getControls: vi.fn().mockResolvedValue(null),
    }
  }),
  SupabaseRunReportsRepository: vi.fn().mockImplementation(function SupabaseRunReportsRepository() {
    return {
      listReports: vi.fn().mockResolvedValue([]),
      getReport: vi.fn().mockResolvedValue(null),
    }
  }),
  SupabasePolicyEvaluationsRepository: vi.fn().mockImplementation(function SupabasePolicyEvaluationsRepository() {
    return {
      list: vi.fn().mockResolvedValue([]),
      listPolicyLog: vi.fn().mockResolvedValue([]),
    }
  }),
  lensesService: {
    getPersonalFeed: vi.fn().mockResolvedValue({ data: [] }),
    sort: vi.fn().mockResolvedValue({ data: [] }),
    search: vi.fn().mockResolvedValue({ data: [] }),
  },
  workflowsService: {
    forkWorkflow: vi.fn().mockResolvedValue({ id: 'forked-workflow' }),
    upsertNodes: vi.fn().mockResolvedValue([]),
    upsertEdges: vi.fn().mockResolvedValue([]),
  },
}))

vi.mock('@lenserfight/features/auth', () => ({
  useAuth: () => ({ user: { id: 'user-1' } }),
}))

vi.mock('@lenserfight/features/generations', () => ({
  useAIModels: () => ({ models: [], isLoading: false }),
}))

vi.mock('@lenserfight/features/lens-kinds', () => ({
  LENS_KIND_ORDER: [],
  LENS_KIND_REGISTRY: {},
  resolveLensKindFromTagSlugs: () => null,
}))

vi.mock('@lenserfight/features/lenses', () => ({
  FundingSourceToggle: () => null,
  useFundingSource: () => ({
    fundingSource: 'platform_credit',
    setFundingSource: vi.fn(),
    selectedKeyRefId: null,
    setSelectedKeyRefId: vi.fn(),
    availableKeys: [],
    selectedLocalKeyId: null,
    setSelectedLocalKeyId: vi.fn(),
    localKeys: [],
    localKeyAvailability: 'available',
    addLocalKey: vi.fn(),
    removeLocalKey: vi.fn(),
    updateLocalKey: vi.fn(),
    pairGateway: vi.fn(),
    refreshLocalKeys: vi.fn(),
    walletBalance: null,
    canUseBYOK: false,
    isReady: true,
  }),
}))

vi.mock('@lenserfight/features/store', () => ({
  useChainabitConnection: () => ({
    state: 'idle',
    models: [],
    reconnect: vi.fn(),
  }),
}))

vi.mock('../hooks/useTemplateWorkflows', () => ({
  useTemplateWorkflows: () => ({ data: [], isLoading: false }),
}))

vi.mock('../hooks/useUpdateWorkflow', () => ({
  useUpdateWorkflow: () => ({ mutateAsync: vi.fn(), isPending: false, error: null }),
}))

vi.mock('./WorkflowCronPanel', () => ({
  WorkflowCronPanel: () => null,
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
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/workflows/new']}>
          <Routes>
            <Route
              path="/workflows/new"
              element={
                <Dialog open onClose={vi.fn()}>
                  <CreateWorkflowWizard onCreated={onCreated} onCancel={vi.fn()} />
                </Dialog>
              }
            />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    )

    fireEvent.click(screen.getAllByRole('button', { name: 'Start blank' })[0]!)

    fireEvent.change(screen.getByLabelText(/Workflow title/), {
      target: { value: 'Research workflow' },
    })
    fireEvent.change(screen.getByLabelText(/Description/), {
      target: { value: 'Summarise and polish' },
    })
    fireEvent.click(screen.getByRole('button', { name: /Next/ }))

    expect(screen.getByText('Choose how to run')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: /Next/ }))

    expect(screen.getByText('Choose starting lenses')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: /Next/ }))

    await waitFor(() => {
      expect(mockSubmit).toHaveBeenCalledWith({
        title: 'Research workflow',
        description: 'Summarise and polish',
        visibility: 'public',
      })
    })

    await waitFor(() => {
      expect(screen.getByText('Schedule your workflow')).toBeTruthy()
    })
    fireEvent.click(screen.getByRole('button', { name: 'Skip for now' }))

    await waitFor(() => {
      expect(onCreated).toHaveBeenCalledWith('workflow-1')
    })
  })
})
