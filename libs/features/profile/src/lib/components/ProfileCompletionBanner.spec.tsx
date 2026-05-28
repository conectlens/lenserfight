import { render, screen } from '@testing-library/react'
import React from 'react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'

import { ProfileCompletionBanner } from './ProfileCompletionBanner'

function renderBanner(props: Parameters<typeof ProfileCompletionBanner>[0]) {
  return render(
    <MemoryRouter>
      <ProfileCompletionBanner {...props} />
    </MemoryRouter>
  )
}

describe('ProfileCompletionBanner', () => {
  it('renders with missing-field chips when score is below 80', () => {
    renderBanner({ score: 40, bio: null, avatarUrl: null, location: null, websiteUrl: null })

    expect(screen.getByText(/complete your profile/i)).toBeDefined()
    expect(screen.getByText(/add a bio/i)).toBeDefined()
    expect(screen.getByText(/upload an avatar/i)).toBeDefined()
  })

  it('renders nothing when score is 80 or above', () => {
    const { container } = renderBanner({
      score: 80,
      bio: 'Hello',
      avatarUrl: 'https://example.com/a.png',
      location: 'Berlin',
      websiteUrl: 'https://example.com',
    })

    expect(container.firstChild).toBeNull()
  })
})
