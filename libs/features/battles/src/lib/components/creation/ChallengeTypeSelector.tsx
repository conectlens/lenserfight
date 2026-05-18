import { Badge, HelpButton } from '@lenserfight/ui/components'
import {
  type ContenderStructure,
  type ChallengeTypeDefinition,
  listChallengeTypeDefinitions,
} from '@lenserfight/domain/battle-governance'
import { motion } from 'framer-motion'
import {
  BookOpen,
  Bug,
  Calculator,
  Clock,
  Lock,
  MessageSquare,
  Pencil,
  PenLine,
  Puzzle,
  Sparkles,
  TextCursorInput,
} from 'lucide-react'
import React from 'react'

// Map icon names from the registry to Lucide components
const ICON_MAP: Record<string, React.ReactNode> = {
  PenLine: <PenLine size={18} />,
  Calculator: <Calculator size={18} />,
  BookOpen: <BookOpen size={18} />,
  Pencil: <Pencil size={18} />,
  TextCursorInput: <TextCursorInput size={18} />,
  Bug: <Bug size={18} />,
  Puzzle: <Puzzle size={18} />,
  Sparkles: <Sparkles size={18} />,
  MessageSquare: <MessageSquare size={18} />,
}

const BADGE_COLOR_MAP: Record<string, 'yellow' | 'blue' | 'green' | 'purple' | 'red' | 'gray'> = {
  yellow: 'yellow',
  blue: 'blue',
  green: 'green',
  purple: 'purple',
  red: 'red',
  gray: 'gray',
}

interface ChallengeTypeSelectorProps {
  value: string | null
  onChange: (challengeType: string) => void
  contenderStructure?: ContenderStructure
}

const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.04 } },
}

const cardVariants = {
  hidden: { opacity: 0, y: 8 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.2, ease: [0, 0, 0.2, 1] as [number, number, number, number] } },
}

function formatTime(seconds: number): string {
  if (seconds >= 60) return `${Math.floor(seconds / 60)} min`
  return `${seconds}s`
}

export function ChallengeTypeSelector({ value, onChange, contenderStructure }: ChallengeTypeSelectorProps) {
  const allTypes = listChallengeTypeDefinitions()

  return (
    <div className="space-y-3">
      <div>
        <label className="block text-sm font-semibold text-greyscale-900 dark:text-greyscale-0">
          Choose your challenge
        </label>
        <p className="mt-0.5 text-xs text-greyscale-500 dark:text-greyscale-400">
          Pick a game type. Each has its own rules, time limits, and scoring.
        </p>
      </div>

      <motion.div
        className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {allTypes.map((def) => {
          const isSelected = value === def.id
          const isContenderIncompatible = contenderStructure && !def.allowedContenders.includes(contenderStructure)
          const isDisabled = !def.implemented || !!isContenderIncompatible

          return (
            <motion.button
              key={def.id}
              type="button"
              variants={cardVariants}
              onClick={() => { if (!isDisabled) onChange(def.id) }}
              aria-pressed={isSelected}
              aria-disabled={isDisabled}
              disabled={isDisabled}
              data-testid={`challenge-card-${def.id}`}
              className={`relative rounded-2xl border p-4 text-left transition-colors ${
                isDisabled
                  ? 'cursor-not-allowed border-surface-border bg-surface-base opacity-40'
                  : isSelected
                    ? 'border-greyscale-900 bg-greyscale-900 text-greyscale-0 dark:border-greyscale-0 dark:bg-greyscale-0 dark:text-greyscale-900'
                    : 'border-surface-border bg-surface-base hover:border-greyscale-300 dark:hover:border-greyscale-600'
              }`}
            >
              <div className="absolute right-3 top-3 flex items-center gap-1.5">
                {!def.implemented && (
                  <Badge color="gray" variant="outline" size="sm">
                    <Lock size={10} className="mr-0.5 inline" />
                    Coming soon
                  </Badge>
                )}
                {def.localeDependent && def.implemented && (
                  <Badge color="blue" variant="outline" size="sm">
                    Multi-language
                  </Badge>
                )}
              </div>

              <div className="flex items-center gap-2.5 mb-2">
                <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${
                  isSelected
                    ? 'bg-greyscale-0/15 dark:bg-greyscale-900/15'
                    : `bg-${def.badgeColor === 'yellow' ? 'primary-yellow' : def.badgeColor}-500/10`
                }`}>
                  {ICON_MAP[def.icon] ?? <Puzzle size={18} />}
                </div>
                <p className="text-sm font-bold pr-16">{def.label}</p>
              </div>

              <p className={`text-xs leading-5 ${
                isSelected ? 'opacity-80' : 'text-greyscale-500 dark:text-greyscale-400'
              }`}>
                {def.description}
              </p>

              {def.timeLimitDefault && !isDisabled && (
                <div className={`mt-2 flex items-center gap-1 text-xs ${
                  isSelected ? 'opacity-60' : 'text-greyscale-400'
                }`}>
                  <Clock size={11} />
                  <span>{formatTime(def.timeLimitDefault)}</span>
                </div>
              )}

              {isContenderIncompatible && def.implemented && (
                <p className="mt-2 text-xs text-greyscale-500">
                  Not available for this contender structure.
                </p>
              )}
            </motion.button>
          )
        })}
      </motion.div>
    </div>
  )
}
