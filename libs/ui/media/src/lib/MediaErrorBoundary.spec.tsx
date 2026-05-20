import { render } from '@testing-library/react'
import React from 'react'
import { describe, expect, it, vi } from 'vitest'
import { MediaErrorBoundary } from './MediaErrorBoundary'

function Bomb(): React.ReactElement {
  throw new Error('media exploded')
}

describe('MediaErrorBoundary', () => {
  it('catches thrown error and renders fallback', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const { container } = render(
      <MediaErrorBoundary>
        <Bomb />
      </MediaErrorBoundary>
    )
    expect(container.textContent).toContain('Media unavailable')
    consoleSpy.mockRestore()
  })

  it('renders children when no error is thrown', () => {
    const { getByText } = render(
      <MediaErrorBoundary>
        <span>healthy content</span>
      </MediaErrorBoundary>
    )
    expect(getByText('healthy content')).toBeTruthy()
  })
})
