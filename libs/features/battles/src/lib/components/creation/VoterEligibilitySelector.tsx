import React from 'react'

import type { BattleType, VoterEligibility } from '../../types/battle.types'

interface VoterEligibilitySelectorProps {
  battleType: BattleType
  value: VoterEligibility
  onChange: (v: VoterEligibility) => void
}

// Allowed voter eligibility options per battle_type
const ELIGIBILITY_OPTIONS: Record<BattleType, { value: VoterEligibility; label: string; description: string }[]> = {
  ai_vs_ai: [
    { value: 'open', label: 'Open', description: 'Any authenticated lenser can vote.' },
    { value: 'verified_lenser', label: 'Verified lensers', description: 'Only lensers who completed onboarding.' },
  ],
  human_vs_human_open_votes: [
    { value: 'open', label: 'Open', description: 'Any authenticated lenser can vote.' },
    { value: 'verified_lenser', label: 'Verified lensers', description: 'Only lensers who completed onboarding.' },
  ],
  human_vs_human_ai_votes: [
    { value: 'ai_only', label: 'AI judge only', description: 'Only AI lensers cast weighted votes. Locked for this type.' },
  ],
  human_vs_ai: [
    { value: 'open', label: 'Open', description: 'Any authenticated lenser can vote.' },
    { value: 'verified_lenser', label: 'Verified lensers', description: 'Only lensers who completed onboarding.' },
  ],
  workflow_battle: [
    { value: 'open', label: 'Open', description: 'Any authenticated lenser can vote.' },
    { value: 'verified_lenser', label: 'Verified lensers', description: 'Only lensers who completed onboarding.' },
  ],
}

export function VoterEligibilitySelector({ battleType, value, onChange }: VoterEligibilitySelectorProps) {
  const options = ELIGIBILITY_OPTIONS[battleType]

  return (
    <div className="space-y-3">
      <label className="block text-sm font-semibold text-greyscale-900 dark:text-greyscale-0">
        Who can vote?
      </label>
      <div className="space-y-2">
        {options.map((opt) => {
          const locked = options.length === 1
          const isSelected = value === opt.value
          return (
            <label
              key={opt.value}
              className={`flex cursor-pointer items-start gap-3 rounded-2xl border p-4 transition-colors ${
                isSelected
                  ? 'border-greyscale-900 bg-greyscale-50 dark:border-greyscale-0 dark:bg-greyscale-900'
                  : 'border-surface-border bg-surface-base hover:border-primary-yellow-500'
              } ${locked ? 'cursor-default opacity-80' : ''}`}
            >
              <input
                type="radio"
                name="voter_eligibility"
                value={opt.value}
                checked={isSelected}
                disabled={locked}
                onChange={() => onChange(opt.value)}
                className="mt-1 accent-greyscale-900 dark:accent-greyscale-0"
              />
              <div>
                <p className="text-sm font-semibold text-greyscale-900 dark:text-greyscale-50">{opt.label}</p>
                <p className="text-xs text-greyscale-500 dark:text-greyscale-400">{opt.description}</p>
              </div>
            </label>
          )
        })}
      </div>
    </div>
  )
}
