import { fireEvent, render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import React from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@lenserfight/data/repositories', () => ({
  lensesService: {
    getPersonalFeed: vi.fn().mockResolvedValue({ data: [], meta: { hasNextPage: false } }),
    sort: vi.fn().mockResolvedValue({ data: [], meta: { hasNextPage: false } }),
    search: vi.fn().mockResolvedValue({ data: [] }),
  },
}))

vi.mock('@lenserfight/features/auth', () => ({
  useAuth: () => ({ user: { id: 'user-1' } }),
}))

vi.mock('@lenserfight/features/lens-kinds', () => ({
  LENS_KIND_ORDER: [],
  LENS_KIND_REGISTRY: {},
  resolveLensKindFromTagSlugs: () => null,
}))

vi.mock('@lenserfight/infra/execution', () => ({
  WORKFLOW_NODE_CATEGORIES: ['trigger', 'logic'] as const,
  getWorkflowNodeCategoryLabel: (c: string) => c,
  getWorkflowNodesByCategory: (category: string) => [
    {
      type: `${category}_node`,
      displayName: `${category} node`,
      category,
      iconKey: 'Workflow',
      color: 'text-violet-500',
      docsPath: null,
    },
  ],
  searchWorkflowNodeCatalog: (q: string) => [
    {
      type: 'match_node',
      displayName: `match ${q}`,
      category: 'logic',
      iconKey: 'Workflow',
      color: 'text-violet-500',
      docsPath: null,
    },
  ],
}))

vi.mock('@lenserfight/ui/components', () => ({
  Button: ({ children, onClick, title, ...rest }: React.ButtonHTMLAttributes<HTMLButtonElement> & { children?: React.ReactNode }) =>
    React.createElement('button', { onClick, title, ...rest }, children),
  Tooltip: ({ children }: { children: React.ReactNode }) => children,
}))

vi.mock('@lenserfight/ui/forms', () => ({
  SearchBar: ({ value, onChange, placeholder }: { value: string; onChange: (e: React.ChangeEvent<HTMLInputElement>) => void; placeholder?: string }) =>
    React.createElement('input', { value, onChange, placeholder, 'data-testid': 'palette-search' }),
}))

vi.mock('./WorkflowNodeDocsButton', () => ({
  WorkflowNodeDocsButton: () => null,
}))

import { WorkflowLensPalette } from './WorkflowLensPalette'

const PALETTE_MODE_STORAGE_KEY = 'lf:palette:mode'

function renderPalette() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return render(
    <QueryClientProvider client={queryClient}>
      <WorkflowLensPalette onDragStart={vi.fn()} />
    </QueryClientProvider>,
  )
}

describe('WorkflowLensPalette palette mode toggle', () => {
  beforeEach(() => {
    window.localStorage.clear()
    class MockIntersectionObserver {
      observe() { /* noop */ }
      unobserve() { /* noop */ }
      disconnect() { /* noop */ }
      takeRecords() { return [] }
      root = null
      rootMargin = ''
      thresholds = []
    }
    vi.stubGlobal('IntersectionObserver', MockIntersectionObserver)
  })

  afterEach(() => {
    window.localStorage.clear()
    vi.unstubAllGlobals()
  })

  it('defaults to split mode and persists grid selection to localStorage', () => {
    renderPalette()
    const splitBtn = screen.getByRole('button', { name: /split layout/i })
    const gridBtn = screen.getByRole('button', { name: /grid layout/i })

    expect(splitBtn.getAttribute('aria-pressed')).toBe('true')
    expect(gridBtn.getAttribute('aria-pressed')).toBe('false')

    fireEvent.click(gridBtn)

    expect(gridBtn.getAttribute('aria-pressed')).toBe('true')
    expect(splitBtn.getAttribute('aria-pressed')).toBe('false')
    expect(window.localStorage.getItem(PALETTE_MODE_STORAGE_KEY)).toBe('grid')
  })

  it('restores grid mode from localStorage on mount', () => {
    window.localStorage.setItem(PALETTE_MODE_STORAGE_KEY, 'grid')
    renderPalette()
    expect(screen.getByRole('button', { name: /grid layout/i }).getAttribute('aria-pressed')).toBe('true')
    expect(screen.getByRole('button', { name: /split layout/i }).getAttribute('aria-pressed')).toBe('false')
  })

  it('honors the search filter for utility nodes in both modes', () => {
    renderPalette()
    const utilityPanel = screen.getByTestId('palette-utility-panel')
    expect(utilityPanel.textContent).toContain('trigger node')
    expect(utilityPanel.textContent).toContain('logic node')

    fireEvent.change(screen.getByTestId('palette-search'), { target: { value: 'foo' } })
    expect(screen.getByTestId('palette-utility-panel').textContent).toContain('match foo')

    fireEvent.click(screen.getByRole('button', { name: /grid layout/i }))
    expect(screen.getByTestId('palette-utility-panel').textContent).toContain('match foo')
  })
})
