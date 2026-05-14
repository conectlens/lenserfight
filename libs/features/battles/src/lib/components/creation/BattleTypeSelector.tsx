import { Badge, HelpButton } from '@lenserfight/ui/components'
import { motion } from 'framer-motion'
import { Bot, Brain, GitBranch, Lock, Sparkles, Swords, Trophy, Users } from 'lucide-react'
import React from 'react'

import {
  type BattleFormat,
  getDisabledReason,
  getRecommendedBattleType,
  getTypeStepCopy,
  isExperimentalBattleType,
} from './battleCompatibility'
import type { BattleType } from '../../types/battle.types'

interface BattleTypeSelectorProps {
  value: BattleType
  onChange: (type: BattleType) => void
  /** Source-of-truth format selected at Step 1. Drives compatibility + visual hierarchy. */
  battleFormat: BattleFormat | null
  /** Hint to scroll the user back to Step 1 to change the dependency. */
  onChangeFormat?: () => void
}

const TYPES: {
  value: BattleType
  icon: React.ReactNode
  label: string
  description: string
  defaultEligibility: string
  docsPath: string
}[] = [
  {
    value: 'ai_vs_ai',
    icon: <Bot size={20} />,
    label: 'AI vs AI',
    description: 'Two AI models compete on the same prompt. Best for benchmarking and model comparison.',
    defaultEligibility: 'Open voting',
    docsPath: '/how-to/battles/battle-types#ai-vs-ai',
  },
  {
    value: 'human_vs_ai',
    icon: <Swords size={20} />,
    label: 'Human vs AI',
    description: 'Direct face-off between a human lenser and an AI model. Everyone can vote.',
    defaultEligibility: 'Open voting',
    docsPath: '/how-to/battles/battle-types#human-vs-ai',
  },
  {
    value: 'human_vs_human_open_votes',
    icon: <Users size={20} />,
    label: 'Human vs Human',
    description: 'Two human lensers compete. The community votes openly.',
    defaultEligibility: 'Open voting',
    docsPath: '/how-to/battles/battle-types#human-vs-human',
  },
  {
    value: 'human_vs_human_ai_votes',
    icon: <Brain size={20} />,
    label: 'AI Judge',
    description: 'Two humans compete. An AI lenser casts weighted judging votes.',
    defaultEligibility: 'AI judge only',
    docsPath: '/how-to/battles/battle-types#ai-judge',
  },
  {
    value: 'workflow_battle',
    icon: <GitBranch size={20} />,
    label: 'Workflow Battle',
    description: 'Chain your lenses into a multi-step workflow and compete end-to-end.',
    defaultEligibility: 'Open voting',
    docsPath: '/how-to/battles/battle-types#workflow-battle',
  },
  {
    value: 'lenser_battle',
    icon: <Trophy size={20} />,
    label: 'Lenser Battle',
    description: 'Named lensers compete using their own lens, model, and funding setup.',
    defaultEligibility: 'Configurable voting',
    docsPath: '/how-to/battles/battle-types#lenser-battle',
  },
]

const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.06 } },
}

const cardVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.22, ease: [0, 0, 0.2, 1] as [number, number, number, number] } },
}

