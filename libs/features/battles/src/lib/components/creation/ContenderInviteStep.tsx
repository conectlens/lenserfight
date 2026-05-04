import React from 'react'

import { LenserSearchPicker } from './LenserSearchPicker'
import type { LenserSearchResult } from './LenserSearchPicker'

export interface ContenderInviteStepProps {
  slotA: LenserSearchResult | null
  slotB: LenserSearchResult | null
  onChangeSlotA: (v: LenserSearchResult | null) => void
  onChangeSlotB: (v: LenserSearchResult | null) => void
  error?: string | null
}

export function ContenderInviteStep({
  slotA,
  slotB,
  onChangeSlotA,
  onChangeSlotB,
  error,
}: ContenderInviteStepProps) {
  return (
    <div className="space-y-5">
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
