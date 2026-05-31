import { Badge } from '@lenserfight/ui/components'
import React from 'react'

import { useCountdown } from '../../hooks/utils/useCountdown'

import type { Battle } from '../../types/battle.types'

interface VotingWindowGateProps {
  battle: Pick<Battle, 'status' | 'voting_opens_at' | 'voting_closes_at'>
  children: React.ReactNode
}

/**
 * Gates voting UI strictly to the battle's voting window (UI mirror of the
 * server-side guard in fn_submit_vote / auto-close). Renders children only when
 * status === 'voting' and now is within [voting_opens_at, voting_closes_at].
 * Outside the window it explains why voting is unavailable instead of showing a
 * vote panel that the server would reject.
 */
export function VotingWindowGate({ battle, children }: VotingWindowGateProps) {
  const opensAt = battle.voting_opens_at ? new Date(battle.voting_opens_at).getTime() : null
  const closesAt = battle.voting_closes_at ? new Date(battle.voting_closes_at).getTime() : null

  // Live timers drive a re-render at each boundary so the gate flips at the
  // deadline (and on a scheduled future open) instead of being frozen to the
  // time captured on the render that mounted the panel. useCountdown ticks
  // (and auto-cleans its interval on unmount) only while a deadline is set;
  // a null deadline yields null with no timer.
  const opensCountdown = useCountdown(
    opensAt !== null && (battle.status !== 'voting' || Date.now() < opensAt)
      ? battle.voting_opens_at
      : null,
    'Voting opens in',
  )
  // Subscribe to voting_closes_at so the component re-renders at close.
  const closesCountdown = useCountdown(
    battle.status === 'voting' ? battle.voting_closes_at : null,
    'Voting closes in',
  )

  const now = Date.now()
  const notOpenYet = battle.status !== 'voting' || (opensAt !== null && now < opensAt)
  const windowClosed = closesCountdown?.expired ?? (closesAt !== null && now >= closesAt)

  if (notOpenYet) {
    return (
      <div className="rounded-2xl border border-surface-border bg-surface-raised p-5 text-center space-y-2">
        <Badge color="gray" variant="outline" className="mb-2">Voting not open</Badge>
        <p className="text-sm text-surface-text-muted">
          {opensCountdown && !opensCountdown.expired
            ? `Voting opens in ${opensCountdown.formatted}.`
            : 'Voting has not opened for this battle yet.'}
        </p>
      </div>
    )
  }

  if (windowClosed) {
    return (
      <div className="rounded-2xl border border-surface-border bg-surface-raised p-5 text-center space-y-2">
        <Badge color="gray" variant="outline" className="mb-2">Voting closed</Badge>
        <p className="text-sm text-surface-text-muted">
          The voting window has ended. Results are being finalized.
        </p>
      </div>
    )
  }

  return <>{children}</>
}
