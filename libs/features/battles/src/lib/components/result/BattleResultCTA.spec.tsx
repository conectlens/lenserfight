import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import React from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@lenserfight/data/repositories', () => ({
  battlesRepository: {
    nextRecommendation: vi.fn(),
  },
}))

import { battlesRepository } from '@lenserfight/data/repositories'

import { BattleResultCTA } from './BattleResultCTA'

const mockNext = battlesRepository.nextRecommendation as unknown as ReturnType<typeof vi.fn>

function renderWithClient(ui: React.ReactElement) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  })
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>)
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('BattleResultCTA', () => {
  it('shows a skeleton while the recommendation is loading', () => {
    mockNext.mockReturnValue(new Promise(() => undefined))
    renderWithClient(<BattleResultCTA battleId="battle-1" />)
    expect(screen.getByTestId('battle-cta-loading')).toBeInTheDocument()
  })

  it('renders rematch CTA when caller was a contender', async () => {
    mockNext.mockResolvedValue({ action: 'rematch', battle_id: 'battle-1', slug: 'slug-1' })
    renderWithClient(<BattleResultCTA battleId="battle-1" />)
    await waitFor(() =>
      expect(screen.getByTestId('battle-cta-rematch')).toBeInTheDocument(),
    )
    expect(screen.getByText('Start a rematch')).toBeInTheDocument()
  })

  it('renders browse CTA when caller voted only', async () => {
    mockNext.mockResolvedValue({ action: 'browse', category: 'reasoning' })
    renderWithClient(<BattleResultCTA battleId="battle-1" />)
    await waitFor(() =>
      expect(screen.getByTestId('battle-cta-browse')).toBeInTheDocument(),
    )
    expect(screen.getByText('Browse similar battles')).toBeInTheDocument()
  })

  it('renders create CTA for anonymous / non-participating caller', async () => {
    mockNext.mockResolvedValue({ action: 'create', template_id: 'tpl-1' })
    renderWithClient(<BattleResultCTA battleId="battle-1" />)
    await waitFor(() =>
      expect(screen.getByTestId('battle-cta-create')).toBeInTheDocument(),
    )
    expect(screen.getByText('Create a battle from this template')).toBeInTheDocument()
  })

  it('fires onTrack and onAction with the resolved recommendation on click', async () => {
    const onTrack = vi.fn()
    const onAction = vi.fn()
    mockNext.mockResolvedValue({ action: 'rematch', battle_id: 'battle-1', slug: 'slug-1' })

    renderWithClient(
      <BattleResultCTA battleId="battle-1" onTrack={onTrack} onAction={onAction} />,
    )

    await waitFor(() =>
      expect(screen.getByTestId('battle-cta-rematch')).toBeInTheDocument(),
    )
    fireEvent.click(screen.getByText('Start a rematch'))

    expect(onTrack).toHaveBeenCalledWith('battle_cta_clicked', {
      action: 'rematch',
      battle_id: 'battle-1',
    })
    expect(onAction).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'rematch', battle_id: 'battle-1' }),
    )
  })

  it('renders nothing when the server returns null', async () => {
    mockNext.mockResolvedValue(null)
    const { container } = renderWithClient(<BattleResultCTA battleId="battle-1" />)
    await waitFor(() => expect(mockNext).toHaveBeenCalled())
    // After the resolve, the skeleton goes away and nothing is rendered.
    await waitFor(() =>
      expect(container.querySelector('[data-testid="battle-cta-loading"]')).toBeNull(),
    )
    expect(container.firstChild).toBeNull()
  })
})
