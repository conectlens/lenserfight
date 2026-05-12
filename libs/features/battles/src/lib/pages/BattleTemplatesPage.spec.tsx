import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import React from 'react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { describe, expect, it, vi, beforeEach } from 'vitest'

const { mockListPublicTemplates } = vi.hoisted(() => ({
  mockListPublicTemplates: vi.fn(),
}))

vi.mock('@lenserfight/data/repositories', () => ({
  battlesRepository: { listPublicBattleTemplates: mockListPublicTemplates },
}))

import { BattleTemplatesPage } from './BattleTemplatesPage'

function makeQueryClient() {
  return new QueryClient({ defaultOptions: { queries: { retry: false } } })
}

function renderPage() {
  const qc = makeQueryClient()
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <BattleTemplatesPage />
      </MemoryRouter>
    </QueryClientProvider>
  )
}

describe('BattleTemplatesPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders template cards from the repository', async () => {
    mockListPublicTemplates.mockResolvedValueOnce([
      {
        id: 't1',
        title: 'Reasoning Quality Shootout',
        description: 'Classic head-to-head on stepwise reasoning.',
        task_prompt: 'Reason step-by-step about …',
        is_public: true,
        max_contenders: 2,
        category: 'technical',
        created_at: '',
        updated_at: '',
      },
    ])

    renderPage()

    await waitFor(() =>
      expect(screen.getByText('Reasoning Quality Shootout')).toBeInTheDocument()
    )
    expect(screen.getByText(/Technical/i)).toBeInTheDocument()
  })

  it('narrows results to the chosen category', async () => {
    mockListPublicTemplates
      .mockResolvedValueOnce([
        { id: 't1', title: 'Tech 1', description: '', task_prompt: '', is_public: true, max_contenders: 2, category: 'technical', created_at: '', updated_at: '' },
        { id: 't2', title: 'Creative 1', description: '', task_prompt: '', is_public: true, max_contenders: 2, category: 'creative', created_at: '', updated_at: '' },
      ])
      .mockResolvedValueOnce([
        { id: 't2', title: 'Creative 1', description: '', task_prompt: '', is_public: true, max_contenders: 2, category: 'creative', created_at: '', updated_at: '' },
      ])

    renderPage()

    await waitFor(() => expect(screen.getByText('Tech 1')).toBeInTheDocument())
    fireEvent.click(screen.getByRole('tab', { name: 'Creative' }))

    await waitFor(() => {
      expect(mockListPublicTemplates).toHaveBeenLastCalledWith('creative')
    })
  })

  it('renders the empty state when no public templates exist', async () => {
    mockListPublicTemplates.mockResolvedValueOnce([])
    renderPage()
    await waitFor(() =>
      expect(screen.getByText(/No public templates yet/i)).toBeInTheDocument()
    )
  })
})
