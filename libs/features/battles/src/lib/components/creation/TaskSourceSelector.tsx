import { Badge, Button, HelpButton } from '@lenserfight/ui/components'
import {
  type TaskSource,
  TASK_SOURCE_LABEL,
  TASK_SOURCE_DESCRIPTION,
  TASK_SOURCE_HELP_PATH,
  isExperimentalTaskSource,
} from '@lenserfight/domain/battle-governance'
import { GitBranch, Layers, Gamepad2 } from 'lucide-react'
import React from 'react'

interface TaskSourceConfig {
  value: TaskSource
  title: string
  subtitle: string
  Icon: React.ComponentType<{ size?: number; className?: string }>
  tier: 'flagship' | 'standard' | 'experimental'
}

const TASK_SOURCE_CARDS: TaskSourceConfig[] = [
  {
    value: 'workflow',
    title: TASK_SOURCE_LABEL.workflow,
    subtitle: TASK_SOURCE_DESCRIPTION.workflow,
    Icon: GitBranch,
    tier: 'flagship',
  },
  {
    value: 'lens',
    title: TASK_SOURCE_LABEL.lens,
    subtitle: TASK_SOURCE_DESCRIPTION.lens,
    Icon: Layers,
    tier: 'standard',
  },
  {
    value: 'challenge',
    title: TASK_SOURCE_LABEL.challenge,
    subtitle: TASK_SOURCE_DESCRIPTION.challenge,
    Icon: Gamepad2,
    tier: 'experimental',
  },
]

interface TaskSourceSelectorProps {
  value: TaskSource | null
  onChange: (source: TaskSource) => void
}

export function TaskSourceSelector({ value, onChange }: TaskSourceSelectorProps) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      {TASK_SOURCE_CARDS.map((card) => {
        const isSelected = value === card.value
        return (
          <div key={card.value} className="flex flex-col gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => onChange(card.value)}
              aria-pressed={isSelected}
              className={`relative !flex-col !gap-3 !rounded-2xl !border-2 !p-6 text-center w-full !h-auto !font-normal !transition-colors ${
                isSelected
                  ? '!border-greyscale-900 !bg-greyscale-900/[0.04] dark:!border-greyscale-0 dark:!bg-greyscale-0/[0.06] !ring-2 !ring-greyscale-900/10 dark:!ring-greyscale-0/10'
                  : card.tier === 'flagship'
                    ? '!border-primary-yellow-500/30 hover:!border-greyscale-400 dark:hover:!border-greyscale-500 !bg-transparent'
                    : '!border-surface-border hover:!border-greyscale-300 dark:hover:!border-greyscale-600 !bg-transparent'
              }`}
            >
              {card.tier === 'flagship' && (
                <span className="absolute right-3 top-3">
                  <Badge color="yellow" variant="solid" size="sm">
                    Recommended
                  </Badge>
                </span>
              )}
              {card.tier === 'experimental' && (
                <span className="absolute right-3 top-3">
                  <Badge color="purple" variant="outline" size="sm">
                    Experimental
                  </Badge>
                </span>
              )}
              <card.Icon
                size={28}
                className={
                  isSelected
                    ? 'text-greyscale-900 dark:text-greyscale-0'
                    : card.tier === 'flagship'
                      ? 'text-primary-yellow-500'
                      : 'text-greyscale-400'
                }
              />
              <div>
                <p className="font-semibold text-sm text-greyscale-900 dark:text-greyscale-50">
                  {card.title}
                </p>
                <p className="text-xs text-greyscale-400 mt-0.5">
                  {card.subtitle}
                </p>
              </div>
            </Button>
            <div className="flex justify-center">
              <HelpButton path={TASK_SOURCE_HELP_PATH[card.value]} label={`About ${card.title}`} />
            </div>
          </div>
        )
      })}
    </div>
  )
}
