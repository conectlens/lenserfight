import { Button } from '@lenserfight/ui/components'
import { useQuery } from '@tanstack/react-query'
import React, { useCallback } from 'react'

import { battlesRepository, type NextRecommendation } from '@lenserfight/data/repositories'

/**
 * Phase BX — Retention CTA shown after a battle closes.
 *
 * Renders a single context-aware action so a user landing on a finished
 * battle has a productive next step instead of a dead-end result screen.
 *
 * The action choice is driven server-side by fn_battles_next_recommendation.
 * The component:
 *
 *  - Shows a skeleton while loading
 *  - Renders nothing if the server returns null (battle not closed / not found)
 *  - Calls the optional `onTrack` callback on click so the host can wire
 *    analytics (e.g. `analytics.track('battle_cta_clicked', { action })`).
 */
export interface BattleResultCTAProps {
  battleId: string
  enabled?: boolean
  onAction?: (rec: NextRecommendation) => void
  onTrack?: (event: 'battle_cta_clicked', payload: { action: NextRecommendation['action']; battle_id: string }) => void
}

const COPY: Record<NextRecommendation['action'], { primary: string; secondary?: string }> = {
  rematch: { primary: 'Start a rematch', secondary: 'You were a contender — challenge again.' },
  browse: { primary: 'Browse similar battles', secondary: 'See more in this category.' },
  create: { primary: 'Create a battle from this template', secondary: 'Stamp a fresh round.' },
}

export function BattleResultCTA({
  battleId,
  enabled = true,
  onAction,
  onTrack,
}: BattleResultCTAProps): React.ReactElement | null {
  const query = useQuery({
    queryKey: ['battle', battleId, 'next-recommendation'] as const,
    queryFn: () => battlesRepository.nextRecommendation(battleId),
    enabled,
    staleTime: 30_000,
  })

  const rec = query.data
  const handleClick = useCallback(() => {
    if (!rec) return
    onTrack?.('battle_cta_clicked', { action: rec.action, battle_id: battleId })
    onAction?.(rec)
  }, [rec, onAction, onTrack, battleId])

  if (!enabled) return null
  if (query.isLoading) {
    return (
      <div
        data-testid="battle-cta-loading"
        className="h-12 w-full animate-pulse rounded-md bg-cl-surface-muted"
      />
    )
  }
  if (!rec) return null

  const copy = COPY[rec.action]

  return (
    <div data-testid={`battle-cta-${rec.action}`} className="flex flex-col gap-2">
      <Button onClick={handleClick} variant="primary">
        {copy.primary}
      </Button>
      {copy.secondary && <p className="text-sm text-cl-text-muted">{copy.secondary}</p>}
    </div>
  )
}
