import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import React from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@lenserfight/data/repositories', () => ({
  battlesRepository: {
    uploadSubmissionMedia: vi.fn(),
    submitMediaEntry: vi.fn(),
  },
}))

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}))

import { battlesRepository } from '@lenserfight/data/repositories'
import { MediaUploadPanel } from './MediaUploadPanel'

const mockUpload = battlesRepository.uploadSubmissionMedia as unknown as ReturnType<typeof vi.fn>
const mockSubmit = battlesRepository.submitMediaEntry as unknown as ReturnType<typeof vi.fn>

beforeEach(() => {
  vi.clearAllMocks()
  // jsdom needs a stub for URL.createObjectURL.
  if (!('createObjectURL' in URL)) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(URL as any).createObjectURL = vi.fn(() => 'blob:mock')
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(URL as any).revokeObjectURL = vi.fn()
  } else {
    URL.createObjectURL = vi.fn(() => 'blob:mock')
    URL.revokeObjectURL = vi.fn()
  }
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('MediaUploadPanel', () => {
  it('renders the drop zone with the role and label', () => {
    render(<MediaUploadPanel battleId="b1" contenderId="c1" />)
    expect(screen.getByRole('region', { name: 'Upload media' })).toBeTruthy()
    expect(screen.getByText(/Drag a file here/i)).toBeTruthy()
  })

  it('shows a preview when a valid image file is picked', async () => {
    const { container } = render(<MediaUploadPanel battleId="b1" contenderId="c1" />)
    const file = new File(['x'], 'cat.png', { type: 'image/png' })
    const input = container.querySelector('input[type=file]') as HTMLInputElement
    fireEvent.change(input, { target: { files: [file] } })
    await waitFor(() => expect(screen.queryByText('cat.png')).toBeTruthy())
    expect(container.querySelector('img')).toBeTruthy()
  })

  it('calls upload + submit when Submit is clicked', async () => {
    mockUpload.mockResolvedValueOnce({
      publicUrl: 'https://signed/x.png',
      mimeType: 'image/png',
      outputModality: 'image',
    })
    mockSubmit.mockResolvedValueOnce({ id: 's1', media_url: 'https://signed/x.png' })

    const onSubmitted = vi.fn()
    const { container } = render(
      <MediaUploadPanel battleId="b1" contenderId="c1" onSubmitted={onSubmitted} />
    )

    const file = new File(['x'], 'cat.png', { type: 'image/png' })
    const input = container.querySelector('input[type=file]') as HTMLInputElement
    fireEvent.change(input, { target: { files: [file] } })

    await waitFor(() => screen.getByText('cat.png'))
    fireEvent.click(screen.getByText('Submit'))

    await waitFor(() => expect(mockUpload).toHaveBeenCalledTimes(1))
    expect(mockSubmit).toHaveBeenCalledWith(
      'b1',
      'c1',
      'https://signed/x.png',
      'image/png',
      'image'
    )
    await waitFor(() => expect(onSubmitted).toHaveBeenCalled())
  })
})
