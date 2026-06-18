import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import React from 'react'
import { describe, beforeEach, expect, it, vi } from 'vitest'

const { mockListSavedPresets, mockDeleteSavedPreset, mockUpdateSavedPreset } = vi.hoisted(() => ({
  mockListSavedPresets: vi.fn(),
  mockDeleteSavedPreset: vi.fn(),
  mockUpdateSavedPreset: vi.fn(),
}))

vi.mock('@lenserfight/data/repositories', () => ({
  savedPresetsRepository: {
    listSavedPresets: (...args: any[]) => mockListSavedPresets(...args),
    deleteSavedPreset: (...args: any[]) => mockDeleteSavedPreset(...args),
    updateSavedPreset: (...args: any[]) => mockUpdateSavedPreset(...args),
  },
}))

vi.mock('@lenserfight/data/cache', () => ({
  queryKeys: {
    savedPresets: {
      all: ['savedPresets'],
      byVersion: (versionId: string) => ['savedPresets', 'byVersion', versionId],
    },
  },
}))

vi.mock('@lenserfight/ui/overlays', () => ({
  AlertDialog: ({ open, title, confirmAction }: any) =>
    open
      ? React.createElement(
          'div',
          null,
          React.createElement('p', null, title),
          React.createElement('button', { onClick: confirmAction?.onClick }, confirmAction?.label),
        )
      : null,
}))

vi.mock('./SavedPresetExportModal', () => ({
  SavedPresetExportModal: () => null,
}))

import { SavedPresetsPanel } from './SavedPresetsPanel'

const makeQueryClient = () =>
  new QueryClient({ defaultOptions: { queries: { retry: false } } })

const renderPanel = (props: Partial<React.ComponentProps<typeof SavedPresetsPanel>> = {}) => {
  const qc = makeQueryClient()
  return render(
    <QueryClientProvider client={qc}>
      <SavedPresetsPanel
        lensId="lens-1"
        lensVersionId="version-1"
        onApplyPreset={vi.fn()}
        {...props}
      />
    </QueryClientProvider>,
  )
}

const samplePreset = {
  id: 'preset-1',
  lenser_id: 'lenser-1',
  lens_id: 'lens-1',
  lens_version_id: 'version-1',
  name: 'My Preset',
  note: null,
  values: { tone: 'formal' },
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
}

describe('SavedPresetsPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockDeleteSavedPreset.mockResolvedValue(undefined)
    mockUpdateSavedPreset.mockResolvedValue(samplePreset)
  })

  it('shows loading state initially', () => {
    // listSavedPresets never resolves in this test
    mockListSavedPresets.mockReturnValue(new Promise(() => {}))
    renderPanel()
    // Loading skeletons: 2 animated divs rendered
    const skeletons = document.querySelectorAll('.animate-pulse')
    expect(skeletons.length).toBeGreaterThanOrEqual(1)
  })

  it('shows empty state when no presets', async () => {
    mockListSavedPresets.mockResolvedValue([])
    renderPanel()
    await waitFor(() => {
      expect(screen.getByText('No saved presets for this version.')).toBeTruthy()
    })
  })

  it('renders preset names when data is available', async () => {
    mockListSavedPresets.mockResolvedValue([samplePreset])
    renderPanel()
    await waitFor(() => {
      expect(screen.getByText('My Preset')).toBeTruthy()
    })
  })

  it('Load button calls onApplyPreset with preset values', async () => {
    mockListSavedPresets.mockResolvedValue([samplePreset])
    const onApplyPreset = vi.fn()
    renderPanel({ onApplyPreset })
    await waitFor(() => screen.getByText('My Preset'))
    fireEvent.click(screen.getByRole('button', { name: /Load/i }))
    expect(onApplyPreset).toHaveBeenCalledWith(samplePreset.values)
  })

  it('delete flow: delete button triggers AlertDialog, confirming calls deleteSavedPreset', async () => {
    mockListSavedPresets.mockResolvedValue([samplePreset])
    renderPanel()
    await waitFor(() => screen.getByText('My Preset'))

    // Click the trash/delete button (title="Delete preset")
    fireEvent.click(screen.getByTitle('Delete preset'))

    // AlertDialog should now be visible
    expect(screen.getByText('Delete preset?')).toBeTruthy()

    // Confirm deletion
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }))
    await waitFor(() => {
      expect(mockDeleteSavedPreset).toHaveBeenCalledWith('preset-1')
    })
  })
})
