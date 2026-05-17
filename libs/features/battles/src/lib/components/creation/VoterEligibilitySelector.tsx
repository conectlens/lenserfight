import React from 'react'

import type { BattleType, VoterEligibility } from '../../types/battle.types'
import type { ContenderStructure, JudgingMode } from '@lenserfight/domain/battle-governance'

interface VoterEligibilitySelectorProps {
  /** @deprecated Use contenderStructure + judgingMode instead. */
  battleType?: BattleType
  /** V2: Contender structure for eligibility resolution. */
  contenderStructure?: ContenderStructure
  /** V2: Judging mode — when ai_judge, locks to ai_only. */
  judgingMode?: JudgingMode
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
  lenser_battle: [
    { value: 'open', label: 'Open', description: 'Any authenticated lenser can vote.' },
    { value: 'verified_lenser', label: 'Verified lensers', description: 'Only lensers who completed onboarding.' },
    { value: 'lenser_only', label: 'Lensers only', description: 'Only users with a lenser profile can vote.' },
  ],
}

// V2 eligibility resolution from ContenderStructure + JudgingMode
function resolveEligibilityOptions(
  contenderStructure?: ContenderStructure,
  judgingMode?: JudgingMode,
): { value: VoterEligibility; label: string; description: string }[] {
  // AI judge locks to ai_only
  if (judgingMode === 'ai_judge') {
    return [{ value: 'ai_only', label: 'AI judge only', description: 'Only AI lensers cast weighted votes. Locked for AI judge mode.' }]
  }
  const base = [
    { value: 'open' as const, label: 'Open', description: 'Any authenticated lenser can vote.' },
    { value: 'verified_lenser' as const, label: 'Verified lensers', description: 'Only lensers who completed onboarding.' },
  ]
  // No additional options needed for V2 — lenser_only was format-specific
  return base
}

export function VoterEligibilitySelector({ battleType, contenderStructure, judgingMode, value, onChange }: VoterEligibilitySelectorProps) {
  // V2 path: use contenderStructure + judgingMode when available
  const options = contenderStructure
    ? resolveEligibilityOptions(contenderStructure, judgingMode)
    : battleType
      ? ELIGIBILITY_OPTIONS[battleType]
      : ELIGIBILITY_OPTIONS.ai_vs_ai

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
