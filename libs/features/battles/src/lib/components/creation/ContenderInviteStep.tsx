import React from 'react'

import type { BattleType } from '../../types/battle.types'
import { LenserSearchPicker } from './LenserSearchPicker'
import type { LenserSearchResult } from './LenserSearchPicker'

export interface ContenderInviteStepProps {
  slotA: LenserSearchResult | null
  slotB: LenserSearchResult | null
  onChangeSlotA: (v: LenserSearchResult | null) => void
  onChangeSlotB: (v: LenserSearchResult | null) => void
  error?: string | null
  /** @deprecated Use hasLenserPolicy instead. */
  battleType?: BattleType
  /** V2: Whether a Lenser policy is configured for this battle. */
  hasLenserPolicy?: boolean
}

export function ContenderInviteStep({
  slotA,
  slotB,
  onChangeSlotA,
  onChangeSlotB,
  error,
  battleType,
  hasLenserPolicy,
}: ContenderInviteStepProps) {
  const isLenserBattle = hasLenserPolicy || battleType === 'lenser_battle'

  return (
    <div className="space-y-5">
      {isLenserBattle && (
        <div className="rounded-2xl border border-primary-yellow-500/20 bg-primary-yellow-500/5 px-4 py-3 text-sm text-greyscale-700 dark:text-greyscale-300">
          You can invite human or AI lensers. AI lensers will use their own memories, instructions, and rules — not a raw model.
        </div>
      )}
      <LenserSearchPicker
        slot="A"
        slotLabel="Contender A"
        value={slotA}
        onChange={onChangeSlotA}
      />
      <LenserSearchPicker
        slot="B"
        slotLabel="Contender B"
        value={slotB}
        onChange={onChangeSlotB}
      />
      {error && (
        <div className="rounded-2xl border border-status-red/20 bg-status-red/5 px-4 py-3 text-sm text-status-red">
          {error}
        </div>
      )}
    </div>
  )
}
