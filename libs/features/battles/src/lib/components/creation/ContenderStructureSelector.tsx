import { Badge, HelpButton } from '@lenserfight/ui/components'
import {
  type TaskSource,
  type ContenderStructure,
  CONTENDER_STRUCTURES,
  CONTENDER_STRUCTURE_LABEL,
  CONTENDER_STRUCTURE_DESCRIPTION,
  CONTENDER_STRUCTURE_DOCS_PATH,
  getContenderDisabledReason,
  getRecommendedContender,
  hasHumanContenders as isHumanContender,
  type BattleContentType,
  battleCreationValidator,
} from '@lenserfight/domain/battle-governance'
import { motion } from 'framer-motion'
import { Bot, Lock, Sparkles, Swords, Users } from 'lucide-react'
import React from 'react'

interface ContenderStructureSelectorProps {
  value: ContenderStructure
  onChange: (cs: ContenderStructure) => void
  taskSource: TaskSource | null
  onChangeTaskSource?: () => void
  contentType?: BattleContentType | null
}

const ICONS: Record<ContenderStructure, React.ReactNode> = {
  ai_vs_ai: <Bot size={20} />,
  human_vs_ai: <Swords size={20} />,
  human_vs_human: <Users size={20} />,
}

const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.06 } },
}

const cardVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.22, ease: [0, 0, 0.2, 1] as [number, number, number, number] } },
}

export function ContenderStructureSelector({
  value,
  onChange,
  taskSource,
  onChangeTaskSource,
  contentType,
}: ContenderStructureSelectorProps) {
  const recommended = getRecommendedContender(taskSource)

  return (
    <div className="space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <label className="block text-sm font-semibold text-greyscale-900 dark:text-greyscale-0">
            Who competes?
          </label>
          <p className="mt-0.5 text-xs text-greyscale-500 dark:text-greyscale-400">
            Choose the contender structure for this battle.
          </p>
        </div>
        {taskSource && onChangeTaskSource && (
          <button
            type="button"
            onClick={onChangeTaskSource}
            className="text-xs font-semibold text-primary-yellow-600 hover:text-primary-yellow-700 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-yellow-500/50 rounded"
          >
            Change task source &rarr;
          </button>
        )}
      </div>

      <motion.div
        className="grid grid-cols-1 gap-3 sm:grid-cols-3"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {CONTENDER_STRUCTURES.map((cs) => {
          const isSelected = value === cs
          const disabledReason = getContenderDisabledReason(taskSource, cs)
          const isDisabled = disabledReason !== null
          const isRecommended = recommended === cs && !isDisabled
          const humanWarnings = contentType && isHumanContender(cs)
            ? battleCreationValidator.validateHumanPerformability(
                cs === 'human_vs_human' ? 'human_vs_human_open_votes' : 'human_vs_ai',
                contentType,
              )
            : []
          const humanWarning = humanWarnings.length > 0 ? humanWarnings[0] : null

          return (
            <motion.button
              key={cs}
              type="button"
              variants={cardVariants}
              onClick={() => { if (!isDisabled) onChange(cs) }}
              aria-pressed={isSelected}
              aria-disabled={isDisabled}
              disabled={isDisabled}
              data-testid={`contender-card-${cs}`}
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
                {ICONS[cs]}
              </div>
              <p className="pr-20 text-sm font-bold">{CONTENDER_STRUCTURE_LABEL[cs]}</p>
              <p className={`mt-1 pr-2 text-xs leading-5 ${
                isSelected ? 'opacity-80' : 'text-greyscale-500 dark:text-greyscale-400'
              }`}>
                {CONTENDER_STRUCTURE_DESCRIPTION[cs]}
              </p>

              {isDisabled && (
                <p className="mt-2 text-xs font-semibold text-greyscale-500 dark:text-greyscale-400">
                  {disabledReason}.{' '}
                  <span className="font-normal opacity-80">Change Task Source in Step 1 to enable.</span>
                </p>
              )}

              {!isDisabled && humanWarning && (
                <p className={`mt-2 text-xs font-medium ${
                  humanWarning.severity === 'error'
                    ? 'text-status-red'
                    : 'text-primary-yellow-600 dark:text-primary-yellow-400'
                }`}>
                  {humanWarning.message}
                </p>
              )}

              {!isDisabled && (
                <div className="mt-2 flex justify-end">
                  <span onClick={(e) => e.stopPropagation()}>
                    <HelpButton
                      path={CONTENDER_STRUCTURE_DOCS_PATH[cs]}
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
