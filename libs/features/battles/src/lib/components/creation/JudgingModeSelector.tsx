import { Badge, HelpButton } from '@lenserfight/ui/components'
import {
  type ContenderStructure,
  type JudgingMode,
  JUDGING_MODES,
  JUDGING_MODE_LABEL,
  JUDGING_MODE_DESCRIPTION,
  JUDGING_MODE_DOCS_PATH,
  getJudgingDisabledReason,
  getRecommendedJudging,
  isExperimentalJudgingMode,
} from '@lenserfight/domain/battle-governance'
import { motion } from 'framer-motion'
import { Brain, CheckCircle, Lock, Sparkles, Users, Zap } from 'lucide-react'
import React from 'react'

const ICONS: Record<JudgingMode, React.ReactNode> = {
  community_vote: <Users size={20} />,
  ai_judge: <Brain size={20} />,
  rubric_score: <CheckCircle size={20} />,
  auto_score: <Zap size={20} />,
}

interface JudgingModeSelectorProps {
  value: JudgingMode
  onChange: (mode: JudgingMode) => void
  contenderStructure: ContenderStructure | null
}

const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.06 } },
}

const cardVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.22, ease: [0, 0, 0.2, 1] as [number, number, number, number] } },
}

export function JudgingModeSelector({ value, onChange, contenderStructure }: JudgingModeSelectorProps) {
  const recommended = getRecommendedJudging(contenderStructure)

  return (
    <div className="space-y-3">
      <div>
        <label className="block text-sm font-semibold text-greyscale-900 dark:text-greyscale-0">
          How is the winner decided?
        </label>
        <p className="mt-0.5 text-xs text-greyscale-500 dark:text-greyscale-400">
          Choose how outputs are evaluated and who picks the winner.
        </p>
      </div>

      <motion.div
        className="grid grid-cols-1 gap-3 sm:grid-cols-2"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {JUDGING_MODES.map((mode) => {
          const isSelected = value === mode
          const disabledReason = getJudgingDisabledReason(contenderStructure, mode)
          const isDisabled = disabledReason !== null
          const isRecommended = recommended === mode && !isDisabled
          const isExperimental = isExperimentalJudgingMode(mode) && !isRecommended && !isDisabled

          return (
            <motion.button
              key={mode}
              type="button"
              variants={cardVariants}
              onClick={() => { if (!isDisabled) onChange(mode) }}
              aria-pressed={isSelected}
              aria-disabled={isDisabled}
              disabled={isDisabled}
              data-testid={`judging-card-${mode}`}
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
                {ICONS[mode]}
              </div>
              <p className="pr-20 text-sm font-bold">{JUDGING_MODE_LABEL[mode]}</p>
              <p className={`mt-1 pr-2 text-xs leading-5 ${
                isSelected ? 'opacity-80' : 'text-greyscale-500 dark:text-greyscale-400'
              }`}>
                {JUDGING_MODE_DESCRIPTION[mode]}
              </p>

              {isDisabled && (
                <p className="mt-2 text-xs font-semibold text-greyscale-500 dark:text-greyscale-400">
                  {disabledReason}.
                </p>
              )}

              {!isDisabled && (
                <div className="mt-2 flex justify-end">
                  <span onClick={(e) => e.stopPropagation()}>
                    <HelpButton
                      path={JUDGING_MODE_DOCS_PATH[mode]}
                      label="Learn more"
                      className={isSelected ? 'opacity-60 hover:opacity-100' : ''}
                    />
                  </span>
                </div>
              )}
            </motion.button>
          )
        })}
      </motion.div>
    </div>
  )
}
