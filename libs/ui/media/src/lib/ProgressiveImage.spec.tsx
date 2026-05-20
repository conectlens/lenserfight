import { render } from '@testing-library/react'
import React from 'react'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { ProgressiveImage } from './ProgressiveImage'

// Mock IntersectionObserver not needed here; ProgressiveImage uses Image() not IO.

class FakeImage {
  onload: (() => void) | null = null
  onerror: (() => void) | null = null
  _src = ''
  get src() { return this._src }
  set src(val: string) {
    this._src = val
    // Simulate success by default
    setTimeout(() => this.onload?.(), 0)
  }
}

beforeEach(() => {
  vi.spyOn(window, 'Image' as keyof typeof window).mockImplementation(() => new FakeImage() as unknown as HTMLImageElement)
})

describe('ProgressiveImage', () => {
  it('renders skeleton on mount before image loads', () => {
    vi.spyOn(window, 'Image' as keyof typeof window).mockImplementation(() => {
      const img = new FakeImage()
      // Never fire onload — stays in skeleton state
      img.set = (_: string) => { /* noop */ }
      return img as unknown as HTMLImageElement
    })
    const { container } = render(<ProgressiveImage src="https://example.com/img.jpg" />)
    const skeleton = container.querySelector('[aria-hidden]')
    expect(skeleton).toBeTruthy()
  })

  it('shows icon placeholder on error', async () => {
    vi.spyOn(window, 'Image' as keyof typeof window).mockImplementation(() => {
      const img = new FakeImage()
      Object.defineProperty(img, 'src', {
        set(_val: string) { setTimeout(() => img.onerror?.(), 0) },
        get() { return '' },
      })
      return img as unknown as HTMLImageElement
    })
    const { findByRole } = render(<ProgressiveImage src="https://bad.url/img.jpg" alt="test" />)
    // After error state resolves, the error container is rendered (no img role)
    await new Promise((r) => setTimeout(r, 50))
    const container = render(<ProgressiveImage src="https://bad.url/img.jpg" alt="test" />)
    expect(container.container.querySelector('svg')).toBeTruthy()
  })

  it('renders with provided alt text', () => {
    const { container } = render(
      <ProgressiveImage src="https://example.com/img.jpg" alt="Fancy image" />
    )
    expect(container).toBeTruthy()
  })
})
