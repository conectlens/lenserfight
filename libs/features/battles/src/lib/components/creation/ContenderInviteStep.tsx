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
  battleType?: BattleType
  hasLenserPolicy?: boolean
}

type FilterType = 'human' | 'ai' | 'all'

function slotFilterType(battleType: BattleType | undefined, slot: 'A' | 'B'): FilterType {
  switch (battleType) {
    case 'ai_vs_ai':
      return 'ai'
    case 'human_vs_human_ai_votes':
    case 'human_vs_human_open_votes':
      return 'human'
    case 'human_vs_ai':
      return slot === 'A' ? 'human' : 'ai'
    default:
      return 'all'
  }
}

function filterHint(filterType: FilterType): string | null {
  if (filterType === 'ai') return 'AI lensers only'
  if (filterType === 'human') return 'Human lensers only'
  return null
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
  const filterA = slotFilterType(battleType, 'A')
  const filterB = slotFilterType(battleType, 'B')

  return (
    <div className="space-y-5">
      {battleType === 'ai_vs_ai' && (
        <div className="rounded-2xl border border-primary-yellow-500/20 bg-primary-yellow-500/5 px-4 py-3 text-sm text-greyscale-700 dark:text-greyscale-300">
          Both contenders must be AI lensers.
        </div>
      )}
      {(battleType === 'human_vs_human_ai_votes' || battleType === 'human_vs_human_open_votes') && (
        <div className="rounded-2xl border border-primary-yellow-500/20 bg-primary-yellow-500/5 px-4 py-3 text-sm text-greyscale-700 dark:text-greyscale-300">
          Both contenders must be human lensers.
        </div>
      )}
      {battleType === 'human_vs_ai' && (
        <div className="rounded-2xl border border-primary-yellow-500/20 bg-primary-yellow-500/5 px-4 py-3 text-sm text-greyscale-700 dark:text-greyscale-300">
          Contender A must be a human lenser; Contender B must be an AI lenser.
        </div>
      )}
      {isLenserBattle && battleType !== 'human_vs_ai' && battleType !== 'ai_vs_ai' && (
        <div className="rounded-2xl border border-primary-yellow-500/20 bg-primary-yellow-500/5 px-4 py-3 text-sm text-greyscale-700 dark:text-greyscale-300">
          You can invite human or AI lensers. AI lensers will use their own memories, instructions, and rules — not a raw model.
        </div>
      )}
      <LenserSearchPicker
        slot="A"
        slotLabel="Contender A"
        value={slotA}
        onChange={onChangeSlotA}
        filterType={filterA}
        filterHint={filterHint(filterA)}
      />
      <LenserSearchPicker
        slot="B"
        slotLabel="Contender B"
        value={slotB}
        onChange={onChangeSlotB}
        filterType={filterB}
        filterHint={filterHint(filterB)}
      />
      {error && (
        <div className="rounded-2xl border border-status-red/20 bg-status-red/5 px-4 py-3 text-sm text-status-red">
          {error}
        </div>
      )}
    </div>
  )
}
