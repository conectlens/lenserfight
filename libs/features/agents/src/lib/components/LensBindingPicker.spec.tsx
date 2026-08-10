import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import React from 'react'
import { vi } from 'vitest'

const { mockUseAgentLensPicker, mockCloneLens, mockDeleteLens, mockGetVersions, mockNavigate } =
  vi.hoisted(() => ({
    mockUseAgentLensPicker: vi.fn(),
    mockCloneLens: vi.fn(),
    mockDeleteLens: vi.fn(),
    mockGetVersions: vi.fn(),
    mockNavigate: vi.fn(),
  }))

vi.mock('@lenserfight/data/cache', () => ({
  queryKeys: {
    lenses: { all: ['lenses'] },
    lensVersions: { list: (id: string) => ['lenses', 'versions', id] },
  },
}))

vi.mock('@lenserfight/data/repositories', () => ({
  lensesService: {
    getVersions: mockGetVersions,
    cloneLens: mockCloneLens,
    deleteLens: mockDeleteLens,
  },
}))

vi.mock('@lenserfight/shared/i18n-routing', () => ({
  LocaleLink: ({ children, to, ...rest }: any) => (
    <a href={to} {...rest}>
      {children}
    </a>
  ),
}))

vi.mock('@lenserfight/ui/components', () => ({
  Button: ({ children, onClick, disabled, isLoading }: any) => (
    <button onClick={onClick} disabled={disabled || isLoading}>
      {children}
    </button>
  ),
}))

vi.mock('@lenserfight/ui/forms', () => ({
  SelectField: ({ label, value, onChange, options }: any) => (
    <select aria-label={label} value={value} onChange={(e) => onChange(e.target.value)}>
      {options.map((o: any) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  ),
}))

vi.mock('@lenserfight/ui/modals', () => ({
  ConfirmModal: ({ isOpen, onClose, onConfirm, title, isLoading }: any) =>
    isOpen ? (
      <div role="dialog" aria-label={title}>
        <button onClick={onConfirm} disabled={isLoading}>
          Delete
        </button>
        <button onClick={onClose}>Cancel</button>
      </div>
    ) : null,
}))

vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
}))

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}))

vi.mock('../hooks/useAgentLensPicker', () => ({
  useAgentLensPicker: (...args: unknown[]) => mockUseAgentLensPicker(...args),
}))

vi.mock('./EmptyPanel', () => ({
  EmptyPanel: ({ title }: any) => <p>{title}</p>,
}))

vi.mock('./sections/_shared', () => ({
  ProfileCard: ({ children, toolbar, title }: any) => (
    <div>
      <p>{title}</p>
      {toolbar}
      {children}
    </div>
  ),
}))

import { LensBindingPicker } from './LensBindingPicker'

const OWN_LENS = { id: 'lens-1', title: 'My Lens', description: 'A test lens' }

function renderPicker() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <LensBindingPicker enabled onSelect={vi.fn()} />
    </QueryClientProvider>
  )
}

describe('LensBindingPicker — row actions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetVersions.mockResolvedValue([])
    mockUseAgentLensPicker.mockReturnValue({
      ownLenses: [OWN_LENS],
      communityLenses: [],
      isLoading: false,
      hasNextOwnPage: false,
      fetchNextOwnPage: vi.fn(),
      isFetchingNextOwnPage: false,
      hasNextCommunityPage: false,
      fetchNextCommunityPage: vi.fn(),
      isFetchingNextCommunityPage: false,
    })
  })

  it('renders an Open link pointing at the lens detail page in a new tab', () => {
    renderPicker()
    const openLink = screen.getByTitle('Open lens detail in a new tab')
    expect(openLink.getAttribute('href')).toBe('/lenses/lens-1')
    expect(openLink.getAttribute('target')).toBe('_blank')
  })

  it('navigates to the lens editor on Edit', () => {
    renderPicker()
    fireEvent.click(screen.getByTitle('Edit lens'))
    expect(mockNavigate).toHaveBeenCalledWith('/lenses/lens-1/main')
  })

  it('copies the lens via the same clone mutation used for community fork', async () => {
    mockCloneLens.mockResolvedValue('lens-copy-1')
    renderPicker()

    fireEvent.click(screen.getByTitle('Copy lens'))

    await waitFor(() => {
      expect(mockCloneLens).toHaveBeenCalledWith('lens-1')
    })
  })

  it('deletes the lens only after confirming', async () => {
    mockDeleteLens.mockResolvedValue(undefined)
    renderPicker()

    fireEvent.click(screen.getByTitle('Delete lens'))
    expect(mockDeleteLens).not.toHaveBeenCalled()

    fireEvent.click(screen.getByRole('dialog').querySelector('button')!)

    await waitFor(() => {
      expect(mockDeleteLens).toHaveBeenCalledWith('lens-1')
    })
  })

  it('does not delete when the confirm dialog is cancelled', () => {
    renderPicker()

    fireEvent.click(screen.getByTitle('Delete lens'))
    fireEvent.click(screen.getByText('Cancel'))

    expect(mockDeleteLens).not.toHaveBeenCalled()
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('selects the lens when its title is clicked', () => {
    renderPicker()
    fireEvent.click(screen.getByText('My Lens'))
    // Selecting reveals the version selector, confirming selection state changed.
    expect(screen.getByLabelText('Version')).toBeTruthy()
  })
})
