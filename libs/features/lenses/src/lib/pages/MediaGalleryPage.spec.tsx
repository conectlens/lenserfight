import { render, screen, fireEvent } from '@testing-library/react'
import React from 'react'
import { describe, expect, it, vi } from 'vitest'

import { MediaGalleryPage } from './MediaGalleryPage'

import type { MediaObject } from '@lenserfight/types'

vi.mock('@lenserfight/ui/overlays', () => ({
  Dialog: ({ open, title, children }: { open: boolean; title?: string; children: React.ReactNode }) =>
    open ? React.createElement('div', { role: 'dialog', 'aria-label': title }, children) : null,
}))

const textItem: MediaObject = {
  id: 'media-1',
  workspaceId: 'ws-1',
  ownerLenserId: 'lenser-1',
  bucket: null,
  objectKey: null,
  contentText: 'hello world',
  externalUrl: null,
  mimeType: 'text/plain',
  mediaType: 'text',
  name: 'notes.txt',
  byteSize: 11,
  checksumSha256: null,
  visibility: 'private',
  lifecycleState: 'active',
  metadata: null,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
}

vi.mock('../hooks/useMediaGallery', () => ({
  useMediaGallery: () => ({
    media: [textItem],
    allMedia: [textItem],
    isLoading: false,
    typeFilter: 'all',
    setTypeFilter: vi.fn(),
    searchQuery: '',
    setSearchQuery: vi.fn(),
  }),
}))

vi.mock('../hooks/useMediaActions', () => ({
  useMediaActions: () => ({
    deleteMedia: vi.fn(),
    toggleVisibility: vi.fn(),
    isDeleting: false,
    isUpdatingVisibility: false,
  }),
}))

describe('MediaGalleryPage preview modal', () => {
  it('opens a preview dialog with the media details when a card is clicked', () => {
    render(<MediaGalleryPage />)

    expect(screen.queryByRole('dialog')).toBeNull()

    fireEvent.click(screen.getByText('notes.txt'))

    const dialog = screen.getByRole('dialog', { name: 'notes.txt' })
    expect(dialog).toBeTruthy()
    expect(screen.getByText('hello world')).toBeTruthy()
  })
})