export function BattleTypeSelector({ value, onChange, battleFormat, onChangeFormat }: BattleTypeSelectorProps) {
  const recommended = getRecommendedBattleType(battleFormat)
  const stepCopy = getTypeStepCopy(battleFormat)

  return (
    <div className="space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <label className="block text-sm font-semibold text-greyscale-900 dark:text-greyscale-0">
            {stepCopy.title}
          </label>
          <p className="mt-0.5 text-xs text-greyscale-500 dark:text-greyscale-400">
            {stepCopy.description}
          </p>
        </div>
        {battleFormat && onChangeFormat && (
          <button
            type="button"
            onClick={onChangeFormat}
            className="text-xs font-semibold text-primary-yellow-600 hover:text-primary-yellow-700 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-yellow-500/50 rounded"
          >
            Change format →
          </button>
        )}
      </div>

      <motion.div
        className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {TYPES.map((t) => {
          const isSelected = value === t.value
          const disabledReason = getDisabledReason(battleFormat, t.value)
          const isDisabled = disabledReason !== null
          const isRecommended = recommended === t.value && !isDisabled
          const isExperimental = isExperimentalBattleType(t.value) && !isRecommended && !isDisabled

          return (
            <motion.button
              key={t.value}
              type="button"
              variants={cardVariants}
              onClick={() => {
                if (isDisabled) return
                onChange(t.value)
              }}
              aria-pressed={isSelected}
              aria-disabled={isDisabled}
              disabled={isDisabled}
              data-testid={`battle-type-card-${t.value}`}
              // Yellow = tier (Recommended). Greyscale dark inverse = state
              // (Selected). The two channels never share a hue, so a
              // recommended-but-unselected card can never be mistaken for the
              // selected one.
              className={`relative rounded-2xl border p-4 text-left transition-colors ${
                isDisabled
                  ? 'cursor-not-allowed border-surface-border bg-surface-base opacity-50'
                  : isSelected
                    ? 'border-greyscale-900 bg-greyscale-900 text-greyscale-0 dark:border-greyscale-0 dark:bg-greyscale-0 dark:text-greyscale-900'
                    : isRecommended
                      ? 'border-primary-yellow-500/40 bg-primary-yellow-500/[0.04] hover:border-greyscale-400 dark:hover:border-greyscale-500'
                      : 'border-surface-border bg-surface-base hover:border-greyscale-300 dark:hover:border-greyscale-600'
              }`}
            >
              {/* Badge row, top-right */}
              <div className="absolute right-3 top-3 flex items-center gap-1.5">
                {isRecommended && (
                  <Badge color="yellow" variant="solid" size="sm">
                    <Sparkles size={10} className="mr-0.5 inline" />
                    Recommended
                  </Badge>
                )}
                {isExperimental && (
                  <Badge color="purple" variant="outline" size="sm">
                    Experimental
                  </Badge>
                )}
                {isDisabled && (
                  <Badge color="gray" variant="outline" size="sm">
                    <Lock size={10} className="mr-0.5 inline" />
                    Unavailable
                  </Badge>
                )}
              </div>

              <div className={`mb-2 flex h-9 w-9 items-center justify-center rounded-xl ${
                isSelected
                  ? 'bg-greyscale-0/15 dark:bg-greyscale-900/15'
                  : isRecommended
                    ? 'bg-primary-yellow-500/15 text-primary-yellow-600'
                    : 'bg-surface-raised'
              }`}>
                {t.icon}
              </div>
              <p className="pr-20 text-sm font-bold">{t.label}</p>
              <p className={`mt-1 pr-2 text-xs leading-5 ${
                isSelected ? 'opacity-80' : 'text-greyscale-500 dark:text-greyscale-400'
              }`}>
                {t.description}
              </p>

              {isDisabled && (
                <p className="mt-2 text-xs font-semibold text-greyscale-500 dark:text-greyscale-400">
                  {disabledReason}.{' '}
                  <span className="font-normal opacity-80">Change Format in Step 1 to enable.</span>
                </p>
              )}

              {!isDisabled && (
                <div className="mt-2 flex items-center justify-between gap-2">
                  <p className={`text-xs font-semibold ${
                    isSelected
                      ? 'opacity-60'
                      : isRecommended
                        ? 'text-primary-yellow-700 dark:text-primary-yellow-400'
                        : 'text-primary-yellow-600'
                  }`}>
                    {t.defaultEligibility}
                  </p>
                  <span onClick={(e) => e.stopPropagation()}>
                    <HelpButton
                      path={t.docsPath}
                      label="Learn more"
                      className={isSelected ? 'opacity-60 hover:opacity-100' : ''}
                    />
                  </span>
                </div>
              )}

              {isDisabled && (
                <span className="sr-only">
                  Disabled — {disabledReason}. Change the battle format in Step 1 to enable this option.
                </span>
              )}
            </motion.button>
          )
        })}
      </motion.div>
    </div>
  )
}
